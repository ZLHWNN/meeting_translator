import { requireAudioTrack, type CaptureStream } from "./displayCapture";

export type CaptureMode = "in-person" | "online";

export interface CapturePair {
  microphone: MediaStream;
  tab?: MediaStream;
}

export async function requestCapture(mode: CaptureMode, microphoneDeviceId?: string): Promise<CapturePair> {
  const microphone = await navigator.mediaDevices.getUserMedia({
    audio: microphoneDeviceId ? { deviceId: { exact: microphoneDeviceId } } : true,
    video: false,
  });
  if (mode === "in-person") return { microphone };

  try {
    const tab = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    requireAudioTrack(tab as unknown as CaptureStream);
    return { microphone, tab };
  } catch (error) {
    microphone.getTracks().forEach((track) => track.stop());
    throw error;
  }
}
