import { pcm16Frame } from "./pcm";
import { BackpressureGate } from "./backpressure";
import { UtteranceVAD } from "./utteranceVAD";
import { type CapturePair } from "../capture/captureController";
import type { Direction } from "../protocol/messages";

const PROCESSOR_NAME = "meeting-translator-capture";
const PROCESSOR_SOURCE = `
class MeetingTranslatorCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buffer = []; this.inputRate = sampleRate; }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    for (const sample of input) this.buffer.push(sample);
    const ratio = this.inputRate / 24000;
    const needed = Math.ceil(480 * ratio) + 1;
    while (this.buffer.length >= needed) {
      const output = new Float32Array(480);
      for (let i = 0; i < 480; i++) {
        const position = i * ratio;
        const low = Math.floor(position);
        const high = Math.min(low + 1, this.buffer.length - 1);
        const weight = position - low;
        output[i] = this.buffer[low] * (1 - weight) + this.buffer[high] * weight;
      }
      this.buffer.splice(0, Math.floor(480 * ratio));
      this.port.postMessage(output.buffer, [output.buffer]);
    }
    return true;
  }
}
registerProcessor("${PROCESSOR_NAME}", MeetingTranslatorCapture);
`;

function rms(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

function commandId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export interface AudioPipeline {
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
}

export async function createAudioPipeline(
  capture: CapturePair,
  socket: WebSocket,
  getDirection: () => Direction,
): Promise<AudioPipeline> {
  const context = new AudioContext({ sampleRate: 24_000 });
  const blobUrl = URL.createObjectURL(new Blob([PROCESSOR_SOURCE], { type: "application/javascript" }));
  await context.audioWorklet.addModule(blobUrl);
  URL.revokeObjectURL(blobUrl);
  const node = new AudioWorkletNode(context, PROCESSOR_NAME, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
  const silentGain = context.createGain();
  silentGain.gain.value = 0;
  node.connect(silentGain).connect(context.destination);
  context.createMediaStreamSource(capture.microphone).connect(node);
  if (capture.tab) context.createMediaStreamSource(capture.tab).connect(node);

  const vad = new UtteranceVAD();
  const gate = new BackpressureGate();
  let active = false;
  let stopped = false;

  const sendJson = (value: object): void => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
  };

  node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    if (stopped) return;
    const samples = new Float32Array(event.data);
    const events = vad.process(rms(samples));
    const start = events.find((item) => item.type === "utterance.start");
    if (start) {
      active = true;
      sendJson({ type: "utterance.start", commandId: commandId("start"), utteranceId: start.utteranceId, direction: getDirection() });
    }
    if (!active || gate.isPaused()) return;
    const frame = pcm16Frame(samples);
    socket.send(frame);
    const commit = events.find((item) => item.type === "utterance.commit");
    if (commit) {
      sendJson({ type: "utterance.commit", commandId: commandId("commit"), utteranceId: commit.utteranceId });
      active = false;
    }
    const action = gate.update(socket.bufferedAmount);
    if (action === "pause-capture") void context.suspend();
  };

  const backpressureMonitor = window.setInterval(() => {
    if (stopped) return;
    const action = gate.update(socket.bufferedAmount);
    if (action === "pause-capture") void context.suspend();
    if (action === "resume-capture") void context.resume();
  }, 50);

  return {
    pause: () => context.suspend(),
    resume: async () => {
      gate.update(0);
      await context.resume();
    },
    stop: async () => {
      stopped = true;
      window.clearInterval(backpressureMonitor);
      const pending = vad.flush()[0];
      if (pending && active) sendJson({ type: "utterance.commit", commandId: commandId("commit"), utteranceId: pending.utteranceId });
      node.disconnect();
      capture.microphone.getTracks().forEach((track) => track.stop());
      capture.tab?.getTracks().forEach((track) => track.stop());
      await context.close();
    },
  };
}
