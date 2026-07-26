# ADR 001: Ephemeral Server Session and Stream Boundary

## Status

Accepted for P2; implementation awaits P2 GO.

## Decision

Use a Fastify REST endpoint to create a short-lived opaque session token and a versioned WebSocket for controls, binary PCM frames, and live events. Present the token in a one-time WebSocket subprotocol, validate Origin during upgrade, and keep active state in memory only.

## Context

The MVP has no accounts, no history, and no recording. The browser must not receive provider credentials, but it does need a reliable bidirectional stream.

## Consequences

- Provider credentials remain server-side.
- A restart or page exit can lose the active session by design.
- No database schema or migration is needed.
- The server must enforce expiry, frame limits, origin checks, explicit command acknowledgements, and cleanup on every close path.
- Translation retry after disconnect accepts client-resubmitted finalized source text and bounded source context; audio is never replayed.
- Multiple independent anonymous sessions can exist per process, but no shared collaboration state is created.
