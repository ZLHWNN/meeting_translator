# Frontend Agent Instructions

These instructions apply to `client/`. Read the repository root [`CLAUDE.md`](../CLAUDE.md) first; this file is the frontend-specific guidance.

## Frontend references

Before changing frontend behavior, read the relevant documents:

- [`docs/00-base/P1-intent/PRD.md`](../docs/00-base/P1-intent/PRD.md)
- [`docs/00-base/P2-design/frontend/design/frontend-tech-design.md`](../docs/00-base/P2-design/frontend/design/frontend-tech-design.md)
- [`docs/00-base/P2-design/frontend/design/user-flow.html`](../docs/00-base/P2-design/frontend/design/user-flow.html)
- [`docs/00-base/P2-design/frontend/design/ux-ui-prototype.html`](../docs/00-base/P2-design/frontend/design/ux-ui-prototype.html)
- [`docs/00-base/P2-design/frontend/adr/001-bilingual-live-session-ui.md`](../docs/00-base/P2-design/frontend/adr/001-bilingual-live-session-ui.md)
- [`docs/00-base/P2-design/frontend/adr/002-session-review-export-proposal.md`](../docs/00-base/P2-design/frontend/adr/002-session-review-export-proposal.md)
- [`docs/00-base/P2-design/frontend/impl-plans/01-client-shell-and-capture.md`](../docs/00-base/P2-design/frontend/impl-plans/01-client-shell-and-capture.md)
- [`docs/00-base/P2-design/frontend/impl-plans/02-transcript-session-ui.md`](../docs/00-base/P2-design/frontend/impl-plans/02-transcript-session-ui.md)
- [`docs/00-base/P2-design/frontend/test-plan.md`](../docs/00-base/P2-design/frontend/test-plan.md)
- [`planning/phase-3-live-observations.md`](../planning/phase-3-live-observations.md)

## Frontend boundaries

- Keep the app desktop Chrome/Edge focused. Online mode uses browser tab audio plus the selected microphone; unsupported capture must be explained visibly.
- Keep API keys and provider calls out of browser code. The browser communicates with the server protocol only.
- Preserve the audio pipeline contract: mono signed 16-bit PCM at 24 kHz, 20 ms frames, client VAD boundaries, and backpressure pause/resume behavior.
- Preserve the session lifecycle and WebSocket handshake defined by the shared protocol. Keep controls, acknowledgements, and visible state aligned.
- Keep interim source text separate from finalized entries. Finalized entries need stable IDs, must not duplicate, and direction changes apply only to future utterances.
- Update translations by stable entry ID; investigate duplicate, delayed, out-of-order, or visually overlapping results before changing the state model.
- Preserve source text when translation fails. Retry finalized source text/context without replaying audio.
- Keep transcript scrolling, return-to-live behavior, keyboard access, status announcements, readable contrast, and English/Simplified Chinese labels intact.
- Do not add recording, persistent history, collaboration, or advanced meeting management to the MVP. The ended-session review/export flow is currently a proposal, not implemented behavior.

## Frontend verification

For capture, reducer, or UI changes, run from the repository root:

```bash
npm run typecheck
npm test
npm run build
```

For browser behavior, record whether the test used mocks or a credentialed Gemini/OpenAI provider. Keep live latency and rendering findings in [`planning/phase-3-live-observations.md`](../planning/phase-3-live-observations.md) and acceptance results in [`docs/00-base/P4-review/metrics.md`](../docs/00-base/P4-review/metrics.md).
