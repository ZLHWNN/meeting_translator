export const AUDIO_BUFFER_HIGH_WATER_BYTES = 1024 * 1024;
export const AUDIO_BUFFER_LOW_WATER_BYTES = 256 * 1024;

export type BackpressureAction = "pause-capture" | "resume-capture" | "none";

export class BackpressureGate {
  private paused = false;

  update(bufferedAmountBytes: number): BackpressureAction {
    if (!this.paused && bufferedAmountBytes >= AUDIO_BUFFER_HIGH_WATER_BYTES) {
      this.paused = true;
      return "pause-capture";
    }
    if (this.paused && bufferedAmountBytes <= AUDIO_BUFFER_LOW_WATER_BYTES) {
      this.paused = false;
      return "resume-capture";
    }
    return "none";
  }

  isPaused(): boolean {
    return this.paused;
  }
}
