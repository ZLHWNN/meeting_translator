# Standing Team Flow: Four-Phase Analysis

Source: `/home/user/standing-team-flow.html`

## Scope and interpretation

This note extracts the four delivery phases and their durable artifacts. Team creation, standing-team membership, and role assignments are intentionally omitted.

P2 is one phase with two internal gates:

- P2a: design and architecture review.
- P2b: implementation planning and GO approval.

The workflow is evidence-driven: a phase is complete only when its artifacts support the next human gate. The phase ledger and handoff state must be updated at boundaries so work can resume from disk rather than from conversation history.

## Phase 1 — Intent

Purpose: establish what should be built and why before design or implementation.

Process:

1. Grill the product owner until scope, users, constraints, exclusions, edge cases, and success conditions are explicit.
2. Convert the discussion into numbered, deterministic success criteria (`SC1...SCn`).
3. Scaffold the feature documentation tree.
4. Write the PRD and get an explicit human GO.

Outputs:

- `docs/INDEX.md`: project feature list and active-feature marker.
- `docs/<NN-slug>/P1-intent/PRD.md`: frozen scope, goals, exclusions, and success criteria.
- `docs/<NN-slug>/STATE.md`: initial phase/gate status, decisions, ownership, and next action.
- Orchestrator checkpoint in the configured agent-memory location.

Gate: the PRD is frozen only after human approval. A change to intent starts a new intent loop; later phases do not silently rewrite the PRD.

## Phase 2 — Design & Plan

Purpose: turn the frozen intent into an agreed design and an executable, testable build plan.

### P2a — Design and architecture

Produce only the domains the feature needs. Typical artifacts are:

- Frontend design: `ux-ui-prototype.html`, `user-flow.html`, and frontend ADRs.
- Backend design: `backend-tech-design.md`, `system-arch.html`, `api-contract.yaml`, `data-model.sql`, `erd.html`, and backend ADRs.
- Cross-domain architecture decisions: ADRs authored by the agent that made each decision.

The design is internally checked for soundness, consistency, and testability, then submitted to the human for a design-review gate.

### P2b — Plan and test design

Co-author the three planning artifacts from the approved design:

- `docs/<NN-slug>/P2-design/plan/planSeq.md`: task sequence, task size, wave schedule, dependencies, file ownership, and references.
- `docs/<NN-slug>/P2-design/<domain>/impl-plans/NN-<target>.md`: ordered implementation steps, target files, verification, and risks.
- `docs/<NN-slug>/P2-design/<domain>/test-plan.md`: test cases mapped to every success criterion, including happy paths, boundaries, errors, edge cases, and fixed oracle vectors.

The adversarial and testability challenge is folded into these artifacts rather than stored as a separate challenge document. A final read-through checks that every success criterion is covered and that planned file ownership does not conflict.

Gate: human GO authorizes the build. The PRD remains frozen.

## Phase 3 — Execution

Purpose: implement the approved plan in controlled waves with test-first verification.

Process for behavior/API slices:

1. Acceptance tests are written as RED from the P2 test plan.
2. Implementers build against the implementation plan until the tests are GREEN.
3. The wave is verified, documented, and accepted before the next wave.

Purely visual slices can be verified against the approved UI prototype instead of using the RED/GREEN split.

Outputs:

- Application source code in the normal repository source tree, not in `docs/`.
- Test suite in the normal repository test tree, not in `docs/`.
- `docs/<NN-slug>/P3-execute/build-log.md`: cross-cutting wave gates and verification results.
- `docs/<NN-slug>/P3-execute/<domain>/exec-notes.md`: deviations from the implementation plan and newly discovered edge cases.
- Updated `STATE.md` and boundary checkpoints.

Gate: each wave must pass its build/test review. Repeated failures are escalated instead of being hidden in later documentation.

## Phase 4 — Review

Purpose: independently verify that the implementation is safe, correct, complete, and ready to ship.

Process:

1. Run relevant independent reviews in parallel over changed files.
2. Consolidate findings and independently verify each blocker against source.
3. Pin confirmed defects with new RED tests.
4. Send fixes back to the original implementer, rerun build and pinning tests, and repeat within the retry limit.
5. Record the release result and update state to shipped.

Outputs:

- `docs/<NN-slug>/P4-review/review-gate.md`: consolidated verdict (`APPROVE`, `APPROVE-AFTER-FIXES`, or `BLOCK`) and defect evidence.
- `docs/<NN-slug>/P4-review/security-review.md`: security findings when applicable.
- `docs/<NN-slug>/P4-review/backend/database-review.md`: database/schema findings when applicable.
- `docs/<NN-slug>/P4-review/frontend/typescript-review.md`: frontend/type-safety findings when applicable.
- `docs/<NN-slug>/P4-review/CHANGELOG.md`: shipped changes, review fixes, and deferred work.
- `docs/<NN-slug>/P4-review/metrics.md`: test, build, typecheck, and success-criteria coverage at merge readiness.
- Final `STATE.md` marked `SHIPPED` after approval.

Gate: human approval is required before merge. Findings or newly discovered intent can loop back to P1 or P2 rather than being forced through the pipeline.

## Meeting Translator application

For Meeting Translator, we should begin with P1 only. The first durable record should capture the grilling questions and answers, the frozen success criteria, the non-goals, and the decision about which domains are actually needed. The phase-specific documents should be created only as their gates are reached.

## Open recording decisions

Before implementation, confirm what should be logged beyond the workflow's required artifacts. Recommended records are:

- product-owner answers and unresolved assumptions from P1 grilling;
- privacy, consent, retention, and handling rules for meeting audio/transcripts;
- supported languages, translation quality expectations, latency targets, and failure behavior;
- external services/models and their cost or data-processing trade-offs;
- deferred requirements and explicit reasons for excluding them;
- session/tool logs when export is available, with any secrets or sensitive meeting content removed.

## Meeting Translator Phase 1 grilling log

### Confirmed product direction

- The product must support both offline meetings and online meetings.
- Recording, multi-user collaboration, and advanced meeting management are deferred until the main translation functions are implemented, confirmed, and debugged.
