# Meeting Translator — Phase 2 Design Decision Log

P1 GO: The user explicitly authorized proceeding to Phase 2 on 2026-07-26.

This record captures the design decisions made while producing P2 artifacts. P2 is complete only when the design review and final plan receive explicit human GO.

## Independent review

On 2026-07-26, a read-only `gpt-5.6-sol` mid-effort reviewer (nickname `Pascal`) was spawned to review the P1 intent, PRD, grilling records, and all files under `docs/00-base/P2-design/`. The reviewer is not authorized to edit project files. Its findings will be appended here and linked from `docs/00-base/STATE.md`.

The review completed with `GO-AFTER-FIXES`. Full findings are recorded in [`phase-2-sol-review.md`](phase-2-sol-review.md). P2 is not approved yet.

| Decision | Choice | Rationale |
|---|---|---|
| Client/server boundary | Vite React TypeScript client plus Fastify Node server | Keeps browser capture in the client and provider credentials/media orchestration on the server. |
| Runtime transport | JSON control/event frames plus binary PCM frames over one WebSocket | Controls and state are inspectable; audio avoids JSON/base64 overhead. |
| REST surface | `GET /health`, `POST /v1/sessions` | Provides explicit readiness and short-lived session creation before the stream opens. |
| Session security | Opaque server-created token, no account | Preserves anonymous use while isolating sessions. |
| Session storage | In-memory per process | Matches ephemeral retention and avoids a database. |
| Browser audio | AudioWorklet normalizes to mono signed 16-bit PCM at 24 kHz | Matches the selected Realtime transcription input format and keeps the Node media path thin. |
| Online capture | Mix selected tab audio and microphone in the browser | Supports both remote and local speakers in a two-way conversation. |
| Provider transcription | OpenAI Realtime transcription session | Supplies interim deltas and finalized events for live source text. |
| Turn boundaries | Client VAD with explicit manual `input_audio_buffer.commit`; `turn_detection: null` | Matches the selected transcription model’s documented behavior and gives pause/stop deterministic flush control. |
| Translation | Server-side text-model adapter called only for finalized entries | Separates source transcription from translation and keeps the source visible. |
| Translation context | Current source utterance plus previous three finalized source entries | Improves local references without sending the whole meeting repeatedly. |
| Translation response | Strict internal JSON shape `{translation, sourceLanguage, targetLanguage}` | Makes malformed or extra model output detectable before it reaches the UI. |
| Model selection | Model IDs are environment configuration, validated against current official docs and the oracle set before implementation | Avoids baking a stale provider model name into the product contract. |
| Persistence | No application database or transcript file | Enforces the ephemeral P1 privacy decision. |
| Visual implementation | Plain CSS design tokens | Minimizes dependencies and keeps the prototype close to the implementation target. |
| Client state | Typed reducer/context state machine | Makes permission, capture, socket, pause, and error transitions explicit. |
| P3 waves | Foundation → capture → provider pipeline → transcript UI → integration/evaluation | Separates risky streaming boundaries and prevents overlapping file ownership. |
| Transcription model | `gpt-realtime-whisper` | Current official Realtime transcription guidance identifies it as the streaming speech-to-text model for transcript deltas. |
| Turn finalization | Client VAD plus manual `input_audio_buffer.commit`; `turn_detection: null` | Matches the selected model’s documented streaming behavior and gives pause/stop deterministic flush control. |
| VAD constants | 20 ms frames, 250 ms minimum speech, 650 ms silence commit, 8 s hard segment maximum | Makes utterance boundaries and latency measurements reproducible before live tuning. |
| WebSocket authentication | One-time `mt.token.<sessionToken>` subprotocol alongside selected `mt.v1` | Browser WebSockets cannot send arbitrary auth headers; subprotocol avoids putting the token in a URL. |
| WebSocket sequencing | Server `session.ready` → client `hello` → server `command.ack`; every command has an ID and acknowledgement | Removes handshake/control ambiguity and makes invalid-state behavior testable. |
| Disconnect recovery | New ephemeral session plus client-resubmitted finalized source text/context for translation retry | Preserves source content without retaining server state or retransmitting audio. |
| Event reconciliation | Key interim/final state by client utterance ID and provider `item_id`; order finals by client commit sequence | Handles asynchronous and out-of-order provider events without duplicate or reordered entries. |
| Backpressure | 1 MiB high-water mark pauses capture; 256 KiB low-water mark resumes; 20 ms frames | Prevents silent frame loss during slow networks. |
| Translation oracle | 20 fixed bilingual general-business cases with required meaning elements and critical-error rubric | Makes SC7 reproducible and gives P4 a concrete human review artifact. |
| Latency gate | `utterance.commit` → `translation.completed`, 20 cases, p95 ≤ 5 seconds | Defines exact measurement boundaries and separates retries/failures from primary latency. |
| Provider retention disclosure | Consent distinguishes app non-retention from provider abuse-monitoring retention and records configured controls | Avoids promising zero provider retention when the provider endpoint may retain abuse-monitoring logs. |
| Provider commit binding | Store `{utteranceId, commitSequence}` before sending `input_audio_buffer.commit`; bind the next `input_audio_buffer.committed.item_id` to that pair | Prevents asynchronous provider events from being attributed to the wrong client utterance. |
| PCM frame contract | Exactly 20 ms, mono, 24 kHz, signed 16-bit PCM per binary message: 960 bytes | Makes the media boundary mechanically testable and avoids frame-size ambiguity. |
| Protocol state validity | The state table in `protocol-state-machine.md` is normative; invalid commands receive `accepted:false` with `invalid_state` and do not mutate state | Makes handshake and lifecycle behavior testable rather than descriptive only. |
| Provider backpressure | Monitor the server-to-provider WebSocket queue at 1 MiB/256 KiB and emit a client `backpressure` pause signal; do not silently drop accepted audio | Covers the upstream queue that browser-only buffering cannot observe. |
| Latency run profile | Run all 20 oracle cases once in their declared direction under local Node/client, stable wired or Wi-Fi, no VPN/proxy, provider WebSocket RTT p95 ≤ 200 ms, and report retries separately | Makes the five-second p95 target comparable across acceptance runs. |
| Consent wording | State directly that audio is sent to OpenAI and that default `/v1/realtime` abuse-monitoring logs may be retained up to 30 days; record configured controls separately | Distinguishes app non-retention from provider-side retention. |

## Provider evidence

The official Realtime API reference documents WebSocket communication, 24 kHz PCM input, `input_audio_buffer.append`, manual `input_audio_buffer.commit`, interim transcription delta events, completed transcription events, and provider error events:

- https://platform.openai.com/docs/api-reference/realtime?lang=javascript
- https://platform.openai.com/docs/api-reference/realtime-client-events?lang=node.js
- https://platform.openai.com/docs/api-reference/realtime-server-events/input_audio_buffer/committed?lang=node
