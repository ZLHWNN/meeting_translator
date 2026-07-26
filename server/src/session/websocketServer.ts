import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import {
  MAX_JSON_FRAME_BYTES,
  PCM_FRAME_BYTES,
  PROTOCOL_SUBPROTOCOL,
  TOKEN_SUBPROTOCOL_PREFIX,
  isClientCommand,
  type ClientCommand,
  type CommandAckEvent,
  type Direction,
  type ServerEvent,
  type SessionReadyEvent,
  type SessionState,
  type TransportState,
} from "../../../shared/protocol/types";
import type { TranscriptionProvider, TranscriptionSession } from "../providers/transcriptionProvider";
import type { TranslationProvider } from "../providers/translationProvider";
import { UtteranceCoordinator } from "./utteranceCoordinator";
import { SessionStore, type SessionRecord } from "./sessionStore";

export interface MeetingProviders {
  transcription: TranscriptionProvider;
  translation: TranslationProvider;
}

function offeredProtocols(request: IncomingMessage): string[] {
  return String(request.headers["sec-websocket-protocol"] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function tokenFrom(protocols: string[]): string | undefined {
  const protocol = protocols.find((value) => value.startsWith(TOKEN_SUBPROTOCOL_PREFIX));
  return protocol?.slice(TOKEN_SUBPROTOCOL_PREFIX.length) || undefined;
}

function originAllowed(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  return origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173";
}

function isLifecycleState(state: TransportState): state is SessionState {
  return state !== "awaiting-hello" && state !== "ready";
}

export class MeetingWebSocketServer {
  readonly server: WebSocketServer;

  constructor(private readonly store: SessionStore, private readonly providers: MeetingProviders) {
    this.server = new WebSocketServer({ noServer: true, maxPayload: MAX_JSON_FRAME_BYTES });
  }

  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    const protocols = offeredProtocols(request);
    const token = tokenFrom(protocols);
    const pathMatch = /^\/v1\/sessions\/([^/]+)\/stream$/.exec(new URL(request.url ?? "/", "http://localhost").pathname);

    if (!pathMatch || !protocols.includes(PROTOCOL_SUBPROTOCOL) || !originAllowed(request)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const record = this.store.get(pathMatch[1]);
    const consumed = record && token === record.token ? this.store.consume(token) : undefined;
    if (!consumed) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    this.server.handleUpgrade(request, socket, head, (client) => this.attach(client, consumed));
  }

  private attach(socket: WebSocket, record: SessionRecord): void {
    let state: TransportState = "awaiting-hello";
    let direction = record.direction;
    let providerSession: TranscriptionSession | undefined;
    let coordinator: UtteranceCoordinator | undefined;
    const pendingAudio: Uint8Array[] = [];
    let pendingAudioBytes = 0;
    let upstreamPaused = false;
    let commitPaused = false;
    const acknowledgements = new Map<string, CommandAckEvent>();

    const ready: SessionReadyEvent = {
      type: "session.ready",
      sessionId: record.id,
      protocolVersion: "1",
      expiresAt: new Date(record.expiresAt).toISOString(),
    };
    socket.send(JSON.stringify(ready));

    const send = (event: ServerEvent): void => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(event));
    };

    const sendState = (): void => {
      if (isLifecycleState(state)) send({ type: "session.state", state });
    };

    const acknowledge = (commandId: string, accepted: boolean, errorCode?: string): void => {
      const previous = acknowledgements.get(commandId);
      if (previous) {
        send(previous);
        return;
      }
      const event: CommandAckEvent = { type: "command.ack", commandId, accepted, state };
      if (errorCode) event.errorCode = errorCode;
      acknowledgements.set(commandId, event);
      send(event);
    };

    const cleanup = async (): Promise<void> => {
      coordinator?.close();
      await providerSession?.close().catch(() => undefined);
      providerSession = undefined;
      coordinator = undefined;
      pendingAudio.length = 0;
      pendingAudioBytes = 0;
      commitPaused = false;
      this.store.remove(record.id);
    };

    const flushAudio = (): void => {
      if (!providerSession || state !== "running" || commitPaused) return;
      const buffered = providerSession.bufferedAmountBytes?.() ?? 0;
      if (!upstreamPaused && buffered >= 1024 * 1024) {
        upstreamPaused = true;
        send({ type: "backpressure", bufferedAmountBytes: buffered, action: "pause-capture" });
      }
      while (pendingAudio.length > 0 && (providerSession.bufferedAmountBytes?.() ?? 0) < 1024 * 1024) {
        const frame = pendingAudio.shift()!;
        pendingAudioBytes -= frame.byteLength;
        providerSession.appendPcm(frame);
      }
      const after = providerSession.bufferedAmountBytes?.() ?? 0;
      if (upstreamPaused && after <= 256 * 1024 && pendingAudio.length === 0) {
        upstreamPaused = false;
        send({ type: "backpressure", bufferedAmountBytes: after, action: "resume-capture" });
      }
    };
    const flushTimer = setInterval(flushAudio, 50);
    flushTimer.unref();

    const stop = async (commandId: string): Promise<void> => {
      state = "stopping";
      acknowledge(commandId, true);
      sendState();
      await cleanup();
      state = "completed";
      sendState();
      send({ type: "session.completed", reason: "stopped" });
      socket.close(1000, "stopped");
    };

    socket.on("message", (data, isBinary) => {
      if (isBinary) {
        const payload = Array.isArray(data) ? Buffer.concat(data) : data instanceof ArrayBuffer ? Buffer.from(data) : data;
        if (state !== "running") {
          send({ type: "error", retryable: false, code: "invalid_state", message: "Audio is accepted only while running." });
          return;
        }
        if (payload.byteLength !== PCM_FRAME_BYTES) {
          socket.close(1009, "invalid pcm frame");
          return;
        }
        if (pendingAudioBytes + payload.byteLength > 2 * 1024 * 1024) {
          send({ type: "error", retryable: true, code: "audio_backpressure_timeout", message: "The provider is not accepting audio quickly enough. Pause and resume the session." });
          return;
        }
        pendingAudio.push(new Uint8Array(payload));
        pendingAudioBytes += payload.byteLength;
        try { flushAudio(); } catch {
          send({ type: "error", retryable: true, code: "audio_forward_failed", message: "Audio could not be forwarded." });
        }
        return;
      }
      const payload = Array.isArray(data) ? Buffer.concat(data) : data instanceof ArrayBuffer ? Buffer.from(data) : data;
      if (payload.byteLength > MAX_JSON_FRAME_BYTES) {
        socket.close(1009, "message too large");
        return;
      }

      let command: unknown;
      try { command = JSON.parse(payload.toString()); }
      catch { send({ type: "error", retryable: false, code: "invalid_json", message: "Message must be valid JSON." }); return; }
      if (!isClientCommand(command)) {
        send({ type: "error", retryable: false, code: "invalid_command", message: "Unsupported client command." });
        return;
      }
      void this.handleCommand(command, {
        getState: () => state,
        setState: (next) => { state = next; },
        getDirection: () => direction,
        setDirection: (next) => { direction = next; },
        getProviderSession: () => providerSession,
        setProviderSession: (next) => { providerSession = next; },
        getCoordinator: () => coordinator,
        setCoordinator: (next) => { coordinator = next; },
        pauseCapture: () => {
          if (commitPaused) return;
          commitPaused = true;
          send({ type: "backpressure", bufferedAmountBytes: providerSession?.bufferedAmountBytes?.() ?? 0, action: "pause-capture" });
        },
        resumeCapture: () => {
          if (!commitPaused) return;
          commitPaused = false;
          flushAudio();
          send({ type: "backpressure", bufferedAmountBytes: providerSession?.bufferedAmountBytes?.() ?? 0, action: "resume-capture" });
        },
        acknowledge,
        send,
        sendState,
        stop,
      });
    });

    socket.on("close", () => { void cleanup(); });
    socket.once("close", () => clearInterval(flushTimer));
    const timer = setTimeout(() => {
      if (socket.readyState === WebSocket.OPEN) {
        send({ type: "error", retryable: false, code: "session_expired", message: "Session expired." });
        send({ type: "session.completed", reason: "expired" });
        socket.close(1000, "expired");
      }
      void cleanup();
    }, Math.max(0, record.expiresAt - Date.now()));
    timer.unref();
    socket.once("close", () => clearTimeout(timer));
  }

  private async handleCommand(
    command: ClientCommand,
    context: {
      getState: () => TransportState;
      setState: (state: TransportState) => void;
      getDirection: () => Direction;
      setDirection: (direction: Direction) => void;
      getProviderSession: () => TranscriptionSession | undefined;
      setProviderSession: (session: TranscriptionSession) => void;
      getCoordinator: () => UtteranceCoordinator | undefined;
      setCoordinator: (coordinator: UtteranceCoordinator) => void;
      pauseCapture: () => void;
      resumeCapture: () => void;
      acknowledge: (commandId: string, accepted: boolean, errorCode?: string) => void;
      send: (event: ServerEvent) => void;
      sendState: () => void;
      stop: (commandId: string) => Promise<void>;
    },
  ): Promise<void> {
    const state = context.getState();
    if (command.type === "hello") {
      if (state !== "awaiting-hello") { context.acknowledge(command.commandId, false, "invalid_state"); return; }
      context.setState("ready");
      context.acknowledge(command.commandId, true);
      return;
    }
    if (state === "awaiting-hello") { context.acknowledge(command.commandId, false, "not_ready"); return; }

    if (command.type === "session.control" && command.action === "start" && state === "ready") {
      context.setState("connecting");
      context.acknowledge(command.commandId, true);
      context.sendState();
      try {
        const sourceLanguage = context.getDirection() === "en-to-zh" ? "en" : "zh";
        const providerSession = await this.providers.transcription.connect({ sourceLanguage });
        context.setProviderSession(providerSession);
        context.setCoordinator(new UtteranceCoordinator(providerSession, this.providers.translation, (event) => context.send(event as ServerEvent)));
        context.setState("running");
        context.sendState();
      } catch (error) {
        context.send({ type: "error", retryable: true, code: "provider_connect_failed", message: error instanceof Error ? error.message : "Provider connection failed." });
        context.setState("completed");
        context.sendState();
      }
      return;
    }

    if (command.type === "session.control" && command.action === "pause" && state === "running") {
      await context.getProviderSession()?.pause();
      context.setState("paused");
      context.acknowledge(command.commandId, true);
      context.sendState();
      return;
    }
    if (command.type === "session.control" && command.action === "resume" && state === "paused") {
      await context.getProviderSession()?.resume();
      context.setState("running");
      context.acknowledge(command.commandId, true);
      context.sendState();
      return;
    }
    if (command.type === "session.control" && command.action === "stop" && ["ready", "connecting", "running", "paused"].includes(state)) {
      await context.stop(command.commandId);
      return;
    }
    if (command.type === "direction.set" && ["ready", "running", "paused"].includes(state)) {
      context.setDirection(command.direction);
      context.acknowledge(command.commandId, true);
      return;
    }
    if (command.type === "utterance.start" && state === "running") {
      try {
        context.getCoordinator()?.start(command.utteranceId, command.direction);
        context.acknowledge(command.commandId, true);
      } catch (error) {
        context.acknowledge(command.commandId, false, error instanceof Error ? error.message : "invalid_utterance");
      }
      return;
    }
    if (command.type === "utterance.commit" && state === "running") {
      context.pauseCapture();
      try {
        await context.getCoordinator()?.commit(command.utteranceId);
        context.acknowledge(command.commandId, true);
      } catch (error) {
        context.acknowledge(command.commandId, false, error instanceof Error ? error.message : "commit_failed");
      } finally {
        context.resumeCapture();
      }
      return;
    }
    if (command.type === "translation.retry" && ["ready", "running", "paused"].includes(state)) {
      context.acknowledge(command.commandId, true);
      context.send({ type: "translation.pending", entryId: command.entryId, targetLanguage: command.targetLanguage });
      try {
        const result = await this.providers.translation.translate(command);
        context.send({ type: "translation.completed", entryId: command.entryId, targetLanguage: result.targetLanguage, text: result.translation });
      } catch (error) {
        context.send({ type: "translation.failed", entryId: command.entryId, retryable: true, code: "translation_failed", message: error instanceof Error ? error.message : "Translation failed." });
      }
      return;
    }
    context.acknowledge(command.commandId, false, "invalid_state");
  }
}
