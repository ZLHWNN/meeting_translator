# Backend Technical Design

## Runtime

Use a small TypeScript Node service built with Fastify and `ws`.

Responsibilities:

- Serve `GET /health`.
- Create short-lived anonymous sessions through `POST /v1/sessions`.
- Validate session token, protocol version, mode, language direction, and frame sizes.
- Maintain one in-memory session object per active WebSocket.
- Open and manage the upstream OpenAI Realtime transcription WebSocket.
- Forward normalized PCM frames upstream and map provider events to the client event contract.
- On finalized transcript events, call the translation adapter with the current source text and previous three finalized source entries.
- Emit metadata-only diagnostics.
- Close upstream and discard state on stop, expiry, socket close, or fatal error.

## Provider adapters

Define interfaces independent of OpenAI:

```ts
interface TranscriptionSession {
  appendPcm(frame: Buffer): void;
  commit(input: { utteranceId: string; commitSequence: number }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  close(): Promise<void>;
  onEvent(listener: (event: TranscriptionEvent) => void): () => void;
}

interface TranslationProvider {
  translate(input: TranslationInput): Promise<TranslationResult>;
}
```

The OpenAI transcription adapter uses the documented `gpt-realtime-whisper` model with a `type: "transcription"` session, source-language hint, and mono 24 kHz PCM input. Turn detection is explicitly `null`; the client-side utterance segmenter controls commit boundaries by calling `commit()`, which sends `input_audio_buffer.commit`. Only one commit may be in flight at a time. The adapter records the pending `{utteranceId, commitSequence}` before sending the commit, binds the next `input_audio_buffer.committed.item_id` to that record, and routes subsequent deltas/completion by `(providerItemId, utteranceId)`.

The adapter maps provider interim deltas by `(providerItemId, utteranceId, revision)` and completed events by `providerItemId`. It never assumes completion order equals speech order.

OpenAI’s official reference documents `input_audio_buffer.append`, 24 kHz PCM input, interim transcription deltas, completed transcription events, VAD, and error events. The adapter must be verified against the exact current SDK/API schema before P3. See the provider ADR and official references.

## Session lifecycle

1. `POST /v1/sessions` validates the requested mode and direction, creates an opaque token, and returns expiry metadata.
2. Client opens the WebSocket offering `mt.v1` and `mt.token.<sessionToken>` subprotocols. The server validates Origin and the token during upgrade, selects `mt.v1`, and never logs the token.
3. Server sends `session.ready`; client replies with `hello`; server acknowledges the hello before accepting controls or audio.
4. Client sends `session.control start`; server opens the provider stream and returns a command acknowledgement.
5. Client VAD emits `utterance.start` at the first speech frame, sends 20 ms PCM frames, and emits `utterance.commit` after 650 ms of silence. Minimum speech is 250 ms and the hard segment maximum is 8 seconds. The server accepts only one active commit sequence at a time.
6. Server forwards each frame as `input_audio_buffer.append`, then sends `input_audio_buffer.commit` at the explicit commit boundary.
7. Server maps keyed provider events and invokes translation only after finalized source text, using the direction snapshot stored at `utterance.start`.
8. Pause stops new capture, commits and drains an active utterance for up to 2 seconds, then enters paused. Stop follows the same flush, emits completed, and deletes state. If no final event arrives before the drain deadline, the pending segment is discarded with an explicit warning.

## Protocol and recovery

- JSON control frames are limited to 16 KiB; binary PCM frames are exactly 20 ms and 960 bytes at 24 kHz mono signed 16-bit PCM.
- The browser pauses capture locally when its client WebSocket `bufferedAmount` reaches 1 MiB and resumes only below 256 KiB. Separately, the server queues accepted 960-byte frames while its upstream OpenAI WebSocket `bufferedAmount` is at least 1 MiB, emits `backpressure: pause-capture`, and resumes below 256 KiB after the bounded queue drains. A 2 MiB queue limit produces a retryable error rather than silently dropping frames.
- Every command has a `commandId` and receives `command.ack`.
- Normative command validity is defined in `protocol-state-machine.md`; invalid commands receive `accepted: false`, `errorCode: invalid_state`, and cause no state change.
- Direction changes are acknowledged and apply only to a future `utterance.start`; an active utterance retains its original snapshot.
- Finalized source entries remain in client memory after disconnect. A new session may submit `translation.retry` with the source text, source/target language, and at most three source-context entries; audio is never retransmitted for this path.
- A disconnect ends the provider stream and deletes server state by design. The client offers “reconnect” as a new session and retains already-rendered entries locally until the user leaves or refreshes.
- Close codes are documented in the protocol schema: `1000` normal stop, `1008` invalid token/protocol, `1009` message too large, `1011` provider/server failure.

## Retention and security

- No database, file, queue, or transcript cache.
- Provider API key is read only on the server.
- Session token is opaque, random, short-lived, presented through the WebSocket subprotocol, and accepted only once for its active connection.
- Validate Origin for browser WebSocket connections.
- Reject oversized binary frames and invalid event JSON against `websocket-protocol.schema.json`.
- Log only event type, timing, status, error code, and provider request ID where available.
- The consent text must distinguish app-side non-retention from provider-side abuse-monitoring retention. The default OpenAI `/v1/realtime` policy may retain abuse-monitoring logs for up to 30 days; deployment must document the configured data-control mode and never promise zero provider retention unless it is actually enabled and eligible.

## Failure handling

- Provider recoverable errors are sent as typed `error` events and keep the session open when safe.
- Translation failures attach to the finalized entry and can be retried by entry ID plus client-resubmitted source text/context.
- Fatal capture or provider errors close the affected stream and preserve already-emitted source entries in client memory.
- Every close path clears in-memory session state.

## Latency measurement

For SC6, record monotonic client timestamps:

- `t_commit`: when the client sends `utterance.commit`.
- `t_translation`: when the client receives `translation.completed`.
- Measured latency: `t_translation - t_commit`.

The live acceptance run uses all 20 fixed oracle utterances on local Chrome and Edge. The test machine runs the client and Node server locally, uses a stable wired or Wi-Fi connection with no VPN/proxy, and records provider WebSocket RTT before the run; a run is valid only when measured provider RTT p95 is ≤ 200 ms and there is no packet-loss incident. Retries and provider failures are excluded from the primary metric but reported separately. Pass requires p95 ≤ 5 seconds and no more than one failed request.
