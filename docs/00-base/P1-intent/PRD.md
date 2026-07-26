# Meeting Translator MVP — Product Requirements Document

Status: Frozen — P1 GO recorded 2026-07-26  
Feature: `00-base`  
Phase: P1 Intent  
Source decision log: [`planning/phase-1-grilling-decision-log.md`](../../../planning/phase-1-grilling-decision-log.md)

## Product intent

Meeting Translator helps a bilingual participant follow and participate in a two-person English–Mandarin conversation during either an in-person meeting or an online meeting. It captures speech, shows interim source transcription, and displays natural Simplified Chinese or English translation for finalized utterances.

## Primary user and scenario

- Primary user: bilingual meeting participant.
- Primary scenario: two people alternate English and Mandarin.
- Meeting modes:
  - In-person: selected microphone, internet available.
  - Online: selected Chrome/Edge tab audio plus local microphone.
- The user manually controls translation direction.

## In scope

- Desktop web app for Chrome and Edge.
- English ↔ Mandarin translation.
- Simplified Chinese output and bilingual English/中文 interface.
- Explicit consent notice before cloud processing and capture permissions.
- Microphone device picker.
- Browser tab and microphone capture for Online mode.
- Start, pause, resume, and stop controls.
- Interim source transcript and finalized translated entries.
- Source and translation shown together with relative timestamps.
- Manual direction toggle applied to the next finalized utterance.
- Retryable errors while preserving already-transcribed source text.
- Copying timestamped source/translation pairs.
- Metadata-only diagnostics.
- Sessions up to 60 minutes.

## Out of scope

- Recording or raw-audio retention.
- Persistent transcript history, accounts, or cloud session history.
- Multi-user collaboration and advanced meeting management.
- True no-internet/on-device processing.
- Platform-specific Zoom, Teams, or Meet integrations.
- Speaker labels, diarization, or guaranteed overlapping-speech accuracy.
- Translated speech playback.
- Traditional Chinese output.
- Firefox/Safari support guarantees.
- Formal WCAG 2.2 AA certification.

## Product constraints and defaults

- Cloud processing is acceptable only with explicit disclosure.
- The disclosure must distinguish application-side non-retention from provider-side abuse-monitoring retention. The app must not claim zero provider retention unless the configured provider data controls actually provide it.
- Provider credentials stay on the server.
- Application state is ephemeral: refresh, tab close, server restart, stop, or expiry can lose the active transcript.
- No audio, transcript, or translation content is written to application logs.
- Online capture is blocked with guidance when the browser cannot provide the selected source.
- Changing meeting mode requires a new session.
- Overlapping speech is best effort and documented as a limitation.
- Translation uses the current balanced quality/latency/cost OpenAI text-model choice, verified against official documentation during P2.

## Success criteria

### SC1 — Start and consent

A user can open the app, choose English/中文 UI, choose a meeting mode, acknowledge cloud audio processing, and start without creating an account.

### SC2 — In-person capture

On Chrome or Edge desktop, a user can select a microphone and capture an in-person meeting with internet access.

### SC3 — Online capture

On Chrome or Edge desktop, a user can select a browser tab and microphone; the app mixes both sources for Online mode. Unsupported capture is explained and blocked.

### SC4 — Live source transcription

Interim source speech appears while the user speaks. Finalized entries remain stable and are not duplicated when later events arrive.

### SC5 — Translation direction

The user can toggle English → Mandarin or Mandarin → English. The new direction applies to the next finalized utterance and does not rewrite earlier entries.

### SC6 — Translation latency

For latency, a reviewer reads each of the 20 fixed oracle utterances aloud once in Chrome and once in Edge using the declared source direction, for 40 total audio observations. Measure from client `utterance.commit` to client `translation.completed`; the combined and per-browser p95 must be at most five seconds. The separate text-quality oracle runs each case once without live audio. Retries and provider failures are reported separately.

### SC7 — Translation quality

A curated general-business English–Mandarin oracle set passes human review with no critical meaning errors. The set covers updates, decisions, actions, dates, numbers, and workplace terminology.

### SC8 — Display and navigation

Each finalized entry shows relative elapsed time, source text, and translation. The transcript auto-scrolls by default, pauses when the user scrolls upward, and offers return-to-live behavior.

### SC9 — Session controls

Start, pause, resume, and stop work predictably. A session supports up to 60 minutes. Changing meeting mode requires a new session.

### SC10 — Failure recovery

Permission, network, capture, and provider failures produce visible actionable errors. Existing source text remains available. Translation can be retried by resubmitting finalized source text and bounded context without retransmitting audio, including after reconnecting through a new ephemeral session.

### SC11 — Privacy

The application does not persist raw audio, transcript text, translations, or account history. Diagnostics contain metadata only. Provider-side retention and data-control configuration are disclosed separately and recorded in the release review.

### SC12 — Copy

Copying the active transcript places relative timestamps and source/translation pairs on the clipboard.

### SC13 — Accessibility and bilingual UI

Core controls are keyboard usable, status changes are announced, contrast/readability are practical, and the user can switch between English and Simplified Chinese UI labels.

## P1 gate

The user explicitly authorized proceeding to Phase 2 on 2026-07-26. This PRD is now frozen. Any change to product intent, scope, or success criteria starts a new P1 loop rather than being silently changed during design or implementation.

## Post-P1 proposal recorded during Phase 3 validation

The user requested that Stop end listening without immediately closing access to the meeting result. The proposed lifecycle is to drain pending work, show a completed meeting review, and offer local export or explicit exit/discard. This proposal is not part of the frozen P1 requirements yet; it requires a follow-up grilling decision covering export format, pending translations, refresh behavior, and accidental-stop confirmation. See [`planning/phase-3-live-observations.md`](../../../planning/phase-3-live-observations.md) and the proposed frontend ADR [`docs/00-base/P2-design/frontend/adr/002-session-review-export-proposal.md`](../P2-design/frontend/adr/002-session-review-export-proposal.md).
