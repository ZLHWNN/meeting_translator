# ADR 001: Bilingual Live Session UI

## Status

Accepted for P2; implementation awaits P2 GO.

## Decision

Use one session screen with explicit mode, microphone, direction, consent, and lifecycle controls. Render each finalized entry as a timestamped source/translation pair. Keep interim source text separate from finalized entries.

## Context

The MVP serves a bilingual participant in a two-person conversation. It must be useful during a meeting, make translation errors visible, and remain understandable in both English and Simplified Chinese.

## Consequences

- The source remains visible for trust and comparison.
- No speaker labels or diarization are required.
- A manual direction toggle is more predictable than language detection.
- The UI needs an explicit paused-scroll state and a retry state for translation failures.
