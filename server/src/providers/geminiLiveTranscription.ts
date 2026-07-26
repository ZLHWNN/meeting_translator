import WebSocket from "ws";
import type { TranscriptionEvent, TranscriptionProvider, TranscriptionSession } from "./transcriptionProvider";

export const DEFAULT_GEMINI_LIVE_MODEL = "gemini-3.1-flash-live-preview";
const GEMINI_LIVE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
const READY_TIMEOUT_MS = 10_000;

interface GeminiSocket {
  readonly readyState: number;
  readonly bufferedAmount?: number;
  on(event: "open" | "message" | "error" | "close", listener: (...args: any[]) => void): this;
  send(payload: string): void;
  close(): void;
}

export type GeminiSocketFactory = (url: string) => GeminiSocket;

function parseMessage(data: unknown): Record<string, unknown> | undefined {
  try {
    const text = typeof data === "string" ? data : Buffer.from(data as Buffer).toString("utf8");
    const value = JSON.parse(text) as unknown;
    return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function appendTranscript(current: string, next: string): string {
  if (!next) return current;
  if (!current || next.startsWith(current)) return next;
  return `${current}${next}`;
}

function resample24kTo16k(frame: Uint8Array): Uint8Array {
  const sampleCount = Math.floor(frame.byteLength / 2);
  const input = new Int16Array(frame.buffer, frame.byteOffset, sampleCount);
  const outputCount = Math.max(1, Math.floor(sampleCount * 16_000 / 24_000));
  const output = new Int16Array(outputCount);
  for (let index = 0; index < output.length; index += 1) {
    const position = index * 24_000 / 16_000;
    const low = Math.floor(position);
    const high = Math.min(low + 1, input.length - 1);
    const weight = position - low;
    output[index] = Math.round(input[low] * (1 - weight) + input[high] * weight);
  }
  return new Uint8Array(output.buffer);
}

export interface GeminiLiveTranscriptionOptions {
  apiKey: string;
  model?: string;
  socketFactory?: GeminiSocketFactory;
}

export class GeminiLiveTranscriptionProvider implements TranscriptionProvider {
  constructor(private readonly options: GeminiLiveTranscriptionOptions) {
    if (!options.apiKey) throw new Error("GEMINI_API_KEY is required");
  }

  async connect(input: { sourceLanguage: "en" | "zh" }): Promise<TranscriptionSession> {
    const factory = this.options.socketFactory ?? ((url) => new WebSocket(url));
    const url = `${GEMINI_LIVE_URL}?key=${encodeURIComponent(this.options.apiKey)}`;
    const session = new GeminiLiveTranscriptionSession(factory(url), input.sourceLanguage, this.options.model ?? DEFAULT_GEMINI_LIVE_MODEL);
    await session.ready();
    return session;
  }
}

export class GeminiLiveTranscriptionSession implements TranscriptionSession {
  private readonly listeners = new Set<(event: TranscriptionEvent) => void>();
  private readonly readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private readySettled = false;
  private nextItem = 0;
  private currentItemId: string | undefined;
  private transcript = "";
  private turnCompleteBeforeCommit = false;
  private turnCompletePending = false;

  constructor(
    private readonly socket: GeminiSocket,
    private readonly sourceLanguage: "en" | "zh",
    private readonly model: string = DEFAULT_GEMINI_LIVE_MODEL,
  ) {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    socket.on("open", () => this.sendSetup());
    socket.on("message", (data) => this.handleMessage(data));
    socket.on("error", (error) => {
      const failure = error instanceof Error ? error : new Error("Gemini Live socket error");
      this.failReady(failure);
      this.emit({ type: "error", retryable: true, code: "gemini_socket_error", message: failure.message });
    });
    socket.on("close", (code, reason) => {
      const closeCode = typeof code === "number" ? `code ${code}` : "unknown code";
      const closeReason = reason ? Buffer.from(reason as Buffer).toString("utf8") : "";
      const detail = closeReason ? `${closeCode}: ${closeReason}` : closeCode;
      this.failReady(new Error(`Gemini Live socket closed before session setup completed (${detail})`));
    });
  }

  ready(): Promise<void> {
    const timeout = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("gemini_session_timeout")), READY_TIMEOUT_MS);
      timer.unref();
    });
    return Promise.race([this.readyPromise, timeout]);
  }

  appendPcm(frame: Uint8Array): void {
    this.send({
      realtimeInput: {
        audio: {
          data: Buffer.from(resample24kTo16k(frame)).toString("base64"),
          mimeType: "audio/pcm;rate=16000",
        },
      },
    });
  }

  bufferedAmountBytes(): number {
    return typeof this.socket.bufferedAmount === "number" ? this.socket.bufferedAmount : 0;
  }

  async commit(_input: { utteranceId: string; commitSequence: number }): Promise<void> {
    this.send({ realtimeInput: { audioStreamEnd: true } });
    this.currentItemId = `gemini-item-${++this.nextItem}`;
    this.emit({ type: "committed", providerItemId: this.currentItemId });
    if (this.transcript) this.emit({ type: "interim", providerItemId: this.currentItemId, text: this.transcript });
    if (this.turnCompleteBeforeCommit) {
      if (this.transcript) this.finishCurrentItem();
      else this.turnCompletePending = true;
    }
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

  private sendSetup(): void {
    this.send({
      setup: {
        model: `models/${this.model}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
        },
        inputAudioTranscription: {},
        systemInstruction: {
          parts: [{ text: `Transcribe spoken ${this.sourceLanguage === "en" ? "English" : "Simplified Chinese"} accurately. Do not summarize or answer.` }],
        },
      },
    });
  }

  private send(event: Record<string, unknown>): void {
    if (this.socket.readyState !== WebSocket.OPEN) throw new Error("gemini_socket_not_open");
    this.socket.send(JSON.stringify(event));
  }

  private handleMessage(data: unknown): void {
    const event = parseMessage(data);
    if (!event) return;
    if (event.setupComplete) {
      this.readySettled = true;
      this.resolveReady();
      return;
    }
    if (event.error && typeof event.error === "object") {
      const error = event.error as Record<string, unknown>;
      const message = typeof error.message === "string" ? error.message : "Gemini Live returned an error.";
      this.failReady(new Error(message));
      this.emit({ type: "error", retryable: true, code: "gemini_provider_error", message });
      return;
    }
    const content = event.serverContent && typeof event.serverContent === "object"
      ? event.serverContent as Record<string, unknown>
      : undefined;
    const inputTranscription = content?.inputTranscription && typeof content.inputTranscription === "object"
      ? content.inputTranscription as Record<string, unknown>
      : undefined;
    if (inputTranscription && typeof inputTranscription.text === "string") {
      this.transcript = appendTranscript(this.transcript, inputTranscription.text);
      if (this.currentItemId) {
        this.emit({ type: "interim", providerItemId: this.currentItemId, text: this.transcript });
        if (this.turnCompletePending) this.finishCurrentItem();
      }
    }
    if (content?.turnComplete === true) {
      if (this.currentItemId && this.transcript) this.finishCurrentItem();
      else if (this.currentItemId) this.turnCompletePending = true;
      else this.turnCompleteBeforeCommit = true;
    }
  }

  private finishCurrentItem(): void {
    if (!this.currentItemId) return;
    if (this.transcript) this.emit({ type: "completed", providerItemId: this.currentItemId, text: this.transcript });
    this.currentItemId = undefined;
    this.transcript = "";
    this.turnCompleteBeforeCommit = false;
    this.turnCompletePending = false;
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
