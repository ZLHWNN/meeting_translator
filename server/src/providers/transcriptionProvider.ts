export type TranscriptionEvent =
  | { type: "committed"; providerItemId: string }
  | { type: "interim"; providerItemId: string; text: string }
  | { type: "completed"; providerItemId: string; text: string }
  | { type: "error"; retryable: boolean; code: string; message: string };

export interface TranscriptionSession {
  appendPcm(frame: Uint8Array): void;
  bufferedAmountBytes?(): number;
  commit(input: { utteranceId: string; commitSequence: number }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
  onEvent(listener: (event: TranscriptionEvent) => void): () => void;
}

export interface TranscriptionProvider {
  connect(input: { sourceLanguage: "en" | "zh" }): Promise<TranscriptionSession>;
}
