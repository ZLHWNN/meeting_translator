# Phase 3 Kickoff — Wave 1

Date: 2026-07-26  
Authorization: the user explicitly instructed the project to proceed to Phase 3 after the final Sol review returned `GO-AFTER-FIXES`.

## Scope

Wave 1 implements only the repository/tooling and transport foundation:

- TypeScript project configuration and scripts.
- Shared protocol constants and type definitions.
- Health and anonymous session creation endpoints.
- One-time WebSocket subprotocol authentication and handshake skeleton.
- Metadata-only session lifecycle with expiry and cleanup.

Browser capture, provider adapters, translation, UI, recording, collaboration, and advanced meeting management remain later waves.

## Deferred hardening from final review

The final Sol review identified five findings that remain explicitly open:

1. Add a server `resume-capture` backpressure event and define in-flight frame handling.
2. Split client/server protocol schemas and define rejection behavior for binary or direction-invalid messages without command IDs.
3. Define a repeatable audio fixture/procedure and separate the 20-case quality and latency matrices.
4. Provide a complete Chinese equivalent screen/state.
5. Synchronize the current state header with the append-only history after each transition.

These are tracked here so proceeding to implementation does not imply they were resolved.

## Wave 1 result

Wave 1 completed on 2026-07-26. `npm run build`, `npm run typecheck`, and the session-store test passed. A runtime smoke test verified health, session creation, and the authenticated WebSocket sequence `session.ready` → `hello` → accepted `command.ack`. The local server was stopped after the smoke test.

Next scope: Wave 2 browser microphone/tab capture, AudioWorklet normalization, client VAD, and backpressure handling.

Wave 2 deterministic capture work passed on 2026-07-26. Manual Chrome/Edge permission and display-capture checks remain scheduled for the integration wave. Wave 3 now owns provider-neutral orchestration and mock provider contract tests.

Wave 3 is in progress. The current coordinator and mock contract tests cover direction snapshots, manual commit sequencing, provider `item_id` binding, interim/final event mapping, finalized-only translation, and bounded three-entry context. Credentialed OpenAI transport, retry, and live oracle evaluation remain later Wave 3/5 work.

The implementation has now completed the deterministic Wave 3/4 foundation: OpenAI Realtime and text translation adapters, server WebSocket orchestration, React/Vite UI, browser AudioWorklet capture, retry, bilingual labels, and client/server backpressure. Wave 5 is the acceptance and live-provider hardening gate.

### Wave 5 commit lifecycle fix

The first browser smoke check exposed `commit_in_flight` after a tab with audio was shared. Capture permission was working; the local mock transcription session did not emit the provider `committed` acknowledgement, leaving the first commit pending forever. The fix also covers the equivalent real-provider race: coordinator commits wait for provider acknowledgement, the server pauses capture while that acknowledgement is pending, and queued audio is forwarded only after the commit completes. Mock commits now emit deterministic acknowledgements. `npm run typecheck` and all 8 automated tests pass; live credentialed Chrome/Edge validation remains open.

### Wave 5 Realtime model contract fix

The first credentialed provider run rejected `gpt-realtime-whisper` in the WebSocket URL because it is a transcription model rather than the Realtime session model. The connection now uses `gpt-realtime-2.1`, while the session update keeps `gpt-realtime-whisper` in `audio.input.transcription.model`, matching the current official Realtime transcription and WebSocket guides. A regression test verifies both model positions.

The follow-up browser run still showed the old error because `npm start` launched a stale `dist/server` build while TypeScript writes the current server to `dist-ts`. The start script now targets `dist-ts/server/src/main.js`.

### Gemini free-tier provider path

Gemini support was added as an alternate provider for no-OpenAI-credit testing. `GEMINI_API_KEY` selects a raw Gemini Live WebSocket transcription session using `gemini-3.1-flash-live-preview` and a Gemini `generateContent` translation adapter using `gemini-3.1-flash-lite`. The client protocol remains unchanged; the Gemini adapter resamples the existing 24 kHz PCM frames to the documented 16 kHz input format and maps Gemini input transcription events into the existing coordinator. OpenAI and mock providers remain available. The adapter tests, typecheck, and build pass; credentialed Gemini browser validation remains open.

The first Gemini Live handshake closed before `setupComplete`. Review against the current raw WebSocket schema found that `responseModalities` and `inputAudioTranscription` had been nested under `generationConfig`; both are now direct setup fields. The adapter also preserves the remote close code/reason in the error. Typecheck, tests, and build pass after this fix.

The first corrected retry showed the raw `v1beta` endpoint rejects `responseModalities` directly under `setup`. The payload is now aligned with the detailed WebSocket reference: `responseModalities` is under `generationConfig`, while `inputAudioTranscription` remains a direct setup field.

### Phase 3 live observations

The first Gemini browser use reported delayed large-chunk transcription/translation and a translated result that may cover a previous result. These are recorded as open P4 validation findings, not fixed in this pass. The user also requested an ended-session review/export flow: Stop should end capture, drain pending work, retain the completed report in the meeting view, and offer export or exit/discard. Details and unresolved questions are recorded in [`planning/phase-3-live-observations.md`](phase-3-live-observations.md) and the proposed frontend ADR.

## Wave 1 success criteria

1. `npm run typecheck` passes for the server and shared protocol code.
2. `GET /health` returns protocol version and readiness.
3. `POST /v1/sessions` validates mode/direction and returns an opaque expiring session token.
4. WebSocket upgrade requires the selected `mt.v1` and one-time `mt.token.*` subprotocols, validates Origin, sends `session.ready`, and requires `hello` before controls.
5. Session state is memory-only and cleanup runs on stop, expiry, close, and fatal protocol errors.
