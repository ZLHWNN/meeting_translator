# ADR 002: Ended-Session Review and Export

## Status

Proposed from Phase 3 live validation; not implemented.

## Decision under review

Change Stop from an immediate teardown-and-exit action into a meeting-ending lifecycle:

`running/paused` → `ending` → `review`

The ending state stops new capture and drains pending provider work. The review state keeps the finalized source/translation pairs visible in client memory and offers export and explicit exit/discard actions. Exit may then close resources and discard the ephemeral report.

## Rationale

The current Stop path closes the provider session and returns to setup, leaving no dedicated place to inspect or export the completed meeting. A review state separates “stop listening” from “leave/discard the meeting.” It also gives pending translations a defined place to complete or be retried.

## Constraints

- No server persistence or automatic meeting history is implied.
- Export is a local user action and must disclose that the file contains meeting content.
- Recording, collaboration, and advanced meeting management remain deferred.
- Export format, pending-result policy, and whether review survives a refresh are unresolved questions.

## Related observation

Live validation also found that transcription can arrive in large chunks and that a translation may appear to cover a previous result. Stable entry IDs, event ordering, and long-text layout must be verified before this lifecycle is implemented.
