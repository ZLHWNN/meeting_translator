export interface VadConfig {
  frameDurationMs: number;
  minimumSpeechMs: number;
  silenceCommitMs: number;
  hardSegmentMaximumMs: number;
  speechRmsThreshold: number;
}

export const DEFAULT_VAD_CONFIG: VadConfig = {
  frameDurationMs: 20,
  minimumSpeechMs: 250,
  silenceCommitMs: 650,
  hardSegmentMaximumMs: 8_000,
  speechRmsThreshold: 0.015,
};

export type VadEvent =
  | { type: "utterance.start"; utteranceId: string }
  | { type: "utterance.commit"; utteranceId: string; reason: "silence" | "maximum" };

export class UtteranceVAD {
  private activeId: string | undefined;
  private speechMs = 0;
  private silenceMs = 0;
  private elapsedMs = 0;
  private sequence = 0;

  constructor(private readonly config: VadConfig = DEFAULT_VAD_CONFIG) {}

  process(rms: number): VadEvent[] {
    const events: VadEvent[] = [];
    const speaking = rms >= this.config.speechRmsThreshold;

    if (!this.activeId) {
      if (!speaking) return events;
      this.speechMs += this.config.frameDurationMs;
      if (this.speechMs < this.config.minimumSpeechMs) return events;
      this.sequence += 1;
      this.activeId = `utterance-${this.sequence}`;
      this.elapsedMs = this.speechMs;
      events.push({ type: "utterance.start", utteranceId: this.activeId });
      return events;
    }

    this.elapsedMs += this.config.frameDurationMs;
    if (speaking) this.silenceMs = 0;
    else this.silenceMs += this.config.frameDurationMs;

    if (this.elapsedMs >= this.config.hardSegmentMaximumMs) {
      events.push({ type: "utterance.commit", utteranceId: this.activeId, reason: "maximum" });
      this.reset();
    } else if (this.silenceMs >= this.config.silenceCommitMs) {
      events.push({ type: "utterance.commit", utteranceId: this.activeId, reason: "silence" });
      this.reset();
    }
    return events;
  }

  flush(): VadEvent[] {
    if (!this.activeId) return [];
    const event: VadEvent = { type: "utterance.commit", utteranceId: this.activeId, reason: "silence" };
    this.reset();
    return [event];
  }

  reset(): void {
    this.activeId = undefined;
    this.speechMs = 0;
    this.silenceMs = 0;
    this.elapsedMs = 0;
  }
}
