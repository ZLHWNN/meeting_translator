import assert from "node:assert/strict";
import test from "node:test";
import { PcmFrameNormalizer, PCM_FRAME_BYTES, PCM_FRAME_SAMPLES } from "./pcm";

test("PCM normalizer emits exact 20 ms frames and retains only a partial frame", () => {
  const normalizer = new PcmFrameNormalizer();
  const first = normalizer.push(new Float32Array(PCM_FRAME_SAMPLES + 10));
  assert.equal(first.length, 1);
  assert.equal(first[0]?.byteLength, PCM_FRAME_BYTES);
  const second = normalizer.push(new Float32Array(PCM_FRAME_SAMPLES - 10));
  assert.equal(second.length, 1);
  assert.equal(second[0]?.byteLength, PCM_FRAME_BYTES);
});

test("PCM conversion clamps samples to signed 16-bit range", () => {
  const normalizer = new PcmFrameNormalizer();
  const samples = new Float32Array(PCM_FRAME_SAMPLES).fill(2);
  const [frame] = normalizer.push(samples);
  assert.equal(frame?.byteLength, PCM_FRAME_BYTES);
  assert.equal(new DataView(frame!.buffer).getInt16(0, true), 32767);
});
