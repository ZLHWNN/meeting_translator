import assert from "node:assert/strict";
import test from "node:test";
import { requireAudioTrack, type CaptureStream, type CaptureTrack } from "./displayCapture";

class FakeTrack implements CaptureTrack {
  stopped = false;
  stop(): void { this.stopped = true; }
}

class FakeStream implements CaptureStream {
  constructor(private readonly audio: CaptureTrack[], private readonly video: CaptureTrack[]) {}
  getAudioTracks(): CaptureTrack[] { return this.audio; }
  getVideoTracks(): CaptureTrack[] { return this.video; }
  getTracks(): CaptureTrack[] { return [...this.audio, ...this.video]; }
}

test("online capture requires audio and stops the display video track", () => {
  const audio = new FakeTrack();
  const video = new FakeTrack();
  assert.equal(requireAudioTrack(new FakeStream([audio], [video])), audio);
  assert.equal(video.stopped, true);
  assert.equal(audio.stopped, false);
});

test("online capture rejects a tab without audio and cleans tracks", () => {
  const video = new FakeTrack();
  assert.throws(() => requireAudioTrack(new FakeStream([], [video])), /online_capture_requires_tab_audio/);
  assert.equal(video.stopped, true);
});
