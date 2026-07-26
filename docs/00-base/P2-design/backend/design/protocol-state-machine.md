# WebSocket Protocol State Machine

The transport-only states `awaiting-hello` and `ready` occur before the
application lifecycle begins. They are not emitted as `session.state` values:
the first `session.state` emitted after an accepted `start` is `connecting`,
followed by `running`, `paused`, `stopping`, or `completed`.

## Handshake

1. Upgrade validates Origin, `mt.token.<sessionToken>`, and `mt.v1`.
2. Server sends `session.ready`.
3. Client sends `hello` exactly once.
4. Server sends `command.ack` for `hello` with `accepted: true`.
5. Until that acknowledgement, every other JSON or binary message is rejected with `not_ready`.

## Valid command table

| Server state | Valid client messages | Invalid messages |
|---|---|---|
| `awaiting-hello` | `hello` | Everything else; `not_ready` |
| `ready` | `session.control:start`, `direction.set`, `translation.retry` | Audio, utterance messages, pause/resume/stop; `invalid_state` |
| `connecting` | `session.control:stop` | Audio, utterance, start/pause/resume; `invalid_state` |
| `running` | Binary PCM, `utterance.start`, `utterance.commit`, `session.control:pause`, `session.control:stop`, `direction.set`, `translation.retry` | `hello`, start, resume; `invalid_state` |
| `paused` | `session.control:resume`, `session.control:stop`, `direction.set`, `translation.retry` | Binary PCM, utterance messages, start, pause; `invalid_state` |
| `stopping` | None | All messages; `stopping` |
| `completed` | None; close with 1000 | All messages; `completed` |

Every rejected command receives `command.ack` with `accepted: false`, its `commandId`, current state, and an error code. The server makes no state change. A command ID is idempotent while the connection is open; a duplicate returns the original acknowledgement.

Binary audio frames do not have command IDs. If a binary frame arrives outside `running`, or is not exactly 960 bytes, the server emits a typed `error` or closes with `1009`; it does not fabricate a command acknowledgement. Client JSON is validated against the client-only schema, and server JSON is emitted against the server-only schema.

When the server-to-provider queue reaches 1 MiB, the server stops forwarding new frames into the provider socket, retains a bounded 2 MiB queue, and emits `backpressure` with `pause-capture`. Once the provider queue falls to 256 KiB and the retained queue is empty, it emits `resume-capture`. If the bounded queue fills, the server emits a retryable error and keeps the session open for pause/resume recovery.

## Utterance binding

The server assigns a monotonically increasing `commitSequence` when it accepts `utterance.commit`. It stores the active `{utteranceId, commitSequence}` before sending the provider commit. The next `input_audio_buffer.committed` event supplies `item_id`; the server binds that provider ID to the stored pair. Only then can interim and completed provider events be forwarded. A second commit is rejected until the current commit is bound or times out.

## Close behavior

- `1000`: normal stop or completed session.
- `1008`: invalid token, Origin, protocol, or command authorization.
- `1009`: message too large.
- `1011`: provider or server failure.
