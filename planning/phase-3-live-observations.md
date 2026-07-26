# Phase 3 Live Validation Observations

Status: recorded observation and proposed follow-up; no application changes made.

Date: 2026-07-26

## User-reported observations

1. Listening/transcription does not feel as live as the audio capture. The provider sometimes waits for a large chunk of speech and then produces/translates a paragraph instead of delivering short, incremental meeting utterances.
2. A translated result may visually cover or replace a previous translated result. This is not yet classified as a layout overlap, an entry-key collision, or an out-of-order translation event. The existing client updates a translation by `entryId`, so the next debugging pass must inspect both rendered layout and event identity/order.

These observations affect the existing near-real-time promise and the P4 latency gate. They are not yet a passing or failing metric because no controlled 20-case/40-observation run has been completed.

## Requested Stop behavior

The requested product behavior is:

- Stop listening and flush/finalize pending audio and translation work.
- End the meeting session from a capture perspective, but do not immediately remove the meeting view or make the report inaccessible.
- Show a completed meeting review state containing the listened source text and translated text.
- Let the user export the meeting report or explicitly exit/discard the meeting.

The current implementation instead stops the provider, closes the session WebSocket, marks the session completed, and returns the UI to setup. This behavior is recorded as a gap; it was not changed in this pass.

## Suggested next improvements

- Add explicit `ending` → `review` lifecycle states, including a bounded drain period for pending transcription and translation results.
- Make finalized transcript entries append-only with stable IDs, and add tests for duplicate, delayed, and out-of-order provider events.
- Add rendering tests for long English and Chinese strings, narrow windows, and multiple adjacent translations to detect visual overlap separately from state replacement.
- Measure capture frame time, VAD commit time, provider transcript time, and translation completion time separately. This will identify whether large chunks originate in capture/VAD, Gemini buffering, transcription finalization, or translation.
- Add a visible source/capture status indicator and a clear pending-translation state in the review screen.
- Define export privacy behavior before implementation: local download only, no server persistence, and a warning that exported files contain meeting content.
- Treat recording, multi-user collaboration, and advanced meeting management as later features, separate from this review/export lifecycle.

## Questions for the next grilling pass

- When you say translated text “covers” previous text, is the earlier text replaced in the data, or do two blocks visually overlap on screen?
- What is the acceptable live delay: under one second, under three seconds, or the existing five-second post-utterance target?
- Which export formats are needed first: plain text, Markdown, CSV, JSON, or PDF?
- Should export include timestamps, source language, target language, meeting mode, failed/pending translations, and interim text?
- When Stop is pressed while a translation is pending, should the review wait briefly for it, export it as pending, or allow the user to retry from review?
- After ending a meeting, should the user be able to return to the same review later in that browser tab, or should Exit discard it immediately?
- Should Stop require confirmation to prevent accidental loss, or should the action be immediate with a separate Exit/discard control?
