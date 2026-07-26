# Meeting Translator — Sol Phase 2 Review

Reviewer: `gpt-5.6-sol`, medium effort  
Nickname: Pascal  
Review mode: read-only  
Review date: 2026-07-26  
Scope: P1 intent, PRD, grilling records, and every file under `docs/00-base/P2-design/`

## Recommendation

**GO-AFTER-FIXES**

The overall architecture is viable and the combined test plans reference SC1–SC13. The P2 GO gate is not yet justified because the streaming, protocol, recovery, and acceptance decisions below remain unresolved.

## Strengths

- Frozen scope is preserved: no accounts, recording, database, or persistent transcripts.
- Provider credentials remain server-side and diagnostics are metadata-only.
- Capture-specific logic converges on one normalized audio pipeline.
- Transcription and translation are separated, allowing source text to survive translation failures.
- Frontend and backend test plans collectively cover every success criterion.
- Mock provider tests are separated from credentialed live tests.
- Consent precedes browser permission requests in the user flow.

## Gate blockers

### 1. Realtime turn finalization is unresolved

The design commits to server VAD while leaving the exact transcription model undecided. Current OpenAI guidance recommends `gpt-realtime-whisper` for streaming transcription and requires turn detection to be omitted or set to `null`, with audio committed manually. The design therefore lacks a valid finalized-utterance mechanism as written.

Required resolution:

- Select the exact transcription model.
- Define either supported VAD configuration or deterministic manual commit/segmentation.
- Define how pause and stop flush pending audio.

Reference: https://developers.openai.com/api/docs/guides/realtime-transcription

### 2. WebSocket authentication and sequencing are underspecified

`POST /v1/sessions` returns a token, but the WebSocket path and `hello` event do not define how that token is presented. Browser WebSockets do not support arbitrary application headers.

Required resolution:

- Choose cookie, one-time URL token, or WebSocket subprotocol authentication.
- Define `hello`/`session.ready` order.
- Define acknowledgements for controls and direction changes.
- Define close codes, required fields, maximum message sizes, and invalid-state behavior.
- Replace the descriptive WebSocket YAML with a machine-validatable discriminated schema or equivalent protocol specification.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket

### 3. Disconnect recovery does not satisfy SC10

The design deletes server state on disconnect, while `translation.retry` sends only an entry ID. A new connection cannot resolve that ID.

Required resolution: choose one of:

- bounded reconnect/resume;
- client resubmission of finalized source text for translation; or
- a new P1 decision that narrows SC10.

Also define whether pause and stop commit, drain, or discard pending audio.

### 4. SC7 lacks a reproducible oracle artifact

The test plan promises a future harness but does not contain the bilingual input set, expected meaning annotations, critical-error definition, reviewer procedure, or acceptance record.

Required resolution: create a fixed general-business English–Mandarin oracle set and a human-review rubric before P2 GO.

## High-priority findings

- Reconcile provider events by `item_id`; the current design stores only one interim string.
- Inspect `getDisplayMedia()` results for an actual audio track, safely stop unused video, handle track termination, and block unsuitable selections.
- Define audio frame duration, maximum WebSocket `bufferedAmount`, overload policy, and slow-network tests.
- Distinguish application non-retention from provider retention in consent and deployment documentation.
- Snapshot direction when an utterance is committed and acknowledge the change to avoid races.
- Define latency start/end boundaries, clock, sample count, network conditions, percentile/pass threshold, and retry treatment.

## Lower-priority findings

- Prototype missing paused, failed, unsupported-capture, return-to-live, expiry, and Chinese-interface states.
- Keep the live timer out of the `aria-live` status region.
- Define whether session expiry starts at creation, connection, or capture start.
- Add concrete target files and explicit risks to implementation plans.
- The repository’s workflow analysis filename is `standing-team-workflow-analysis.md`.

## Review conclusion

No files were modified by the reviewer. P2 remains gated. The next work item is a focused P2 revision resolving the four blockers and the high-priority protocol/recovery findings, followed by a second review or explicit human GO after the fixes are verified.

## Fix-pass status

The requested fix pass has been applied in the P2 artifacts. The fixes include:

- `gpt-realtime-whisper` with `turn_detection: null`, client VAD, explicit manual commits, and pause/stop flush rules.
- One-time WebSocket token subprotocol, handshake ordering, command acknowledgements, close codes, frame limits, and a JSON Schema protocol definition.
- Client-resubmitted finalized source text/context for translation retry after disconnect, without audio replay.
- Keyed provider event reconciliation by `item_id` and client utterance ID.
- Browser audio-track validation, VAD/backpressure thresholds, and track cleanup.
- Provider-retention disclosure and a fixed 20-case translation oracle plus human rubric.
- Defined p95 latency measurement from `utterance.commit` to `translation.completed`.

Status after fix pass: `P2_FIXES_APPLIED_PENDING_REVIEW`. A second independent review is required before P2 GO.

## Second verification review

The second Sol verification found the first fix pass still required additional changes: PCM frame size was incorrect; the provider adapter lacked an explicit commit operation and item binding; command validity by state was not normative; server/provider backpressure was incomplete; consent did not state provider retention directly; the oracle and latency counts differed; and Chinese/return-to-live states were not concretely rendered.

Those findings are addressed in the second fix pass. The feature state remains gated pending verification.
