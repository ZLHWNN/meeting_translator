import type { Direction } from "../../../shared/protocol/types";
import type { TranscriptionEvent, TranscriptionSession } from "../providers/transcriptionProvider";
import type { TranslationProvider } from "../providers/translationProvider";

export type CoordinatorEvent =
  | { type: "transcript.interim"; utteranceId: string; providerItemId: string; revision: number; text: string }
  | { type: "transcript.final"; entryId: string; utteranceId: string; providerItemId: string; elapsedMs: number; committedAtMs: number; sourceLanguage: "en" | "zh"; targetLanguage: "en" | "zh"; text: string }
  | { type: "translation.pending"; entryId: string; targetLanguage: "en" | "zh" }
  | { type: "translation.completed"; entryId: string; targetLanguage: "en" | "zh"; text: string }
  | { type: "translation.failed"; entryId: string; retryable: boolean; code: string; message: string };

interface ActiveUtterance {
  id: string;
  direction: Direction;
  commitSequence?: number;
  providerItemId?: string;
  committedAtMs?: number;
  revision: number;
}

const COMMIT_TIMEOUT_MS = 10_000;

interface CommitWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
}

function languages(direction: Direction): { sourceLanguage: "en" | "zh"; targetLanguage: "en" | "zh" } {
  return direction === "en-to-zh"
    ? { sourceLanguage: "en", targetLanguage: "zh" }
    : { sourceLanguage: "zh", targetLanguage: "en" };
}

export class UtteranceCoordinator {
  private readonly active = new Map<string, ActiveUtterance>();
  private readonly providerItems = new Map<string, ActiveUtterance>();
  private readonly finalized: string[] = [];
  private pendingCommit: ActiveUtterance | undefined;
  private pendingCommitWaiter: CommitWaiter | undefined;
  private nextCommitSequence = 0;
  private readonly startedAtMs = Date.now();
  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly transcription: TranscriptionSession,
    private readonly translation: TranslationProvider,
    private readonly emit: (event: CoordinatorEvent) => void,
  ) {
    this.unsubscribe = transcription.onEvent((event) => this.handleTranscriptionEvent(event));
  }

  start(utteranceId: string, direction: Direction): void {
    if (this.active.has(utteranceId)) throw new Error("utterance_already_started");
    this.active.set(utteranceId, { id: utteranceId, direction, revision: 0 });
  }

  appendPcm(frame: Uint8Array): void {
    this.transcription.appendPcm(frame);
  }

  async commit(utteranceId: string, committedAtMs = Date.now()): Promise<void> {
    const utterance = this.active.get(utteranceId);
    if (!utterance) throw new Error("unknown_utterance");
    if (this.pendingCommit) throw new Error("commit_in_flight");
    utterance.commitSequence = ++this.nextCommitSequence;
    utterance.committedAtMs = committedAtMs;
    this.pendingCommit = utterance;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    let waiter!: CommitWaiter;
    const committed = new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => {
        if (this.pendingCommit === utterance) this.pendingCommit = undefined;
        waiter.reject(new Error("commit_timeout"));
      }, COMMIT_TIMEOUT_MS);
      timeout.unref?.();
      waiter = {
        resolve: () => {
          if (settled) return;
          settled = true;
          if (timeout) clearTimeout(timeout);
          resolve();
        },
        reject: (error) => {
          if (settled) return;
          settled = true;
          if (timeout) clearTimeout(timeout);
          reject(error);
        },
      };
      this.pendingCommitWaiter = waiter;
    });
    try {
      await this.transcription.commit({ utteranceId, commitSequence: utterance.commitSequence });
      await committed;
    } catch (error) {
      if (this.pendingCommit === utterance) this.pendingCommit = undefined;
      if (this.pendingCommitWaiter === waiter) {
        this.pendingCommitWaiter = undefined;
        waiter.reject(error instanceof Error ? error : new Error("commit_failed"));
      }
      throw error;
    }
  }

  close(): void {
    this.pendingCommitWaiter?.reject(new Error("coordinator_closed"));
    this.pendingCommitWaiter = undefined;
    this.pendingCommit = undefined;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private handleTranscriptionEvent(event: TranscriptionEvent): void {
    if (event.type === "committed") {
      if (!this.pendingCommit) return;
      const utterance = this.pendingCommit;
      utterance.providerItemId = event.providerItemId;
      this.providerItems.set(event.providerItemId, utterance);
      this.pendingCommit = undefined;
      const waiter = this.pendingCommitWaiter;
      this.pendingCommitWaiter = undefined;
      waiter?.resolve();
      return;
    }

    if (event.type === "error") {
      const waiter = this.pendingCommitWaiter;
      this.pendingCommit = undefined;
      this.pendingCommitWaiter = undefined;
      waiter?.reject(new Error(event.code));
      this.emit({ type: "translation.failed", entryId: "session", retryable: event.retryable, code: event.code, message: event.message });
      return;
    }

    const utterance = this.providerItems.get(event.providerItemId);
    if (!utterance) return;
    if (event.type === "interim") {
      utterance.revision += 1;
      this.emit({ type: "transcript.interim", utteranceId: utterance.id, providerItemId: event.providerItemId, revision: utterance.revision, text: event.text });
      return;
    }

    void this.finalize(utterance, event.providerItemId, event.text);
  }

  private async finalize(utterance: ActiveUtterance, providerItemId: string, sourceText: string): Promise<void> {
    const { sourceLanguage, targetLanguage } = languages(utterance.direction);
    const entryId = utterance.id;
    const context = this.finalized.slice(-3);
    this.finalized.push(sourceText);
    this.active.delete(utterance.id);
    this.providerItems.delete(providerItemId);
    this.emit({
      type: "transcript.final",
      entryId,
      utteranceId: utterance.id,
      providerItemId,
      elapsedMs: Math.max(0, (utterance.committedAtMs ?? Date.now()) - this.startedAtMs),
      committedAtMs: utterance.committedAtMs ?? Date.now(),
      sourceLanguage,
      targetLanguage,
      text: sourceText,
    });
    this.emit({ type: "translation.pending", entryId, targetLanguage });
    try {
      const result = await this.translation.translate({ sourceText, sourceLanguage, targetLanguage, context });
      this.emit({ type: "translation.completed", entryId, targetLanguage: result.targetLanguage, text: result.translation });
    } catch (error) {
      this.emit({ type: "translation.failed", entryId, retryable: true, code: "translation_failed", message: error instanceof Error ? error.message : "Translation failed." });
    }
  }
}
