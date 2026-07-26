# Implementation Plan 02: Transcript and Session UI

## Target

Implement WebSocket session controls, event reducer integration, live transcript rendering, translation retry, copy, scrolling, bilingual labels, and accessibility behavior.

## Target files

- `client/src/protocol/messages.ts`
- `client/src/protocol/websocketClient.ts`
- `client/src/state/sessionReducer.ts`
- `client/src/ui/SessionSetup.tsx`
- `client/src/ui/LiveSession.tsx`
- `client/src/ui/TranscriptList.tsx`
- `client/src/i18n/messages.ts`

## Ordered steps

1. Implement REST session creation and WebSocket connection lifecycle in the client.
2. Offer the `mt.v1` and `mt.token.<sessionToken>` WebSocket subprotocols; validate the server `session.ready` → client `hello` → server acknowledgement sequence.
3. Send versioned `hello`, `session.control`, `utterance.start`, `utterance.commit`, `direction.set`, and `translation.retry` messages.
4. Map keyed `transcript.interim`, `transcript.final`, translation, command acknowledgement, state, backpressure, and error events into reducer actions.
5. Render source/translation entries with relative timestamps and pending/failed states.
6. Implement direction changes for future finalized entries only and show acknowledgement status.
7. Implement reconnect as a new session while retaining client-visible finalized entries until refresh/exit.
8. Implement auto-scroll pause and return-to-live.
9. Implement copy of timestamped source/translation pairs.
10. Add keyboard focus, non-timer `aria-live` status, error text, and English/Simplified Chinese labels.

## Verification

- Reducer tests cover duplicate/out-of-order provider events.
- Component tests cover pause/resume/stop, retry, copy, scroll, and language toggle.
- Protocol tests cover handshake order, command acknowledgements, close codes, and out-of-order event reconciliation.
- Accessibility checks cover keyboard-only operation and status announcements.
