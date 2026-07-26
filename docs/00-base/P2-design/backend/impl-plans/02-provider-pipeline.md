# Implementation Plan 02: Provider Pipeline

## Target

Implement provider-neutral transcription/translation interfaces, OpenAI Realtime transcription adapter, translation adapter, finalized-entry orchestration, rolling context, retry, and provider error mapping.

## Target files

- `server/src/providers/transcriptionProvider.ts`
- `server/src/providers/openaiRealtimeWhisper.ts`
- `server/src/providers/translationProvider.ts`
- `server/src/providers/openaiTextTranslation.ts`
- `server/src/session/utteranceCoordinator.ts`
- `server/src/translation/retryTranslation.ts`
- `docs/00-base/P2-design/backend/test-fixtures/translation-oracle.yaml`

## Ordered steps

1. Define provider-neutral transcription and translation interfaces.
2. Create an OpenAI Realtime transcription session using `gpt-realtime-whisper`, 24 kHz PCM, source language, and `turn_detection: null`.
3. Map interim deltas by provider `item_id` and client `utteranceId` without duplicating text.
4. Implement `commit({ utteranceId, commitSequence })`; store the pending pair before sending provider `input_audio_buffer.commit`, bind the next `input_audio_buffer.committed.item_id`, and map completed events to the matching finalized source entry.
5. Build translation input from the finalized source plus previous three finalized source entries and the direction snapshot stored at `utterance.start`.
6. Call the configured text-model adapter with constrained output requirements: natural faithful translation, preserve names/numbers, no commentary.
7. Validate the translation response and emit completed/failed events.
8. Implement retry by finalized entry ID with client-resubmitted source text/context, without retransmitting audio.
9. Add mock provider fixtures for interim/final ordering, `item_id` binding, provider errors, manual commit/flush, translation failures, disconnect recovery, upstream backpressure, and direction races.

## Verification

- Provider adapter contract tests use no network or credentials.
- Live smoke test uses a short English/Mandarin fixture only after mocks pass.
- Verify under-five-second latency measurement and metadata-only diagnostics.
- Run all cases in `translation-oracle.yaml` using `oracle-review-rubric.md` and record the result for P4.

## Risks

- Provider transcript events are asynchronous and may arrive in surprising order.
- Realtime transcription is guidance and can diverge from audio interpretation; oracle review is required.
- Provider model/API shapes can change; verify against current official documentation before coding and pin model IDs in environment configuration.
- Manual segmentation quality depends on browser audio levels; test threshold constants against quiet, normal, and overlapping speech fixtures.
