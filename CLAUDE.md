# Meeting Translator Agent Instructions

These instructions apply to the whole repository. `CLAUDE.md` is the project guidance file; treat it as equivalent to `AGENT.md`.

## Project purpose

Meeting Translator is a desktop Chrome/Edge web application for English ↔ Simplified Chinese translation during in-person and online meetings. The current MVP captures microphone or browser-tab audio, transcribes speech, translates finalized utterances, and displays source and translation together.

Before changing product scope, read [`docs/00-base/P1-intent/PRD.md`](docs/00-base/P1-intent/PRD.md). Recording, persistent history, multi-user collaboration, advanced meeting management, speaker diarization, translated speech playback, and true offline/on-device processing are deferred unless the user explicitly reopens those decisions.

## Required context before implementation

Read the closest `CLAUDE.md` before editing code. For cross-cutting work, also read:

- [`README.md`](README.md) for setup, repository layout, demo evidence, trade-offs, and known weaknesses.
- [`docs/00-base/STATE.md`](docs/00-base/STATE.md) for append-only state and verification history.
- [`planning/standing-team-workflow-analysis.md`](planning/standing-team-workflow-analysis.md) for the four-phase workflow and required artifacts.
- [`planning/phase-1-grilling-decision-log.md`](planning/phase-1-grilling-decision-log.md) for product questions, decisions, and reasons.
- [`planning/phase-2-design-decision-log.md`](planning/phase-2-design-decision-log.md) and [`docs/00-base/P2-design/plan/planSeq.md`](docs/00-base/P2-design/plan/planSeq.md) for design and implementation boundaries.
- [`planning/phase-3-kickoff.md`](planning/phase-3-kickoff.md) and [`planning/phase-3-live-observations.md`](planning/phase-3-live-observations.md) for implementation status and open live-provider findings.

## Engineering rules

- Make the smallest change that satisfies the request. Do not add speculative features or refactor unrelated code.
- State assumptions and identify unresolved product decisions before implementation.
- Keep planning notes, handoffs, task breakdowns, and agent-generated plans in `planning/`.
- Preserve `docs/00-base/STATE.md` as append-only. Add a dated record; do not rewrite earlier state entries.
- Keep provider API keys server-side. Never log, commit, paste, or expose `.env` secrets. Use `.env.example` for safe configuration documentation.
- Do not write audio, transcript text, or translation content to application logs.
- Preserve the ephemeral-session boundary unless the user explicitly approves a new retention design.
- Keep OpenAI and Gemini provider-specific behavior behind provider adapters and preserve the provider-neutral coordinator contract.
- Update the relevant design, planning, state, or review document when behavior or a decision changes.
- Prefer tests that reproduce a bug before fixing it, then run the relevant verification commands.

## Verification

From the repository root:

```bash
npm run typecheck
npm test
npm run build
```

Run the server with `npm start`, which launches the current compiled server from `dist-ts/server/src/main.js` and loads `.env` when present. Run the Vite client separately with `npm run dev`.

Do not edit `dist/`, `dist-ts/`, or `node_modules/`; they are generated or installed content. Edit source files under `client/`, `server/`, and `shared/`.

## Handoff requirements

When work is complete, report changed files, tests/build results, unresolved risks, and documentation/state records updated. If a live provider or browser test was not run, say so explicitly and never present mock-provider evidence as production-provider validation.
