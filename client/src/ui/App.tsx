import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createAudioPipeline, type AudioPipeline } from "../audio/audioPipeline";
import { requestCapture, type CapturePair } from "../capture/captureController";
import { type ServerEvent } from "../protocol/messages";
import { websocketProtocols } from "../protocol/sessionSocket";
import { clientPhaseFromServer, initialSessionState, sessionReducer, type ClientPhase } from "../state/sessionReducer";
import { messages, type Messages } from "../i18n/messages";
import "./styles.css";

interface SessionResponse {
  sessionId: string;
  sessionToken: string;
  websocketUrl: string;
}

function newCommandId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function asServerEvent(value: unknown): ServerEvent | undefined {
  if (!value || typeof value !== "object" || !("type" in value)) return undefined;
  return value as ServerEvent;
}

function statusText(phase: ClientPhase, copy: Messages): string {
  if (phase === "connecting") return copy.connecting;
  if (phase === "paused") return copy.paused;
  if (phase === "running") return copy.live;
  if (phase === "completed") return copy.expired;
  return copy.setup;
}

export function App() {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [microphoneId, setMicrophoneId] = useState("");
  const [copyState, setCopyState] = useState(false);
  const socketRef = useRef<WebSocket>();
  const pipelineRef = useRef<AudioPipeline>();
  const captureRef = useRef<CapturePair>();
  const directionRef = useRef(state.direction);
  const phaseRef = useRef(state.phase);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const copy = messages[state.uiLanguage];

  useEffect(() => { directionRef.current = state.direction; }, [state.direction]);
  useEffect(() => { phaseRef.current = state.phase; }, [state.phase]);
  useEffect(() => {
    void navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const inputs = devices.filter((device) => device.kind === "audioinput");
      setMicrophones(inputs);
      if (!microphoneId && inputs[0]) setMicrophoneId(inputs[0].deviceId);
    });
  }, []);
  useEffect(() => {
    if (!state.autoScrollPaused) transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [state.entries, state.interim, state.autoScrollPaused]);

  const send = (value: object): void => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(value));
  };

  const closeResources = async (): Promise<void> => {
    await pipelineRef.current?.stop().catch(() => undefined);
    pipelineRef.current = undefined;
    captureRef.current = undefined;
    socketRef.current?.close();
    socketRef.current = undefined;
  };

  const handleEvent = (event: ServerEvent, capture: CapturePair): void => {
    if (event.type === "session.ready") {
      send({ type: "hello", protocolVersion: "1", commandId: newCommandId("hello"), capabilities: ["audio/pcm", "bilingual-ui"] });
      return;
    }
    if (event.type === "command.ack") {
      if (!event.accepted) dispatch({ type: "set-error", message: event.errorCode ?? "Command rejected." });
      if (event.accepted && event.state === "ready") send({ type: "session.control", action: "start", commandId: newCommandId("start") });
      return;
    }
    if (event.type === "session.state") {
      const phase = clientPhaseFromServer(event.state);
      dispatch({ type: "set-phase", phase });
      if (phase === "running" && !pipelineRef.current) {
        void createAudioPipeline(capture, socketRef.current!, () => directionRef.current)
          .then((pipeline) => { pipelineRef.current = pipeline; })
          .catch(() => dispatch({ type: "set-error", message: copy.permissionError }));
      }
      return;
    }
    if (event.type === "transcript.interim") { dispatch({ type: "interim", utteranceId: event.utteranceId, text: event.text }); return; }
    if (event.type === "transcript.final") {
      dispatch({ type: "final", entry: { id: event.entryId, source: event.text, translation: "", sourceLanguage: event.sourceLanguage, targetLanguage: event.targetLanguage, elapsedMs: event.elapsedMs, translationStatus: "pending" } });
      return;
    }
    if (event.type === "translation.pending") { dispatch({ type: "translation-pending", entryId: event.entryId }); return; }
    if (event.type === "translation.completed") { dispatch({ type: "translation-complete", entryId: event.entryId, text: event.text }); return; }
    if (event.type === "translation.failed") { dispatch({ type: "translation-failed", entryId: event.entryId }); return; }
    if (event.type === "backpressure") {
      if (event.action === "pause-capture") void pipelineRef.current?.pause();
      else void pipelineRef.current?.resume();
      return;
    }
    if (event.type === "error") dispatch({ type: "set-error", message: event.message });
    if (event.type === "session.completed") void closeResources();
  };

  const start = async (): Promise<void> => {
    dispatch({ type: "set-error" });
    if (!state.consent) { dispatch({ type: "set-error", message: copy.consentRequired }); return; }
    try {
      const capture = await requestCapture(state.mode, microphoneId || undefined);
      captureRef.current = capture;
      const response = await fetch("/v1/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: state.mode, direction: state.direction }) });
      if (!response.ok) throw new Error("session_creation_failed");
      const session = await response.json() as SessionResponse;
      const wsUrl = new URL(session.websocketUrl, window.location.origin);
      wsUrl.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(wsUrl.toString(), websocketProtocols(session.sessionToken));
      socketRef.current = socket;
      dispatch({ type: "set-phase", phase: "connecting" });
      socket.onmessage = (message) => {
        const event = asServerEvent(JSON.parse(String(message.data)));
        if (event) handleEvent(event, capture);
      };
      socket.onerror = () => dispatch({ type: "set-error", message: copy.permissionError });
      socket.onclose = () => { if (phaseRef.current === "running" || phaseRef.current === "paused") dispatch({ type: "set-error", message: copy.reconnect }); };
    } catch (error) {
      await closeResources();
      dispatch({ type: "set-error", message: error instanceof Error && error.message === "online_capture_requires_tab_audio" ? copy.onlineError : copy.permissionError });
    }
  };

  const stop = (): void => {
    send({ type: "session.control", action: "stop", commandId: newCommandId("stop") });
  };

  const pauseOrResume = (): void => {
    const pause = state.phase === "running";
    send({ type: "session.control", action: pause ? "pause" : "resume", commandId: newCommandId(pause ? "pause" : "resume") });
    if (pause) void pipelineRef.current?.pause(); else void pipelineRef.current?.resume();
  };

  const changeDirection = (direction: typeof state.direction): void => {
    dispatch({ type: "set-direction", direction });
    if (state.phase === "running" || state.phase === "paused") send({ type: "direction.set", direction, commandId: newCommandId("direction") });
  };

  const retry = (entry: (typeof state.entries)[number]): void => {
    send({ type: "translation.retry", commandId: newCommandId("retry"), entryId: entry.id, sourceText: entry.source, sourceLanguage: entry.sourceLanguage, targetLanguage: entry.targetLanguage, context: [] });
  };

  const copyTranscript = async (): Promise<void> => {
    const text = state.entries.map((entry) => `${new Date(entry.elapsedMs).toISOString().slice(11, 19)}\n${entry.source}\n${entry.translation}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopyState(true);
    window.setTimeout(() => setCopyState(false), 1500);
  };

  const active = state.phase === "running" || state.phase === "paused" || state.phase === "connecting";
  return <main className="app-shell">
    <header className="app-header">
      <div><p className="eyebrow">会议翻译 · Meeting Translator</p><h1>{copy.title}</h1><p className="subtitle">{copy.subtitle}</p></div>
      <button type="button" className="language-button" onClick={() => dispatch({ type: "set-ui-language", language: state.uiLanguage === "en" ? "zh-Hans" : "en" })}>{copy.languageToggle}</button>
    </header>

    {!active && <section className="panel" aria-labelledby="setup-title">
      <h2 id="setup-title">{state.phase === "completed" ? copy.setup : copy.setup}</h2>
      <div className="form-grid">
        <label><span>{copy.mode}</span><select value={state.mode} onChange={(event) => dispatch({ type: "set-mode", mode: event.target.value as typeof state.mode })}><option value="in-person">{copy.inPerson}</option><option value="online">{copy.online}</option></select></label>
        <label><span>{copy.microphone}</span><select value={microphoneId} onChange={(event) => setMicrophoneId(event.target.value)}><option value="">{copy.defaultMicrophone}</option>{microphones.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || copy.defaultMicrophone}</option>)}</select></label>
        <label><span>{copy.direction}</span><select value={state.direction} onChange={(event) => changeDirection(event.target.value as typeof state.direction)}><option value="en-to-zh">{copy.enToZh}</option><option value="zh-to-en">{copy.zhToEn}</option></select></label>
      </div>
      <div className="notice warning"><strong>{copy.consent}</strong><br />{copy.consentCheck}<br /><span>{state.uiLanguage === "en" ? "This app does not save audio or transcript content. OpenAI API use may create abuse-monitoring logs retained up to 30 days by default; provider controls are recorded separately." : "本应用不会保存音频或会议文字。OpenAI API 默认可能保留最长 30 天的滥用监控日志；供应商数据控制设置会单独记录。"}</span></div>
      <label className="consent-row"><input type="checkbox" checked={state.consent} onChange={(event) => dispatch({ type: "set-consent", consent: event.target.checked })} /> {copy.consentCheck}</label>
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
      <div className="toolbar"><button className="primary" type="button" disabled={!state.consent} onClick={() => void start()}>{copy.start}</button><span className="muted">{copy.noAccount}</span></div>
    </section>}

    {active && <section className="panel live-panel" aria-labelledby="live-title">
      <div className="live-toolbar"><div><h2 id="live-title">{copy.title}</h2><div className={`status status-${state.phase}`}><span className="status-dot" />{statusText(state.phase, copy)}</div><div className="live-announcement" role="status" aria-live="polite">{state.phase === "running" ? copy.listening : state.phase === "paused" ? copy.paused : copy.connecting}</div></div><div className="toolbar"><button type="button" onClick={pauseOrResume} disabled={state.phase === "connecting"}>{state.phase === "paused" ? copy.resume : copy.pause}</button><button type="button" onClick={stop}>{copy.stop}</button><button type="button" onClick={() => void copyTranscript()}>{copyState ? copy.copied : copy.copy}</button></div></div>
      <div className="direction-strip"><span>{copy.direction}: {state.direction === "en-to-zh" ? copy.enToZh : copy.zhToEn}</span><select aria-label={copy.direction} value={state.direction} onChange={(event) => changeDirection(event.target.value as typeof state.direction)}><option value="en-to-zh">{copy.enToZh}</option><option value="zh-to-en">{copy.zhToEn}</option></select></div>
      <div className="transcript" ref={transcriptRef} onScroll={(event) => { const target = event.currentTarget; dispatch({ type: "set-autoscroll", paused: target.scrollHeight - target.scrollTop - target.clientHeight > 32 }); }} aria-label={copy.title}>
        {state.entries.length === 0 && Object.keys(state.interim).length === 0 && <p className="muted">{copy.noEntries}</p>}
        {state.entries.map((entry) => <article className="entry" key={entry.id}><time>{new Date(entry.elapsedMs).toISOString().slice(11, 19)}</time><div><strong>{copy.source}</strong><p>{entry.source}</p></div><div className="translation"><strong>{copy.translation}</strong>{entry.translationStatus === "failed" ? <><p>{copy.unavailable}</p><button type="button" onClick={() => retry(entry)}>{copy.retry}</button></> : <p>{entry.translation || "…"}</p>}</div></article>)}
        {Object.entries(state.interim).map(([id, text]) => <div className="interim" key={id}><strong>{copy.listening}</strong> {text}…</div>)}
      </div>
      {state.autoScrollPaused && <button className="return-live" type="button" onClick={() => { dispatch({ type: "set-autoscroll", paused: false }); transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" }); }}>{copy.returnLive}</button>}
      {state.error && <p className="error-message" role="alert">{state.error}</p>}
    </section>}
  </main>;
}
