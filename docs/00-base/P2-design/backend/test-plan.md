# Backend Test Plan

## Test convention

Provider integrations are mocked for automated tests. Live provider tests are separate, credentialed, short, and executed only after contract tests pass. Logs are checked for metadata-only behavior.

| ID | Success criteria | Test cases |
|---|---|---|
| BE-01 | SC1 | Health endpoint, session creation, invalid mode/direction, one-hour expiry, opaque token shape. |
| BE-02 | SC2, SC3 | Protocol handshake, token validation, origin validation, binary 20 ms/960-byte PCM acceptance, oversized/invalid frame rejection, and browser/upstream backpressure. |
| BE-03 | SC4 | Interim delta mapping, completed event mapping, event ordering, duplicate suppression, finalized entry IDs. |
| BE-04 | SC5 | Direction state update and translation input target language for next finalized entry only. |
| BE-05 | SC6 | Read all 20 fixed source utterances aloud once in Chrome and once in Edge (40 audio observations); measure from client `utterance.commit` to client `translation.completed`, reporting combined and per-browser p50/p95/max, failures, and retries. Combined and per-browser p95 must be ≤ 5 seconds. |
| BE-06 | SC7 | Run `test-fixtures/translation-oracle.yaml` using `oracle-review-rubric.md`; record model ID, prompt version, output, required meaning elements, and human verdict. Any critical error fails. |
| BE-07 | SC9 | Start/pause/resume/stop, expiry, disconnect, provider close, and cleanup. |
| BE-08 | SC10 | Recoverable provider error, fatal provider error, translation failure, retry without audio replay. |
| BE-09 | SC11 | Assert no database/files/content logs; session state deleted on stop, expiry, and disconnect. |
| BE-10 | SC13 | Protocol schema validation and safe human-readable error mapping. |

## Provider-specific checks

- Verify current Realtime transcription session schema and model ID before implementation.
- Verify `gpt-realtime-whisper`, 24 kHz PCM format, append/commit behavior, and `turn_detection: null`.
- Verify translation adapter output validation and prompt behavior against the current official API.
- Verify `item_id`-based event reconciliation and out-of-order completion handling.
- Verify disconnect retry with client-resubmitted source text and bounded context.
- Verify `input_audio_buffer.committed.item_id` binding to the pending client utterance and commit sequence.
- Verify provider-retention disclosure matches the configured OpenAI data-control mode.
