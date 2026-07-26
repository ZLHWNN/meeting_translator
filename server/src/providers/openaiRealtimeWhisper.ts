import WebSocket from "ws";
import type { TranscriptionEvent, TranscriptionProvider, TranscriptionSession } from "./transcriptionProvider";

export const DEFAULT_REALTIME_URL = "wss://api.openai.com/v1/realtime?model=gpt-realtime-2.1";
const READY_TIMEOUT_MS = 10_000;

export interface RealtimeSocket {
  readonly readyState: number;
  readonly bufferedAmount?: number;
  on(event: "open" | "message" | "error" | "close", listener: (...args: any[]) => void): this;
  send(payload: string): void;
  close(): void;
}

export type SocketFactory = (url: string, options: { headers: Record<string, string> }) => RealtimeSocket;

function parseMessage(data: unknown): Record<string, unknown> | undefined {
  try {
    const text = typeof data === "string" ? data : Buffer.from(data as Buffer).toString("utf8");
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

export interface OpenAIRealtimeWhisperOptions {
  apiKey: string;
  url?: string;
  delay?: "minimal" | "low" | "medium" | "high" | "xhigh";
  socketFactory?: SocketFactory;
}

export class OpenAIRealtimeWhisperProvider implements TranscriptionProvider {
  constructor(private readonly options: OpenAIRealtimeWhisperOptions) {
    if (!options.apiKey) throw new Error("OPENAI_API_KEY is required");
  }

  async connect(input: { sourceLanguage: "en" | "zh" }): Promise<TranscriptionSession> {
    const factory = this.options.socketFactory ?? ((url, options) => new WebSocket(url, options));
    const socket = factory(this.options.url ?? DEFAULT_REALTIME_URL, {
      headers: { Authorization: `Bearer ${this.options.apiKey}` },
    });
    const session = new OpenAIRealtimeWhisperSession(socket, input.sourceLanguage, this.options.delay);
    await session.ready();
    return session;
  }
}

export class OpenAIRealtimeWhisperSession implements TranscriptionSession {
  private readonly listeners = new Set<(event: TranscriptionEvent) => void>();
  private readonly partials = new Map<string, string>();
  private readonly readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private readySettled = false;

  constructor(
    private readonly socket: RealtimeSocket,
    private readonly sourceLanguage: "en" | "zh",
    private readonly delay: OpenAIRealtimeWhisperOptions["delay"] = "low",
  ) {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    socket.on("open", () => this.sendSessionUpdate());
    socket.on("message", (data) => this.handleMessage(data));
    socket.on("error", (error) => {
      const failure = error instanceof Error ? error : new Error("OpenAI Realtime socket error");
      this.failReady(failure);
      this.emit({ type: "error", retryable: true, code: "provider_socket_error", message: failure.message });
    });
    socket.on("close", () => this.failReady(new Error("OpenAI Realtime socket closed before session setup completed")));
  }

  ready(): Promise<void> {
    const timeout = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("provider_session_timeout")), READY_TIMEOUT_MS);
      timer.unref();
    });
    return Promise.race([this.readyPromise, timeout]);
  }

  appendPcm(frame: Uint8Array): void {
    this.send({ type: "input_audio_buffer.append", audio: Buffer.from(frame).toString("base64") });
  }

  bufferedAmountBytes(): number {
    return typeof this.socket.bufferedAmount === "number"
      ? this.socket.bufferedAmount
      : 0;
  }

  async commit(_input: { utteranceId: string; commitSequence: number }): Promise<void> {
    this.send({ type: "input_audio_buffer.commit" });
  }

  async pause(): Promise<void> {}
  async resume(): Promise<void> {}

  async close(): Promise<void> {
    this.socket.close();
  }

  onEvent(listener: (event: TranscriptionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private sendSessionUpdate(): void {
    this.send({
      type: "session.update",
      session: {
        type: "transcription",
        audio: {
          input: {
            format: { type: "audio/pcm", rate: 24_000 },
            transcription: { model: "gpt-realtime-whisper", language: this.sourceLanguage, delay: this.delay },
            turn_detection: null,
          },
        },
      },
    });
  }

  private send(event: Record<string, unknown>): void {
    if (this.socket.readyState !== WebSocket.OPEN) throw new Error("provider_socket_not_open");
    this.socket.send(JSON.stringify(event));
  }

  private handleMessage(data: unknown): void {
    const event = parseMessage(data);
    if (!event) return;
    if (event.type === "session.updated") {
      this.readySettled = true;
      this.resolveReady();
      return;
    }
    if (event.type === "input_audio_buffer.committed" && typeof event.item_id === "string") {
      this.emit({ type: "committed", providerItemId: event.item_id });
      return;
    }
    if (event.type === "conversation.item.input_audio_transcription.delta" && typeof event.item_id === "string" && typeof event.delta === "string") {
      const text = `${this.partials.get(event.item_id) ?? ""}${event.delta}`;
      this.partials.set(event.item_id, text);
      this.emit({ type: "interim", providerItemId: event.item_id, text });
      return;
    }
    if (event.type === "conversation.item.input_audio_transcription.completed" && typeof event.item_id === "string" && typeof event.transcript === "string") {
      this.partials.delete(event.item_id);
      this.emit({ type: "completed", providerItemId: event.item_id, text: event.transcript });
      return;
    }
    if (event.type === "error") {
      const error = event.error && typeof event.error === "object" ? event.error as Record<string, unknown> : {};
      this.failReady(new Error(typeof error.message === "string" ? error.message : "provider_error"));
      this.emit({ type: "error", retryable: true, code: typeof error.code === "string" ? error.code : "provider_error", message: typeof error.message === "string" ? error.message : "OpenAI Realtime returned an error." });
    }
  }

  private failReady(error: Error): void {
    if (this.readySettled) return;
    this.readySettled = true;
    this.rejectReady(error);
  }

  private emit(event: TranscriptionEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
