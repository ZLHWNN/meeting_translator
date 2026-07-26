# Backend Agent Instructions

These instructions apply to `server/`. Read the repository root [`CLAUDE.md`](../CLAUDE.md) first; this file is the backend-specific guidance.

## Backend references

Before changing backend behavior, read the relevant documents:

- [`docs/00-base/P2-design/backend/design/backend-tech-design.md`](../docs/00-base/P2-design/backend/design/backend-tech-design.md)
- [`docs/00-base/P2-design/backend/design/api-contract.yaml`](../docs/00-base/P2-design/backend/design/api-contract.yaml)
- [`docs/00-base/P2-design/backend/design/protocol-state-machine.md`](../docs/00-base/P2-design/backend/design/protocol-state-machine.md)
- [`docs/00-base/P2-design/backend/design/websocket-protocol.schema.json`](../docs/00-base/P2-design/backend/design/websocket-protocol.schema.json)
- [`docs/00-base/P2-design/backend/adr/001-ephemeral-session-stream.md`](../docs/00-base/P2-design/backend/adr/001-ephemeral-session-stream.md)
- [`docs/00-base/P2-design/backend/adr/002-openai-realtime-transcription.md`](../docs/00-base/P2-design/backend/adr/002-openai-realtime-transcription.md)
- [`docs/00-base/P2-design/backend/impl-plans/01-session-and-protocol.md`](../docs/00-base/P2-design/backend/impl-plans/01-session-and-protocol.md)
- [`docs/00-base/P2-design/backend/impl-plans/02-provider-pipeline.md`](../docs/00-base/P2-design/backend/impl-plans/02-provider-pipeline.md)
- [`docs/00-base/P2-design/backend/test-plan.md`](../docs/00-base/P2-design/backend/test-plan.md)
- [`docs/00-base/STATE.md`](../docs/00-base/STATE.md)

## Backend boundaries

- Keep sessions in memory and ephemeral. Do not add a database, durable transcript store, or recording path without an explicit product decision.
- Keep provider credentials on the server. Never send API keys to the browser or include them in logs/errors.
- Keep audio, transcript, and translation content out of logs. Metadata-only diagnostics are allowed.
- Preserve the authenticated WebSocket sequence: session creation, `session.ready`, client `hello`, command acknowledgement, state transitions, and cleanup.
- Validate message state, command IDs, session tokens, binary PCM frame size, and close behavior at the protocol boundary.
- Keep transcription and translation separate: finalized source text must remain available when translation fails, and retry must not retransmit audio.
- Keep OpenAI and Gemini details inside provider adapters. The session coordinator must depend on provider-neutral interfaces.
- Preserve commit acknowledgement, provider item binding, event ordering, retry, backpressure, pause, resume, and stop/cleanup behavior.
- Treat Gemini Live as a preview provider with provider-specific model, audio-format, setup-schema, quota, and event-ordering risks. Record live findings in [`planning/phase-3-live-observations.md`](../planning/phase-3-live-observations.md).

## Backend verification

Use focused provider/session tests while iterating, then run from the repository root:

```bash
npm run typecheck
npm test
npm run build
```

For protocol changes, update the shared types/schema and the backend test plan together. For provider changes, add or update adapter contract tests and record live-provider limitations in [`docs/00-base/P4-review/metrics.md`](../docs/00-base/P4-review/metrics.md).
