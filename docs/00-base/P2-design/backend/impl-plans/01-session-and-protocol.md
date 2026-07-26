# Implementation Plan 01: Session and Protocol

## Target

Implement Fastify health/session creation, opaque token validation, WebSocket lifecycle, typed protocol parsing, binary PCM forwarding, expiry, and cleanup.

## Target files

- `server/src/http/health.ts`
- `server/src/http/sessions.ts`
- `server/src/session/sessionStore.ts`
- `server/src/session/websocketServer.ts`
- `server/src/session/protocolValidator.ts`
- `shared/protocol/websocket-protocol.schema.json`

## Ordered steps

1. Create the Node/TypeScript server and shared protocol types.
2. Add `GET /health` and `POST /v1/sessions` with strict request validation.
3. Generate cryptographically random session tokens and one-hour expiry metadata.
4. Validate WebSocket Origin, the one-time `mt.token.<sessionToken>` subprotocol, selected `mt.v1` protocol, and connection ownership.
5. Send `session.ready`, require `hello`, and return `command.ack` for every command.
6. Parse JSON control messages against the machine-validatable schema and reject invalid/oversized payloads.
7. Accept only binary 20 ms, 24 kHz, mono signed 16-bit PCM frames (960 bytes per message) while running; enforce both browser-facing and upstream-provider high/low-water backpressure.
8. Implement pause/stop flush and two-second drain behavior, then all close/error cleanup paths.
9. Implement one-hour expiry beginning at session creation and expose the expiry reason.
10. Emit metadata-only diagnostics without token, source text, translation, or audio.

## Verification

- Contract tests for valid/invalid REST requests.
- Protocol tests for state transitions, duplicate hello, invalid direction, binary frames while paused, expiry, and disconnect.
- Protocol tests for subprotocol authentication, handshake order, normative state-command validity, command acknowledgements, close codes, frame limits, and both backpressure paths.
- Confirm no session content survives stop or server restart.
