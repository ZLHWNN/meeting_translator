export const PROTOCOL_VERSION = "1" as const;
export const PROTOCOL_SUBPROTOCOL = "mt.v1" as const;
export const TOKEN_SUBPROTOCOL_PREFIX = "mt.token." as const;
export const MAX_JSON_FRAME_BYTES = 16 * 1024;
export const PCM_FRAME_BYTES = 960;
export const PCM_FRAME_DURATION_MS = 20;
export const SESSION_MAX_DURATION_SECONDS = 60 * 60;

export type MeetingMode = "in-person" | "online";
export type Direction = "en-to-zh" | "zh-to-en";
export type ProtocolLanguage = "en" | "zh";
export type SessionState = "configuring" | "connecting" | "running" | "paused" | "stopping" | "completed";
export type TransportState = "awaiting-hello" | "ready" | SessionState;

export interface CreateSessionRequest {
  mode: MeetingMode;
  direction: Direction;
}

export interface CreateSessionResponse {
  sessionId: string;
  sessionToken: string;
  websocketUrl: string;
  expiresAt: string;
  maxDurationSeconds: typeof SESSION_MAX_DURATION_SECONDS;
}

export interface SessionReadyEvent {
  type: "session.ready";
  sessionId: string;
  protocolVersion: typeof PROTOCOL_VERSION;
  expiresAt: string;
}

export interface HelloCommand {
  type: "hello";
  protocolVersion: typeof PROTOCOL_VERSION;
  commandId: string;
  capabilities?: string[];
}

export interface SessionControlCommand {
  type: "session.control";
  commandId: string;
  action: "start" | "pause" | "resume" | "stop";
}

export interface DirectionSetCommand {
  type: "direction.set";
  commandId: string;
  direction: Direction;
}

export interface UtteranceStartCommand {
  type: "utterance.start";
  commandId: string;
  utteranceId: string;
  direction: Direction;
}

export interface UtteranceCommitCommand {
  type: "utterance.commit";
  commandId: string;
  utteranceId: string;
}

export interface TranslationRetryCommand {
  type: "translation.retry";
  commandId: string;
  entryId: string;
  sourceText: string;
  sourceLanguage: ProtocolLanguage;
  targetLanguage: ProtocolLanguage;
  context: string[];
}

export type ClientCommand =
  | HelloCommand
  | SessionControlCommand
  | DirectionSetCommand
  | UtteranceStartCommand
  | UtteranceCommitCommand
  | TranslationRetryCommand;

export interface CommandAckEvent {
  type: "command.ack";
  commandId: string;
  accepted: boolean;
  state: TransportState;
  errorCode?: string;
}

export interface SessionStateEvent {
  type: "session.state";
  state: SessionState;
}

export interface TranscriptInterimEvent {
  type: "transcript.interim";
  utteranceId: string;
  providerItemId: string;
  revision: number;
  text: string;
}

export interface TranscriptFinalEvent {
  type: "transcript.final";
  entryId: string;
  utteranceId: string;
  providerItemId: string;
  elapsedMs: number;
  committedAtMs: number;
  sourceLanguage: ProtocolLanguage;
  targetLanguage: ProtocolLanguage;
  text: string;
}

export interface TranslationPendingEvent {
  type: "translation.pending";
  entryId: string;
  targetLanguage: ProtocolLanguage;
}

export interface TranslationCompletedEvent {
  type: "translation.completed";
  entryId: string;
  targetLanguage: ProtocolLanguage;
  text: string;
}

export interface TranslationFailedEvent {
  type: "translation.failed";
  entryId: string;
  retryable: boolean;
  code: string;
  message: string;
}

export interface BackpressureEvent {
  type: "backpressure";
  bufferedAmountBytes: number;
  action: "pause-capture" | "resume-capture";
}

export interface SessionCompletedEvent {
  type: "session.completed";
  reason: "stopped" | "expired" | "disconnected" | "error";
}

export interface ErrorEvent {
  type: "error";
  retryable: boolean;
  code: string;
  message: string;
}

export type ServerEvent =
  | SessionReadyEvent
  | CommandAckEvent
  | SessionStateEvent
  | TranscriptInterimEvent
  | TranscriptFinalEvent
  | TranslationPendingEvent
  | TranslationCompletedEvent
  | TranslationFailedEvent
  | BackpressureEvent
  | SessionCompletedEvent
  | ErrorEvent;

export function isClientCommand(value: unknown): value is ClientCommand {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const type = (value as { type?: unknown }).type;
  return type === "hello" || type === "session.control" || type === "direction.set" ||
    type === "utterance.start" || type === "utterance.commit" || type === "translation.retry";
}
