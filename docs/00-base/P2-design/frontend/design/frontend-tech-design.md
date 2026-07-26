# Frontend Technical Design

## Responsibilities

The React client owns:

- Bilingual UI labels and manual English/中文 selection.
- Meeting-mode selection and capability checks.
- Consent acknowledgement and browser permission requests.
- Microphone device selection.
- Online tab-audio plus microphone capture and mixing.
- AudioWorklet conversion to mono signed 16-bit PCM at 24 kHz.
- WebSocket connection, control messages, binary audio frames, and event dispatch.
- Live transcript rendering, relative timestamps, direction toggle, retry, copy, and accessibility state.

The client must not own provider keys, call OpenAI directly, persist meeting content, or infer speaker identity.

## UI state model

Use a typed reducer with these top-level states:

`idle → configuring → consent → requesting-permissions → connecting → running ↔ paused → stopping → completed`

Any state may transition to `error` with a recoverable error classification. Recovery returns to the narrowest safe prior state; a provider failure does not erase finalized entries.

State contains:

- `uiLanguage`: `en | zh-Hans`.
- `mode`: `in-person | online`.
- `microphoneDeviceId` and selected tab metadata where available.
- `direction`: `en-to-zh | zh-to-en`.
- `sessionId`, connection status, and expiry.
- `entries[]`: finalized source/translation pairs with relative elapsed time and translation status.
- `interimByUtteranceId`: keyed interim source strings with provider item ID and revision.
- `permissionState`, `captureState`, `connectionState`, and actionable error.
- `autoScrollPaused`.

## Capture design

In-person mode creates a microphone `MediaStream`.

Online mode creates:

1. A microphone stream.
2. A user-selected tab stream through browser display capture.
3. An `AudioContext` graph that mixes both streams.
4. An `AudioWorkletNode` that resamples/normalizes to the agreed PCM format.

The client must inspect the returned display stream: it must contain an audio track. The video track is used only to satisfy browser display-capture requirements and is stopped after the audio track is connected. If no audio track exists, the selected surface ends, or capture is denied, Online mode shows a limitation and does not silently fall back to microphone-only behavior.

The worklet emits exactly 20 ms, 960-byte mono signed 16-bit PCM frames at 24 kHz. The client-side VAD starts an utterance after at least 250 ms of speech, sends `utterance.start` with the current direction snapshot, and sends `utterance.commit` after 650 ms of silence or at the 8-second hard maximum. The worklet does not retain audio after a frame is acknowledged by the browser pipeline.

Before sending a frame, check the browser WebSocket `bufferedAmount`. At 1 MiB, pause capture locally and show a backpressure state; resume below 256 KiB. A server-to-client `backpressure` event with `pause-capture` suspends the audio context, and `resume-capture` resumes it after the server queue drains. Never silently discard a frame; a bounded overflow is surfaced as a retryable session error.

## Transcript rendering

Render each finalized entry as:

- Relative timestamp.
- Source language and source text.
- Translation language and translation text, or a retryable unavailable state.

Interim source text is keyed by utterance and provider item ID, updated by revision, and removed/replaced when the matching finalized event arrives. Provider completion order must not reorder finalized entries; order by client commit sequence. Interim source text is visually distinct and is never copied as finalized content. The list follows new entries until the user scrolls upward, then exposes a return-to-live action.

## Accessibility and localization

- All controls have visible labels and keyboard focus states.
- Runtime state changes use an `aria-live` status region; the elapsed timer is not inside that region.
- English and Simplified Chinese strings are static, keyed, and manually switched.
- Do not use the translation model for UI labels.
- Color is not the only error or state signal.
