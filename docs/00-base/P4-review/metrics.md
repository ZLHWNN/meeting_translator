# P4 Acceptance Metrics

Status: pending credentialed live run.

## Current live-validation observations

The first Gemini browser run reported two usability issues that are recorded for the next controlled acceptance pass:

- Audio/transcription/translation sometimes arrives as a large paragraph rather than short incremental meeting utterances, so the live feel must be measured across capture, VAD, provider transcription, and translation boundaries.
- A translated result may cover or replace a previous result. The next pass must determine whether this is visual layout overlap or an entry identity/event-ordering defect.

The requested follow-up is an ended-session review state: Stop should end listening, drain pending work, keep the completed report visible, and offer local export or explicit exit/discard. This is a proposed product change and is not included in the current gate until its open questions are resolved.

## Required records

- Exact `OPENAI_TRANSLATION_MODEL` and `gpt-realtime-whisper` configuration.
- Provider data-control mode and retention disclosure review.
- Provider WebSocket RTT p95 and packet-loss observation.
- Text-quality oracle verdict for all 20 cases.
- Audio latency results for 20 human-read cases in Chrome and the same 20 in Edge (40 observations total), reported combined and per browser.
- Retry and provider-failure counts.
- Human reviewer and final verdict.

## Gate

The text-quality run passes with no critical meaning errors. The audio-latency run passes when combined, Chrome-only, and Edge-only p95 from `utterance.commit` to `translation.completed` are all at most five seconds. Browser permission/display-capture limitations, provider failures, and retries are reported separately rather than hidden.

Procedure references:

- [`translation-oracle.yaml`](../P2-design/backend/test-fixtures/translation-oracle.yaml)
- [`oracle-review-rubric.md`](../P2-design/backend/test-fixtures/oracle-review-rubric.md)
- [`latency-procedure.md`](../../../tests/oracle/latency-procedure.md)
