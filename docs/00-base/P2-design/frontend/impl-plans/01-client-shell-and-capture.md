# Implementation Plan 01: Client Shell and Capture

## Target

Create the Vite React TypeScript client shell, typed reducer/context, bilingual static labels, mode setup, consent preflight, device picker, and capture subsystem.

## Target files

- `client/src/capture/captureController.ts`
- `client/src/capture/displayCapture.ts`
- `client/src/audio/audioWorklet.ts`
- `client/src/audio/utteranceVAD.ts`
- `client/src/state/sessionReducer.ts`
- `client/src/i18n/messages.ts`

## Ordered steps

1. Add client tooling and a shared protocol type package without provider-specific types.
2. Implement the reducer states and transitions from configuring through completed/error.
3. Implement the setup screen with mode, microphone, direction, UI language, and consent state.
4. Implement microphone capture and capability checks.
5. Implement Online tab capture plus microphone mixing in an `AudioContext`.
6. Implement an `AudioWorklet` that emits exactly 20 ms mono signed 16-bit PCM frames at 24 kHz.
7. Implement client VAD with 250 ms minimum speech, 650 ms silence commit, and 8-second hard segment maximum; send `utterance.start` with a direction snapshot and `utterance.commit` at the boundary.
8. Add `WebSocket.bufferedAmount` high/low-water backpressure handling at 1 MiB/256 KiB.
9. Add explicit cleanup for tracks, AudioContext, worklet, VAD, and WebSocket on pause/stop/error.
10. Add UI tests for permission denial, missing tab audio, track termination, mode restart, backpressure, VAD boundaries, and language toggle.

## Verification

- Unit-test reducer transitions and cleanup actions.
- Validate PCM frame metadata and sample bounds with deterministic fixtures.
- Validate VAD segment boundaries and manual commit sequencing.
- Manually verify Chrome/Edge microphone and tab capture.
- Confirm no audio is written to local storage, files, or logs.

## Risks

- Browser display capture may vary; Online mode must fail clearly.
- Resampling and mixing can cause clipping or channel mismatch; include peak checks.
- AudioWorklet startup must be treated as asynchronous and recoverable.
- Browser scheduling and noisy rooms can create false VAD boundaries; expose thresholds as tested constants and record segment metrics without recording content.
