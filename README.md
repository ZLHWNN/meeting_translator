# Meeting Translator

Meeting Translator is a planned desktop web application for live English ↔ Simplified Chinese translation in in-person and online meetings.

Current status: P3 implementation is built through provider integration, bilingual UI, and local hardening. Credentialed live-provider and Chrome/Edge acceptance runs remain before the P4 review gate.

## What is currently built

- The four-phase workflow analysis: [`planning/standing-team-workflow-analysis.md`](planning/standing-team-workflow-analysis.md). (Was prevously used in claude have not migrate to Codex)
- The complete Phase 1 grilling record: [`planning/phase-1-grilling-decision-log.md`](planning/phase-1-grilling-decision-log.md).
- The feature index: [`docs/INDEX.md`](docs/INDEX.md).
- The draft frozen-intent PRD: [`docs/00-base/P1-intent/PRD.md`](docs/00-base/P1-intent/PRD.md).
- The feature state ledger: [`docs/00-base/STATE.md`](docs/00-base/STATE.md).
- The complete P2 design decision log: [`planning/phase-2-design-decision-log.md`](planning/phase-2-design-decision-log.md).
- The append-only feature state and review status: [`docs/00-base/STATE.md`](docs/00-base/STATE.md).
- The complete Sol review report: [`planning/phase-2-sol-review.md`](planning/phase-2-sol-review.md).
- The second-review findings and final verification trail: [`planning/phase-2-sol-fix-verification.md`](planning/phase-2-sol-fix-verification.md).
- The fixed translation oracle and human-review rubric: [`docs/00-base/P2-design/backend/test-fixtures/translation-oracle.yaml`](docs/00-base/P2-design/backend/test-fixtures/translation-oracle.yaml), [`docs/00-base/P2-design/backend/test-fixtures/oracle-review-rubric.md`](docs/00-base/P2-design/backend/test-fixtures/oracle-review-rubric.md).
- The P2 UX prototype and user flow: [`docs/00-base/P2-design/frontend/design/ux-ui-prototype.html`](docs/00-base/P2-design/frontend/design/ux-ui-prototype.html), [`docs/00-base/P2-design/frontend/design/user-flow.html`](docs/00-base/P2-design/frontend/design/user-flow.html).
- The P2 technical designs and API contract: [`docs/00-base/P2-design/frontend/design/frontend-tech-design.md`](docs/00-base/P2-design/frontend/design/frontend-tech-design.md), [`docs/00-base/P2-design/backend/design/backend-tech-design.md`](docs/00-base/P2-design/backend/design/backend-tech-design.md), [`docs/00-base/P2-design/backend/design/api-contract.yaml`](docs/00-base/P2-design/backend/design/api-contract.yaml).
- The P3 build plan and test plans: [`docs/00-base/P2-design/plan/planSeq.md`](docs/00-base/P2-design/plan/planSeq.md), [`docs/00-base/P2-design/frontend/test-plan.md`](docs/00-base/P2-design/frontend/test-plan.md), [`docs/00-base/P2-design/backend/test-plan.md`](docs/00-base/P2-design/backend/test-plan.md).
- The normative WebSocket state machine and protocol schema: [`docs/00-base/P2-design/backend/design/protocol-state-machine.md`](docs/00-base/P2-design/backend/design/protocol-state-machine.md), [`docs/00-base/P2-design/backend/design/websocket-protocol.schema.json`](docs/00-base/P2-design/backend/design/websocket-protocol.schema.json).
- The P3 kickoff and deferred hardening record: [`planning/phase-3-kickoff.md`](planning/phase-3-kickoff.md).
- The P4 acceptance metrics template: [`docs/00-base/P4-review/metrics.md`](docs/00-base/P4-review/metrics.md).
- The P3 Wave 1 transport foundation, Wave 2 capture primitives, and Wave 3 provider-neutral coordinator under [`server/`](server/) and [`client/`](client/).
- The Gemini free-tier provider path: Gemini Live streaming transcription plus Gemini text translation.

## Repository layout

```text
client/                 Browser application and meeting interaction flow
  src/audio/             AudioWorklet capture, PCM conversion, VAD, backpressure
  src/capture/           Microphone and online browser-tab capture
  src/protocol/          Browser WebSocket messages and authentication protocols
  src/state/             Client session reducer and lifecycle state
  src/ui/                React interface, transcript display, controls, and styles
server/                 Node/Fastify backend and provider orchestration
  src/http/               Health and session-creation endpoints
  src/providers/          OpenAI, Gemini, mock, transcription, and translation adapters
  src/session/            Session store, WebSocket lifecycle, and utterance coordinator
shared/                  Types shared between client and server
docs/                    Product requirements, design, ADRs, test plans, state, and P4 review
planning/                Phase notes, grilling decisions, reviews, handoffs, and live findings
tests/                   Acceptance and latency procedures
index.html               Vite application entry HTML
package.json             Scripts and dependencies
tsconfig.json             TypeScript compiler configuration
vite.config.ts            Vite development and production configuration
.env.example              Safe environment-variable template
.env                     Local runtime configuration; never place API keys in the public repository
```

`dist-ts/` contains compiled TypeScript server/client output and `dist/` contains the production Vite bundle. Both are generated by `npm run build` and ignored by Git; edit the source files instead. `node_modules/` is installed dependency content and is also ignored.

## How to run

Install dependencies and configure `.env` from [`.env.example`](.env.example). For the Gemini path, create an API key in [Google AI Studio's API keys page](https://aistudio.google.com/app/apikey). Google documents this setup in the [Gemini getting-started guide](https://ai.google.dev/gemini-api/docs/get-started). Keep the key server-side and never paste it into the browser or commit it to Git.

Create a file named `.env` in the repository root and add:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_TRANSLATION_MODEL=gemini-3.1-flash-lite
```

The `.env` file is ignored by Git. `GEMINI_API_KEY` enables Gemini Live transcription and Gemini text translation. OpenAI remains supported through `OPENAI_API_KEY` and `OPENAI_TRANSLATION_MODEL`. Gemini takes precedence when both keys are present; when neither provider is configured, deterministic mock providers are used. Then run the API server and Vite client in separate terminals:

```sh
npm install
npm run typecheck
npm test
```

Terminal 1: `npm run build && npm start`  
Terminal 2: `npm run dev`

`npm start` runs `node --env-file-if-exists=.env dist-ts/server/src/main.js`. If `.env` is guaranteed to exist, the equivalent direct command is `node --env-file=.env dist-ts/server/src/main.js`.

Open `http://localhost:5173`. `npm start` loads `.env` when present. Without provider credentials, the server starts with deterministic mock providers for protocol testing; live transcription requires configured Gemini or OpenAI variables. The server listens on `http://127.0.0.1:3000`.

If Gemini reports `Gemini Live socket closed before session setup completed`, rebuild and restart so the current server output is running:

```bash
npm run build
npm start
```

The error now includes Gemini's WebSocket close code and reason. Share only that diagnostic text when troubleshooting; never share `GEMINI_API_KEY`.

## Demo guide and evidence map

Use this checklist to explain the project during a demo. The linked files contain the supporting evidence and decision history.

### What the project does

Demonstrate in-person microphone capture, online browser-tab plus microphone capture, English ↔ Simplified Chinese translation, interim source text, finalized translations, direction switching, pause/resume, retry, and copy. The implementation summary is in this README and the product scope is defined in [`docs/00-base/P1-intent/PRD.md`](docs/00-base/P1-intent/PRD.md).

### What AI tools and coding agents were used

- Codex coding agent: repository exploration, implementation, testing, debugging, and documentation.
- Grilling workflow: Phase 1 requirements questioning and decision capture in [`planning/phase-1-grilling-decision-log.md`](planning/phase-1-grilling-decision-log.md).
- Sol review agent: adversarial Phase 2 design review and fix verification in [`planning/phase-2-sol-review.md`](planning/phase-2-sol-review.md) and [`planning/phase-2-sol-fix-verification.md`](planning/phase-2-sol-fix-verification.md).
- Gemini: runtime provider for live transcription and text translation; it is an application dependency, not the coding agent.

### How the agent helped plan, implement, debug, and refactor

- The four-phase workflow and required artifacts are recorded in [`planning/standing-team-workflow-analysis.md`](planning/standing-team-workflow-analysis.md).
- Requirements grilling, questions, decisions, and reasons are recorded in [`planning/phase-1-grilling-decision-log.md`](planning/phase-1-grilling-decision-log.md).
- Architecture, implementation waves, and test planning are recorded in [`planning/phase-2-design-decision-log.md`](planning/phase-2-design-decision-log.md), [`docs/00-base/P2-design/plan/planSeq.md`](docs/00-base/P2-design/plan/planSeq.md), and the frontend/backend test plans.
- Implementation handoffs, provider integration, acceptance work, and live findings are recorded in [`planning/phase-3-kickoff.md`](planning/phase-3-kickoff.md) and [`planning/phase-3-live-observations.md`](planning/phase-3-live-observations.md).
- Append-only state transitions and verification evidence are recorded in [`docs/00-base/STATE.md`](docs/00-base/STATE.md).

### Features added and bugs fixed

- Added shared REST/WebSocket session protocol, microphone and online tab capture, AudioWorklet PCM normalization, client VAD, backpressure handling, bilingual UI, transcript navigation, translation retry, and copy.
- Added OpenAI provider adapters and a Gemini free-tier provider path.
- Fixed the OpenAI Realtime session/transcription model mix-up; details are in [`docs/00-base/STATE.md`](docs/00-base/STATE.md) and [`planning/phase-3-kickoff.md`](planning/phase-3-kickoff.md).
- Fixed the stale `dist/server` runtime path so `npm start` uses the current `dist-ts` build.
- Fixed the `commit_in_flight` lifecycle and provider acknowledgement race.
- Fixed the Gemini Live setup payload field placement and added close-code diagnostics.

The detailed implementation and verification trail is maintained in [`docs/00-base/STATE.md`](docs/00-base/STATE.md), [`planning/phase-3-kickoff.md`](planning/phase-3-kickoff.md), and [`planning/phase-3-live-observations.md`](planning/phase-3-live-observations.md).

### What was cut or simplified

Recording, persistent history, multi-user collaboration, advanced meeting management, platform-specific integrations, speaker diarization, translated speech playback, Traditional Chinese, true offline/on-device processing, and accounts were deferred. The rationale is documented in the [Trade-offs](#trade-offs) section and the frozen PRD.

### Weakest part and next improvement

The weakest part is the live-provider experience: transcription/translation can arrive in large chunks, and a translation may cover or replace an earlier result. The next improvement is to measure capture, VAD, provider transcription, and translation timing separately, then verify stable entry IDs and long-text layout behavior. The findings are recorded in [`planning/phase-3-live-observations.md`](planning/phase-3-live-observations.md) and [`docs/00-base/P4-review/metrics.md`](docs/00-base/P4-review/metrics.md).

The next product improvement is an ended-meeting review state: Stop should end capture, drain pending work, retain the bilingual report in memory, and offer local export or explicit exit/discard. This proposal is documented in [`docs/00-base/P2-design/frontend/adr/002-session-review-export-proposal.md`](docs/00-base/P2-design/frontend/adr/002-session-review-export-proposal.md); it is not implemented yet.

## Planned MVP

The MVP will be a desktop Chrome/Edge web app with:

- In-person microphone capture.
- Online browser-tab audio plus local microphone capture.
- English ↔ Mandarin translation with Simplified Chinese output.
- Interim source transcription and finalized translated text.
- English/中文 UI toggle.
- Start, pause, resume, stop, retry, and copy controls.
- Ephemeral sessions up to 60 minutes with no accounts or stored meeting content.

Deferred features include recording, persistent history, multi-user collaboration, advanced meeting management, true offline processing, platform-specific integrations, speaker labels, translated speech, and Traditional Chinese output.

## Trade-offs

- Browser capture instead of platform integrations keeps the first online path small, but guarantees only Chrome and Edge desktop behavior.
- Cloud processing provides practical real-time quality, but requires explicit consent and server-side credentials.
- Ephemeral state improves privacy and reduces infrastructure, but refreshes, tab closes, and server restarts can lose the active transcript.
- A two-step transcription → translation pipeline makes the source visible and testable, but may add latency compared with direct speech translation.
- No diarization keeps the MVP simple, but overlapping speech is best effort.
- A 60-minute session limit bounds cost and recovery complexity.
- The balanced quality/latency/cost model choice will be validated against the current official provider documentation and the bilingual oracle set in P2.
- The P2 fix pass selects `gpt-realtime-whisper`, manual client VAD commits, authenticated WebSocket subprotocols, client-side translation retry after reconnect, and a fixed 20-case oracle rubric.
- The app’s “no retention” promise applies to application storage; provider-side retention and controls are disclosed separately.
- Gemini is included as a free-tier testing path, but its preview Live API model, quotas, audio format, and transcript event behavior are provider-specific and remain subject to manual acceptance.

## Prototype-first decision

The next validation step is a zero-configuration prototype. It will validate the meeting-mode selection, microphone/tab capture flow, bilingual UI, session controls, transcript layout, and error states using deterministic mock transcript/translation data. Cloud providers and installed local models are deferred until the prototype flow is confirmed.

### Current live-validation findings

The first Gemini browser run showed that transcription/translation can arrive in large chunks rather than feeling continuously live, and that a translated result may cover or replace a previous result. These remain open validation findings; the next review must separate provider/capture latency from UI entry identity and layout behavior.

The requested Stop improvement is recorded as a proposed ended-session review flow: stop capture, drain pending work, keep the completed bilingual report visible, then offer local export or explicit exit/discard. No application change has been made for this request. See [`planning/phase-3-live-observations.md`](planning/phase-3-live-observations.md).

Browser-native speech recognition may be explored as an optional prototype enhancement, but it is not treated as a production dependency because browser support and on-device language-pack availability vary. The prototype must not present mock output as production-quality meeting translation.

## Phase 2 design record

P2 confirms the following implementation boundaries:

- React/Vite/TypeScript client; Fastify/`ws` Node server.
- REST session creation and health check; one versioned WebSocket for controls, live events, and binary PCM.
- Client AudioWorklet produces mono signed 16-bit PCM at 24 kHz.
- Online mode mixes selected tab audio and microphone in the browser.
- OpenAI Realtime transcription maps interim deltas and completed events; only finalized text enters the translation adapter.
- Translation receives the current source utterance plus the previous three finalized source entries.
- Active session state is in-memory only; no database is introduced.
- P3 work is split into five waves with explicit file ownership in `planSeq.md`.

The design references the current official Realtime API contract for `input_audio_buffer.append`, 24 kHz PCM, interim/final transcription events, VAD, and provider errors:

- [OpenAI Realtime API reference](https://platform.openai.com/docs/api-reference/realtime?lang=javascript)
- [OpenAI Realtime client events](https://platform.openai.com/docs/api-reference/realtime-client-events?lang=node.js)
- [OpenAI Realtime server events](https://platform.openai.com/docs/api-reference/realtime-server-events/input_audio_buffer/committed?lang=node)

## Complete Phase 1 grilling decision appendix

The following records every question asked during Phase 1, the decision selected, and why it was selected. The planning copy is the canonical detailed record; this appendix is intentionally kept here because the project requirement asks the README to preserve the full decision history.

| # | Question | Decision | Why |
|---:|---|---|---|
| 1 | What is the core product promise? | Translate both in-person and online meeting speech in near real time. | Covers the requested meeting contexts while keeping translation as the core value. |
| 2 | What does online support mean? | Browser tab-audio capture, without platform integrations. | Simpler than integrating separately with Zoom, Teams, or Meet. |
| 3 | What output is required? | Live translated text. | Validates the main workflow without speech-synthesis complexity. |
| 4 | Which languages first? | English ↔ Mandarin. | Makes quality and latency measurable. |
| 5 | What does offline mean? | In-person with internet available. | Avoids the much larger local-model requirement. |
| 6 | Privacy default? | Ephemeral processing and active-session text only. | Reduces meeting-data exposure and defers recording/history. |
| 7 | Latency target? | Under five seconds after a short utterance. | Practical live target without overconstraining the first build. |
| 8 | Conversation model? | Manual two-way direction toggle. | More predictable than automatic language detection. |
| 9 | Speaker labels? | None. | Avoids diarization complexity and errors. |
| 10 | Display? | Source and translation together. | Makes comparison and error detection possible. |
| 11 | Delivery surface? | Desktop web app. | Best fit for browser capture without packaging work. |
| 12 | Real services or mocks? | Real cloud services behind adapters. | Validates actual quality and latency while preserving replaceability. |
| 13 | Provider direction? | OpenAI-first with adapters. | Gives a concrete first provider without permanent coupling. |
| 14 | Browser guarantee? | Chrome/Edge desktop. | Most predictable Chromium capture behavior. |
| 15 | Accounts? | No account. | Keeps the ephemeral MVP simple and low-friction. |
| 16 | Failure behavior? | Visible error, preserve memory, retry. | Avoids silent loss while keeping recovery explicit. |
| 17 | Consent? | Preflight cloud-processing acknowledgement. | Makes audio processing disclosure explicit before permissions. |
| 18 | Controls? | Start, pause, resume, stop. | User control without advanced meeting management. |
| 19 | Meeting mode selection? | Explicit In-person and Online modes. | Prevents ambiguous capture permissions. |
| 20 | Processing pipeline? | Speech-to-text then text translation. | Preserves source text and separates testable stages. |
| 21 | Interim results? | Interim source; finalized translation only. | Responsive without unstable translation flicker. |
| 22 | Direction toggle timing? | Next finalized utterance. | Keeps earlier entries stable. |
| 23 | Quality validation? | Oracle set plus human review. | More realistic than brittle exact-string tests. |
| 24 | Content domain? | General business meetings. | Covers updates, decisions, dates, numbers, and actions. |
| 25 | Overlap? | Best effort, documented limitation. | Avoids requiring speaker separation in the MVP. |
| 26 | Session length? | 60 minutes. | Covers typical meetings while bounding resources. |
| 27 | Refresh behavior? | Active transcript may be lost. | Preserves the ephemeral privacy boundary. |
| 28 | Application stack? | React/TypeScript plus Node. | Fits browser media and typed streaming. |
| 29 | Transport? | WebSocket event stream. | Supports bidirectional audio and live events. |
| 30 | Credential boundary? | Server-held provider key. | Never exposes secrets in the browser. |
| 31 | Deployment? | Local development first. | Validates capture before hosting decisions. |
| 32 | External-service testing? | Mock contracts plus manual live tests. | Deterministic automation plus real quality checks. |
| 33 | Shared pipeline? | Normalize both modes into one pipeline. | Avoids duplicated translation behavior. |
| 34 | OpenAI audio path? | Realtime transcription session. | Best fit for interim events and latency. |
| 35 | Translation stage? | Constrained OpenAI text model. | Supports natural faithful translation with preserved terms. |
| 36 | Context? | Small rolling context. | Helps references without sending the full meeting. |
| 37 | Translation failure? | Keep source and retry translation. | Preserves content without retransmitting audio. |
| 38 | Diagnostics? | Metadata only. | Enables debugging without content retention. |
| 39 | Entry timestamps? | Relative elapsed time. | Useful orientation without wall-clock identity. |
| 40 | Accessibility? | Keyboard, announced status, readable contrast/sizing. | Covers essential usability for MVP. |
| 41 | Microphone selection? | Device picker. | Supports external and conference-room microphones. |
| 42 | Mode switching? | Stop and start a new session. | Keeps source state stable and simpler. |
| 43 | Export? | Copy visible text only. | Adds utility without persistence or files. |
| 44 | Primary user? | Bilingual meeting participant. | Focuses on participation rather than administration. |
| 45 | Primary scenario? | Two-person bilingual conversation. | Concrete and lower complexity for first acceptance. |
| 46 | Mandarin script? | Simplified Chinese. | One consistent first output standard. |
| 47 | Unsupported capture? | Explain and block Online mode. | Prevents silently translating the wrong source. |
| 48 | UI language? | English and Chinese. | Matches the bilingual audience. |
| 49 | UI selection? | Manual static English/中文 toggle. | Explicit and predictable. |
| 50 | UI Chinese script? | Simplified Chinese. | Aligns UI and output terminology. |
| 51 | Server interface? | REST setup/health plus WebSocket session. | Simple setup with streaming runtime. |
| 52 | Session isolation? | Opaque server-created short-lived token. | Anonymous sessions still need explicit isolation. |
| 53 | Event format? | Versioned typed JSON events. | Safer evolution and validation. |
| 54 | Audio normalization? | Client AudioWorklet to mono 24 kHz PCM. | Keeps server media handling thin and matches Realtime input. |
| 55 | Online sources? | Tab audio plus local microphone. | Enables two-way online conversations. |
| 56 | Node server? | Fastify plus `ws`. | Small explicit REST/WebSocket implementation. |
| 57 | React tooling? | Vite + React + TypeScript. | Minimal fast client setup. |
| 58 | Styling? | Plain CSS with design tokens. | Low dependency cost and easy layout tuning. |
| 59 | Client state? | Typed reducer plus context. | Explicit lifecycle without another dependency. |
| 60 | Server state? | In-memory per process. | Matches ephemeral scope without database work. |
| 61 | Default mode? | In-person microphone. | Broadest capture availability. |
| 62 | Scrolling? | Auto-scroll with pause and return-to-live. | Keeps current output visible while allowing review. |
| 63 | Context bound? | Previous three finalized entries. | Local continuity with bounded cost and latency. |
| 64 | Translation style? | Natural faithful meeting language. | Preserves meaning without summarizing. |
| 65 | Copy format? | Timestamped source/translation pairs. | Useful bilingual clipboard output. |
| 66 | Cloud processing acceptable? | Yes, with disclosure and no app retention. | Enables practical live processing within the privacy boundary. |
| 67 | Model trade-off? | Balanced quality, latency, and cost. | Avoids premature maximum-cost or minimum-quality optimization. |

## Documentation and session logs

Planning notes, handoffs, task breakdowns, and agent-generated plans belong in [`planning/`](planning/). The current environment does not expose a coding-agent session-log export facility, so the decision and planning records are preserved in the repository instead.

The repository documentation is sufficient for project continuity and decision auditing, but it is not a verbatim session export. It preserves the Phase 1 grilling questions, selected decisions and reasons, Phase 2 design and review findings, append-only state transitions, Phase 3 implementation handoffs, and test/build/runtime evidence. The main records are [`planning/phase-1-grilling-decision-log.md`](planning/phase-1-grilling-decision-log.md), [`planning/phase-2-design-decision-log.md`](planning/phase-2-design-decision-log.md), [`planning/phase-2-sol-review.md`](planning/phase-2-sol-review.md), [`planning/phase-2-sol-fix-verification.md`](planning/phase-2-sol-fix-verification.md), [`planning/phase-3-kickoff.md`](planning/phase-3-kickoff.md), and [`docs/00-base/STATE.md`](docs/00-base/STATE.md).

No raw session log is currently available under `.agents/` or `.codex/`. Therefore, the repository does not include the complete turn-by-turn conversation, raw tool calls and outputs, all intermediate commentary, or full subagent transcripts; subagent findings and recommendations are recorded instead.
