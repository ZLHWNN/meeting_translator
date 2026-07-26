import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { DEFAULT_REALTIME_URL, OpenAIRealtimeWhisperProvider, OpenAIRealtimeWhisperSession, type RealtimeSocket } from "./openaiRealtimeWhisper";

class FakeSocket extends EventEmitter implements RealtimeSocket {
  readyState = 1;
  bufferedAmount = 0;
  sent: Record<string, unknown>[] = [];
  send(payload: string): void { this.sent.push(JSON.parse(payload) as Record<string, unknown>); }
  close(): void { this.readyState = 3; }
}

test("provider connects with a Realtime session model and configures Whisper transcription", async () => {
  const socket = new FakeSocket();
  let connectedUrl = "";
  const provider = new OpenAIRealtimeWhisperProvider({
    apiKey: "test-key",
    socketFactory: (url) => {
      connectedUrl = url;
      setImmediate(() => socket.emit("open"));
      return socket;
    },
  });
  const connecting = provider.connect({ sourceLanguage: "en" });
  await new Promise((resolve) => setImmediate(resolve));
  socket.emit("message", JSON.stringify({ type: "session.updated" }));
  await connecting;

  assert.equal(connectedUrl, DEFAULT_REALTIME_URL);
  assert.equal(socket.sent[0]?.session && (socket.sent[0].session as Record<string, unknown>).type, "transcription");
  const session = socket.sent[0]?.session as { audio?: { input?: { transcription?: { model?: string } } } };
  assert.equal(session.audio?.input?.transcription?.model, "gpt-realtime-whisper");
});

test("Realtime adapter configures transcription and reconciles item events", async () => {
  const socket = new FakeSocket();
  const session = new OpenAIRealtimeWhisperSession(socket, "en", "low");
  const ready = session.ready();
  socket.emit("open");
  assert.deepEqual(socket.sent[0], {
    type: "session.update",
    session: {
      type: "transcription",
      audio: {
        input: {
          format: { type: "audio/pcm", rate: 24000 },
          transcription: { model: "gpt-realtime-whisper", language: "en", delay: "low" },
          turn_detection: null,
        },
      },
    },
  });
  socket.emit("message", JSON.stringify({ type: "session.updated" }));
  await ready;

  const events: unknown[] = [];
  session.onEvent((event) => events.push(event));
  session.appendPcm(new Uint8Array([1, 2, 3]));
  await session.commit({ utteranceId: "u-1", commitSequence: 1 });
  assert.equal(socket.sent.at(-2)?.type, "input_audio_buffer.append");
  assert.equal(socket.sent.at(-1)?.type, "input_audio_buffer.commit");
  socket.emit("message", JSON.stringify({ type: "input_audio_buffer.committed", item_id: "item-1" }));
  socket.emit("message", JSON.stringify({ type: "conversation.item.input_audio_transcription.delta", item_id: "item-1", delta: "Hello" }));
  socket.emit("message", JSON.stringify({ type: "conversation.item.input_audio_transcription.completed", item_id: "item-1", transcript: "Hello team." }));
  assert.deepEqual(events, [
    { type: "committed", providerItemId: "item-1" },
    { type: "interim", providerItemId: "item-1", text: "Hello" },
    { type: "completed", providerItemId: "item-1", text: "Hello team." },
  ]);
});
