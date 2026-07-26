# Meeting Translator — Phase 1 Grilling Decision Log

This is the complete record of the Phase 1 questions asked, the selected decisions, and the rationale recorded during the grilling session. It is intentionally duplicated in `README.md` because the project documentation requirement asks for the decision history to remain visible to readers of the repository.

Status: P1 documentation prepared; awaiting explicit PRD GO.

| # | Question / decision point | Decision | Reason |
|---:|---|---|---|
| 1 | What is the core product promise? | Capture meeting speech and show near-real-time translation for both in-person and online meetings. | Establishes the smallest useful product around translation, while covering both requested meeting contexts. |
| 2 | What does online meeting support mean? | Capture a user-selected browser tab’s audio without Zoom/Teams/Meet-specific integrations. | Browser capture is materially simpler than platform integrations and still supports common online meetings. |
| 3 | What should the core output be? | Live translated text. | Avoids speech-synthesis complexity while validating the essential translation workflow. |
| 4 | Which languages should be validated first? | English ↔ Mandarin. | A concrete language pair makes quality, latency, and oracle testing measurable. |
| 5 | What does offline meeting mean? | An in-person meeting with internet available, not true no-internet operation. | Cloud processing is acceptable and avoids the much larger local-model requirement. |
| 6 | What is the privacy default? | Ephemeral processing; retain no audio and keep text only in the active session. | Reduces meeting-data exposure and matches the decision to defer recording and history. |
| 7 | What latency should be targeted? | Under five seconds after a short utterance completes. | A practical live-conversation target without overconstraining the first implementation. |
| 8 | How should two-way translation work? | Manual English ↔ Mandarin direction toggle. | Provides two-way use without the unpredictability of automatic language detection. |
| 9 | Should speakers be identified? | No speaker labels. | Avoids diarization errors and keeps the transcript focused on translation. |
| 10 | How should results be displayed? | Source and translation together for each utterance. | Lets users compare meaning and detect translation issues. |
| 11 | What delivery surface is required? | Desktop web app. | Best fit for microphone and browser-tab capture while avoiding packaging work. |
| 12 | Should the first flow use real services? | Real cloud services behind provider adapters. | Validates actual quality and latency while keeping provider-specific code replaceable. |
| 13 | Which provider direction should guide the design? | OpenAI-first, with replaceable adapters. | Gives the implementation a concrete first provider without permanently coupling the architecture. |
| 14 | Which browsers are guaranteed? | Chrome and Edge desktop. | Chromium capture APIs provide the most predictable tab-audio behavior for the MVP. |
| 15 | Are accounts required? | No account. | Keeps startup friction and data infrastructure low for an ephemeral product. |
| 16 | What happens on capture, network, or provider failure? | Show a visible error, preserve the in-memory transcript, and allow retry. | Prevents silent data loss while avoiding hidden fallback behavior. |
| 17 | What consent is required? | Show a preflight acknowledgement about cloud audio processing before requesting permissions. | Makes the cloud-processing boundary explicit before capture begins. |
| 18 | Which session controls are needed? | Start, pause, resume, and stop. | Gives users control over when audio is sent without adding meeting-management features. |
| 19 | How are meeting modes selected? | Two explicit modes: In-person microphone and Online browser/tab audio. | Prevents ambiguous permission flows and makes the selected source clear. |
| 20 | What processing pipeline should be used? | Speech-to-text first, then text translation. | Preserves the original transcript and makes each stage independently testable. |
| 21 | How should interim speech be shown? | Show interim source text; translate only finalized utterances. | Provides immediate feedback without flickering unstable translations. |
| 22 | When does a direction toggle take effect? | On the next finalized utterance. | Keeps prior entries stable and makes state changes predictable. |
| 23 | How should translation quality be validated? | Curated bilingual oracle set plus human review, with no critical meaning errors. | Avoids brittle exact-string tests while preserving a concrete quality gate. |
| 24 | What content domain should the oracle set represent? | General business meetings. | Covers updates, decisions, actions, dates, numbers, and common workplace language. |
| 25 | What is the overlap-speech policy? | Best effort; no guarantee of correct overlapping-speaker translation. | Prevents the MVP from requiring diarization while documenting the limitation honestly. |
| 26 | What maximum session length is required? | Up to 60 minutes. | Covers a typical meeting while bounding resource use and recovery complexity. |
| 27 | What happens on refresh or tab close? | The active transcript may be lost intentionally. | Maintains the ephemeral privacy boundary and avoids local or cloud persistence. |
| 28 | Which application stack should be used? | React + TypeScript client with a Node server. | Fits browser media APIs and typed streaming boundaries. |
| 29 | How should client/server audio and events flow? | WebSocket event stream. | Supports bidirectional audio, interim results, final results, controls, and errors. |
| 30 | Where should provider credentials live? | Server-side only. | Prevents provider secrets from being exposed in the browser. |
| 31 | Where should the first version run? | Local development first. | Allows capture and provider behavior to be validated before hosting decisions. |
| 32 | How should cloud services be tested? | Mocked provider contract tests plus separate manual live tests. | Keeps automated tests deterministic while still validating real quality and latency. |
| 33 | Should both meeting modes share a pipeline? | Yes; normalize both into one audio-processing pipeline. | Keeps capture-specific logic isolated and avoids duplicated transcription/translation behavior. |
| 34 | Which OpenAI audio path should be used? | Realtime transcription session. | Best fit for interim results and the under-five-second target. |
| 35 | How should finalized text be translated? | OpenAI text model with a constrained translation prompt. | Supports natural translation while preserving names, numbers, and meeting meaning. |
| 36 | How much translation context is included? | Current utterance plus a small rolling context. | Improves references and pronouns without sending the whole meeting repeatedly. |
| 37 | What happens if translation fails after transcription succeeds? | Keep the source text and retry translation without retransmitting audio. | Preserves available meeting content and avoids unnecessary audio reprocessing. |
| 38 | What diagnostics are permitted? | Metadata only: timings, event types, error codes, request IDs, and lifecycle state. | Enables debugging without retaining audio, transcript, or translation content. |
| 39 | What timing metadata should entries have? | Relative elapsed timestamps. | Helps users orient themselves without storing wall-clock meeting identity. |
| 40 | What accessibility baseline is required? | Keyboard operation, announced status changes, readable sizing, and practical contrast. | Covers essential usability without delaying the MVP for a formal accessibility audit. |
| 41 | Can users choose a microphone? | Yes; provide a device picker. | Supports external microphones and conference-room audio sources. |
| 42 | Can the mode change during a session? | No; stop and start a new session. | Keeps the audio source stable and simplifies stream teardown and recovery. |
| 43 | Is transcript export required? | Copy visible text only. | Provides immediate utility without adding files, accounts, or persistent history. |
| 44 | Who is the primary user? | A bilingual meeting participant. | Focuses the UI on following and participating, not administration. |
| 45 | What is the first acceptance scenario? | Two-person bilingual conversation. | Gives the MVP a concrete, lower-complexity conversational test case. |
| 46 | Which Mandarin output script is required? | Simplified Chinese. | Establishes one consistent output standard for the first oracle set. |
| 47 | What happens when online capture is unsupported? | Explain the limitation and block Online mode; keep microphone mode available. | Prevents the app from silently processing the wrong audio source. |
| 48 | What language should the UI use? | English and Chinese. | Makes the interface usable for the intended bilingual audience. |
| 49 | How is UI language selected? | Manual English/中文 toggle backed by static translations. | Makes language choice explicit and avoids unpredictable automatic detection. |
| 50 | Which Chinese script should the UI use? | Simplified Chinese. | Aligns interface terminology with the MVP translation output. |
| 51 | What server interface shape is required? | REST setup/health endpoints plus one WebSocket session channel. | Keeps setup and diagnostics simple while using WebSocket for runtime streaming. |
| 52 | How are anonymous sessions isolated? | Server-created opaque short-lived session token required for WebSocket connection. | Provides explicit lifecycle and isolation without requiring accounts. |
| 53 | How are runtime messages represented? | Versioned, discriminated JSON events. | Makes client/server evolution and validation safer than ad-hoc messages. |
| 54 | Where is audio normalized? | Client AudioWorklet converts audio to mono 24 kHz PCM. | Keeps the server media path thin and matches the selected Realtime input path. |
| 55 | What does Online mode capture? | Selected meeting tab audio plus local microphone, mixed into one stream. | Supports two-way use rather than translating only remote participants. |
| 56 | Which Node server framework is used? | Fastify plus `ws`. | Provides a small explicit REST/WebSocket server with TypeScript support. |
| 57 | Which React tooling is used? | Vite + React + TypeScript. | Gives a minimal, fast browser client setup. |
| 58 | How is the UI styled? | Plain CSS with design tokens. | Keeps dependencies low and makes the live transcript layout easy to tune. |
| 59 | How is client state managed? | Typed reducer plus context. | Makes lifecycle transitions explicit without adding a state library. |
| 60 | Where does server session state live? | In-memory per process. | Matches ephemeral behavior and avoids database/infrastructure work. |
| 61 | Which mode is selected initially? | In-person microphone. | It is the most broadly available capture path; Online remains explicit. |
| 62 | How does transcript scrolling work? | Auto-scroll by default, pause when the user scrolls up, with return-to-live control. | Keeps the newest translation visible without preventing review of earlier entries. |
| 63 | How many prior entries are translation context? | Previous three finalized source entries. | Provides local continuity while bounding latency, cost, and exposure. |
| 64 | What translation style is required? | Natural, faithful meeting language. | Preserves meaning and intent without turning translation into summarization. |
| 65 | What does Copy transcript copy? | Relative timestamp plus source/translation pairs. | Produces a useful bilingual record without persistent storage. |
| 66 | Is cloud processing acceptable? | Yes, with explicit disclosure and no app-side retention. | Allows the selected real-time cloud architecture while preserving the privacy boundary. |
| 67 | What model trade-off should guide translation model selection? | Balanced quality, latency, and cost. | Meets the quality and latency goals without prematurely optimizing for maximum cost or minimum quality. |

## Deferred scope

- Raw audio recording.
- Persistent transcript history.
- Multi-user collaboration.
- Accounts and authentication.
- Advanced meeting management.
- True no-internet/on-device processing.
- Zoom/Teams/Meet-specific integrations.
- Speaker diarization and labels.
- Translated speech output.
- Traditional Chinese output.
- Firefox/Safari guarantees.
- Formal WCAG 2.2 AA certification.

## Recording and session-log status

The current coding-agent environment does not expose a session-log export facility. The question-and-decision history is therefore preserved in this file and in the README decision appendix.
