import assert from "node:assert/strict";
import test from "node:test";
import { EchoTranslationProvider, MockTranscriptionProvider } from "../providers/mockProviders";
import { UtteranceCoordinator, type CoordinatorEvent } from "./utteranceCoordinator";

test("coordinator binds provider item IDs and translates finalized text", async () => {
  const transcription = new MockTranscriptionProvider();
  const translation = new EchoTranslationProvider();
  const events: CoordinatorEvent[] = [];
  const session = await transcription.connect({ sourceLanguage: "en" });
  const coordinator = new UtteranceCoordinator(session, translation, (event) => events.push(event));

  coordinator.start("u-1", "en-to-zh");
  await coordinator.commit("u-1", Date.now());
  assert.deepEqual(session.commits, [{ utteranceId: "u-1", commitSequence: 1 }]);

  session.emit({ type: "interim", providerItemId: "mock-item-1", text: "hello" });
  session.emit({ type: "completed", providerItemId: "mock-item-1", text: "Hello team." });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(events.find((event) => event.type === "transcript.interim")?.utteranceId, "u-1");
  assert.equal(events.find((event) => event.type === "transcript.final")?.text, "Hello team.");
  assert.equal(events.find((event) => event.type === "translation.completed")?.text, "[zh] Hello team.");
  assert.equal(translation.requests[0]?.targetLanguage, "zh");
  coordinator.close();
});

test("coordinator snapshots direction at utterance start", async () => {
  const transcription = new MockTranscriptionProvider();
  const translation = new EchoTranslationProvider();
  const events: CoordinatorEvent[] = [];
  const session = await transcription.connect({ sourceLanguage: "zh" });
  const coordinator = new UtteranceCoordinator(session, translation, (event) => events.push(event));

  coordinator.start("u-zh", "zh-to-en");
  await coordinator.commit("u-zh");
  session.emit({ type: "completed", providerItemId: "mock-item-1", text: "你好。" });
  await new Promise((resolve) => setImmediate(resolve));

  const final = events.find((event) => event.type === "transcript.final");
  assert.equal(final?.sourceLanguage, "zh");
  assert.equal(final?.targetLanguage, "en");
});

test("coordinator permits the next commit after provider acknowledgement", async () => {
  const transcription = new MockTranscriptionProvider();
  const translation = new EchoTranslationProvider();
  const session = await transcription.connect({ sourceLanguage: "en" });
  const coordinator = new UtteranceCoordinator(session, translation, () => undefined);

  coordinator.start("u-1", "en-to-zh");
  await coordinator.commit("u-1");
  coordinator.start("u-2", "en-to-zh");
  await coordinator.commit("u-2");

  assert.deepEqual(session.commits, [
    { utteranceId: "u-1", commitSequence: 1 },
    { utteranceId: "u-2", commitSequence: 2 },
  ]);
  coordinator.close();
});
