# Translation Oracle Review Rubric

## Procedure

1. Run each of the 20 fixed text-quality cases exactly once in the source and target direction declared by that case using the selected translation model and prompt. This quality run does not use live audio.
2. For the latency run, a reviewer reads the source sentence of every case aloud once in Chrome and once in Edge. Use a quiet room, the selected microphone, the documented browser mode, no VPN/proxy, and the same direction as the case. Do not save the audio.
3. Record model ID, prompt version, timestamp, latency, browser, request outcome, and output text in the review record. Do not include live meeting audio.
4. Have one reviewer compare each quality output with `expectedMeaning` and `requiredElements`.
5. Mark each quality case `PASS`, `NONCRITICAL_VARIATION`, or `CRITICAL_ERROR`.
6. A critical error fails the quality gate. Noncritical wording variation is acceptable when every required meaning element remains intact.

## Latency measurement

For each of the 40 audio observations, measure from the client `utterance.commit` timestamp to receipt of `translation.completed`. Report combined and per-browser p50, p95, maximum, failures, and retries. The primary latency pass threshold is combined and per-browser p95 ≤ 5 seconds with retries reported separately.

## Acceptance record

The completed record belongs at `docs/00-base/P4-review/metrics.md`. It must link this oracle file, identify the exact model IDs, state the recorded provider RTT profile, and state the human reviewer and final verdict.
