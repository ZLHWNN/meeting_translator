import assert from "node:assert/strict";
import test from "node:test";
import { AUDIO_BUFFER_HIGH_WATER_BYTES, AUDIO_BUFFER_LOW_WATER_BYTES, BackpressureGate } from "./backpressure";

test("backpressure pauses at high water and resumes at low water", () => {
  const gate = new BackpressureGate();
  assert.equal(gate.update(AUDIO_BUFFER_HIGH_WATER_BYTES), "pause-capture");
  assert.equal(gate.update(AUDIO_BUFFER_HIGH_WATER_BYTES - 1), "none");
  assert.equal(gate.update(AUDIO_BUFFER_LOW_WATER_BYTES), "resume-capture");
  assert.equal(gate.isPaused(), false);
});
