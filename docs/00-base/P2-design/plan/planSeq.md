# Meeting Translator — P3 Build Plan

Status: Active — P3 Wave 5 hardening  
Source: P2 design artifacts and P1 success criteria

## Build rules

- P2 human authorization to begin implementation was recorded in `docs/00-base/STATE.md` on 2026-07-26.
- Test author and implementation author are separate work units where practical.
- A wave may touch only files assigned to it; cross-wave dependencies are explicit.
- Audio and provider behavior is tested through adapters and fixtures before live evaluation.
- No implementation introduces persistence, accounts, recording, or deferred features.

## Wave schedule

| Wave | Scope | Size | Dependencies | Owned files / areas | Verification |
|---|---|---:|---|---|---|
| 1 | Repository/tooling, shared types, REST session creation, authenticated WebSocket protocol skeleton | M | None | `package.json`, `client/src/protocol/**`, `server/src/http/**`, `server/src/session/**`, `shared/protocol/**` | Typecheck, health/session contract tests, subprotocol auth, schema validation, close-code tests |
| 2 | Browser capture, tab-audio validation, client VAD, and AudioWorklet normalization/backpressure | L | Wave 1 | `client/src/capture/**`, `client/src/audio/**` | Chrome/Edge manual capture, no-audio-track/track-ended tests, PCM/VAD/backpressure fixtures |
| 3 | Provider adapters, manual commit pipeline, keyed event reconciliation, finalized-entry translation, disconnect retry | L | Waves 1–2 | `server/src/providers/**`, `server/src/session/**`, `server/src/translation/**` | Mock provider contract tests, `item_id` ordering, commit/flush, retry-with-source tests |
| 4 | Bilingual session UI and accessibility behavior | M | Wave 1; can use mocked events before Wave 3 | `client/src/ui/**`, `client/src/state/**`, `client/src/i18n/**` | Reducer tests, UI states, keyboard/status checks, copy/scroll/retry tests |
| 5 | End-to-end integration, fixed oracle evaluation, privacy/retention disclosure, hardening | M | Waves 2–4 | `tests/oracle/**`, `docs/00-base/P4-review/**` | SC1–SC13, Chrome/Edge live tests, p50/p95 latency, human oracle review, provider-control record |

## File ownership map

| Area | Owner in P3 | No other wave may edit concurrently |
|---|---|---|
| `client/src/capture/**` | Capture implementation | Yes |
| `client/src/audio/**` | Worklet, VAD, mixer, backpressure | Yes |
| `client/src/state/**` | Client state implementation | Yes |
| `client/src/ui/**` | UI implementation | Yes |
| `client/src/i18n/**` | Localization strings | Yes |
| `server/src/session/**` | Session/WebSocket implementation | Yes |
| `server/src/providers/**` | Provider adapters | Yes |
| `shared/protocol/**` | Shared protocol types and schemas | Wave 1 only, then change-controlled |
| `tests/**` | Test fixtures and integration tests | Dedicated test work only |

## Gate sequence

1. Wave 1 must pass before capture work begins.
2. Wave 2 must prove both source modes produce the same normalized frame contract.
3. Wave 3 must pass mock provider tests before live credentials are used.
4. Wave 4 must pass state/UI tests before integration hardening.
5. Wave 5 must pass the full acceptance matrix, fixed oracle review, privacy disclosure review, and live latency evaluation before P4.
