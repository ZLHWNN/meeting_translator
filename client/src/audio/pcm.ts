import {
  PCM_FRAME_BYTES,
  PCM_FRAME_DURATION_MS,
} from "../protocol/messages";

export { PCM_FRAME_BYTES, PCM_FRAME_DURATION_MS };

export const PCM_SAMPLE_RATE = 24_000;
export const PCM_CHANNELS = 1;
export const PCM_FRAME_SAMPLES = PCM_SAMPLE_RATE * PCM_FRAME_DURATION_MS / 1000;

export function float32ToPcm16(samples: Float32Array): Int16Array {
  const output = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    output[index] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
  }
  return output;
}

export function pcm16Frame(samples: Float32Array): Uint8Array {
  if (samples.length !== PCM_FRAME_SAMPLES) {
    throw new Error(`PCM frame must contain ${PCM_FRAME_SAMPLES} samples`);
  }
  const pcm = float32ToPcm16(samples);
  const bytes = new Uint8Array(pcm.buffer);
  if (bytes.byteLength !== PCM_FRAME_BYTES) throw new Error("PCM frame size mismatch");
  return bytes;
}

export function mixMono(left: Float32Array, right: Float32Array): Float32Array {
  if (left.length !== right.length) throw new Error("Audio channels must have equal frame lengths");
  const output = new Float32Array(left.length);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Math.max(-1, Math.min(1, (left[index] + right[index]) / 2));
  }
  return output;
}

export class PcmFrameNormalizer {
  private pending = new Float32Array(0);

  push(samples: Float32Array): Uint8Array[] {
    const combined = new Float32Array(this.pending.length + samples.length);
    combined.set(this.pending);
    combined.set(samples, this.pending.length);
    const frames: Uint8Array[] = [];
    let offset = 0;
    while (combined.length - offset >= PCM_FRAME_SAMPLES) {
      frames.push(pcm16Frame(combined.slice(offset, offset + PCM_FRAME_SAMPLES)));
      offset += PCM_FRAME_SAMPLES;
    }
    this.pending = combined.slice(offset);
    return frames;
  }

  reset(): void {
    this.pending = new Float32Array(0);
  }
}
