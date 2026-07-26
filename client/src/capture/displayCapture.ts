export interface CaptureTrack {
  stop(): void;
  addEventListener?(type: "ended", listener: () => void): void;
}

export interface CaptureStream {
  getAudioTracks(): CaptureTrack[];
  getVideoTracks(): CaptureTrack[];
  getTracks(): CaptureTrack[];
}

export function requireAudioTrack(stream: CaptureStream): CaptureTrack {
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("online_capture_requires_tab_audio");
  }

  // The video track is requested only to satisfy browser display-capture UI.
  stream.getVideoTracks().forEach((track) => track.stop());
  return audioTrack;
}

export function watchCaptureEnd(track: CaptureTrack, onEnded: () => void): void {
  track.addEventListener?.("ended", onEnded);
}
