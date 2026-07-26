# Audio latency procedure

This procedure is separate from the text-quality oracle run.

1. Start the local Node server and Vite client with the configured provider models.
2. Use a quiet room, a stable wired or Wi-Fi connection, no VPN/proxy, and record provider WebSocket RTT before the run. The run is valid only when provider RTT p95 is ≤ 200 ms and no packet-loss incident occurs.
3. In Chrome, select the declared microphone and direction. Read each of the 20 oracle `source` sentences aloud once at a natural meeting pace. Do not record or save the audio. Repeat the same 20 sentences in Edge.
4. For each sentence, record browser, case ID, direction, `utterance.commit`, `translation.completed`, elapsed latency, retries, and provider failure status. Do not record source audio in logs.
5. Report combined, Chrome-only, and Edge-only p50, p95, maximum, failures, and retries. The gate passes only when combined and each browser’s p95 is ≤ 5 seconds.

The text-quality run executes each oracle case once without live audio and is reviewed against `expectedMeaning` and `requiredElements`.
