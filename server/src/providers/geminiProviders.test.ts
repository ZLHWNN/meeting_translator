import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { GeminiLiveTranscriptionProvider, GeminiLiveTranscriptionSession } from "./geminiLiveTranscription";
import { GeminiTextTranslationProvider } from "./geminiTranslationProvider";

class FakeGeminiSocket extends EventEmitter {
  readyState = 1;
  bufferedAmount = 0;
  sent: Record<string, unknown>[] = [];
  send(payload: string): void { this.sent.push(JSON.parse(payload) as Record<string, unknown>); }
  close(): void { this.readyState = 3; }
}

test("Gemini Live adapter configures audio transcription and maps transcript events", async () => {
  const socket = new FakeGeminiSocket();
  const provider = new GeminiLiveTranscriptionProvider({
    apiKey: "test-key",
    socketFactory: () => {
      setImmediate(() => socket.emit("open"));
      return socket;
    },
  });
  const connecting = provider.connect({ sourceLanguage: "en" });
  await new Promise((resolve) => setImmediate(resolve));
  socket.emit("message", JSON.stringify({ setupComplete: {} }));
  const session = await connecting;
  const events: unknown[] = [];
  session.onEvent((event) => events.push(event));
  session.appendPcm(new Uint8Array(960));
  await session.commit({ utteranceId: "u-1", commitSequence: 1 });
  socket.emit("message", JSON.stringify({ serverContent: { inputTranscription: { text: "Hello" } } }));
  socket.emit("message", JSON.stringify({ serverContent: { inputTranscription: { text: " team." }, turnComplete: true } }));

  assert.deepEqual(socket.sent[0], {
    setup: {
      model: "models/gemini-3.1-flash-live-preview",
      generationConfig: { responseModalities: ["AUDIO"] },
      inputAudioTranscription: {},
      systemInstruction: { parts: [{ text: "Transcribe spoken English accurately. Do not summarize or answer." }] },
    },
  });
  assert.equal(socket.sent[1]?.realtimeInput && (socket.sent[1].realtimeInput as Record<string, unknown>).audio !== undefined, true);
  assert.deepEqual(events, [
    { type: "committed", providerItemId: "gemini-item-1" },
    { type: "interim", providerItemId: "gemini-item-1", text: "Hello" },
    { type: "interim", providerItemId: "gemini-item-1", text: "Hello team." },
    { type: "completed", providerItemId: "gemini-item-1", text: "Hello team." },
  ]);
});

test("Gemini text adapter validates structured translation output", async () => {
  const provider = new GeminiTextTranslationProvider({
    apiKey: "test-key",
    fetcher: async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ translation: "你好，团队。", sourceLanguage: "en", targetLanguage: "zh" }) }] } }],
    }), { status: 200 }),
  });
  const result = await provider.translate({ sourceText: "Hello team.", sourceLanguage: "en", targetLanguage: "zh", context: [] });
  assert.deepEqual(result, { translation: "你好，团队。", sourceLanguage: "en", targetLanguage: "zh" });
});

test("Gemini Live session sends audio end when committing an utterance", async () => {
  const socket = new FakeGeminiSocket();
  const session = new GeminiLiveTranscriptionSession(socket, "zh");
  const ready = session.ready();
  socket.emit("open");
  socket.emit("message", JSON.stringify({ setupComplete: {} }));
  await ready;
  await session.commit({ utteranceId: "u-zh", commitSequence: 1 });
  assert.deepEqual(socket.sent.at(-1), { realtimeInput: { audioStreamEnd: true } });
});

test("Gemini Live setup failures preserve the WebSocket close code and reason", async () => {
  const socket = new FakeGeminiSocket();
  const session = new GeminiLiveTranscriptionSession(socket, "en");
  const ready = session.ready();
  socket.emit("open");
  socket.emit("close", 1007, Buffer.from("invalid setup"));
  await assert.rejects(ready, /code 1007: invalid setup/);
});
