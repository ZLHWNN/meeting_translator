# Frontend Test Plan

## Test convention

Use deterministic fake WebSocket/provider events for automated tests. Use Chrome/Edge manual tests for actual microphone/tab permissions and capture. No test stores audio or transcript content outside test memory.

| ID | Success criteria | Test cases |
|---|---|---|
| FE-01 | SC1, SC13 | Open app, switch English/中文, choose mode, acknowledge consent, start without account. Keyboard-only setup. |
| FE-02 | SC2 | Select microphone; permission granted; permission denied; device unavailable; recover without stale stream. |
| FE-03 | SC3 | Chrome/Edge tab capture plus mic; no-audio-track selection; unsupported browser; tab denial; track termination; ensure Online does not silently fall back. |
| FE-04 | SC4 | Keyed interim text updates; finalized entry replaces matching interim; duplicate/out-of-order provider events do not duplicate or reorder committed entries. |
| FE-05 | SC5 | Direction toggle receives acknowledgement and applies only to the next `utterance.start`; an active utterance keeps its snapshot. |
| FE-06 | SC8 | Relative timestamps render; source/translation pair layout; auto-scroll; user scroll pauses; return-to-live. |
| FE-07 | SC9 | Start/pause/resume/stop; pause/stop flush and drain active audio for the documented timeout; mode change requires a new session; expiry state is visible. |
| FE-08 | SC10 | Connection error, provider error, translation failure, retry with client-resubmitted source/context; source remains visible; no audio replay. |
| FE-09 | SC12 | Copy output contains timestamp, source, and translation pairs; interim text excluded. |
| FE-10 | SC13 | Focus order, visible focus, `aria-live` status, contrast/readability, bilingual static labels. |
| FE-11 | SC11 | Assert no localStorage/sessionStorage writes for meeting content and no content-bearing diagnostic calls. |

## Manual browser matrix

- Chrome desktop: microphone mode and online tab + microphone mode.
- Edge desktop: microphone mode and online tab + microphone mode.
- Unsupported/denied capture: clear block and recovery guidance.
- Slow network: browser bufferedAmount and server-emitted upstream backpressure pause capture and resume below the low-water mark without silently dropping an acknowledged frame.
