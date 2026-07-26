import assert from "node:assert/strict";
import test from "node:test";
import { UtteranceVAD } from "./utteranceVAD";

test("VAD starts after minimum speech and commits after silence", () => {
  const vad = new UtteranceVAD();
  const starts = Array.from({ length: 13 }, () => vad.process(0.1)).flat();
  assert.deepEqual(starts, [{ type: "utterance.start", utteranceId: "utterance-1" }]);

  const commits = Array.from({ length: 33 }, () => vad.process(0)).flat();
  assert.deepEqual(commits, [{ type: "utterance.commit", utteranceId: "utterance-1", reason: "silence" }]);
});

test("VAD flushes an active segment", () => {
  const vad = new UtteranceVAD();
  Array.from({ length: 13 }, () => vad.process(0.1));
  assert.deepEqual(vad.flush(), [{ type: "utterance.commit", utteranceId: "utterance-1", reason: "silence" }]);
  assert.deepEqual(vad.flush(), []);
});
