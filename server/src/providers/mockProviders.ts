import type { TranscriptionEvent, TranscriptionSession, TranscriptionProvider } from "./transcriptionProvider";
import type { TranslationInput, TranslationProvider, TranslationResult } from "./translationProvider";

export class MockTranscriptionSession implements TranscriptionSession {
  readonly appendedFrames: Uint8Array[] = [];
  readonly commits: Array<{ utteranceId: string; commitSequence: number }> = [];
  private readonly listeners = new Set<(event: TranscriptionEvent) => void>();

  appendPcm(frame: Uint8Array): void { this.appendedFrames.push(frame); }

  async commit(input: { utteranceId: string; commitSequence: number }): Promise<void> {
    this.commits.push(input);
    queueMicrotask(() => this.emit({ type: "committed", providerItemId: `mock-item-${input.commitSequence}` }));
  }

  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async close(): Promise<void> {}

  onEvent(listener: (event: TranscriptionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: TranscriptionEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

export class MockTranscriptionProvider implements TranscriptionProvider {
  lastSession: MockTranscriptionSession | undefined;
  async connect(_input: { sourceLanguage: "en" | "zh" }): Promise<MockTranscriptionSession> {
    this.lastSession = new MockTranscriptionSession();
    return this.lastSession;
  }
}

export class EchoTranslationProvider implements TranslationProvider {
  readonly requests: TranslationInput[] = [];

  async translate(input: TranslationInput): Promise<TranslationResult> {
    this.requests.push(input);
    return {
      translation: `[${input.targetLanguage}] ${input.sourceText}`,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
    };
  }
}
