import type { Direction, MeetingMode, SessionState } from "../protocol/messages";

export type UiLanguage = "en" | "zh-Hans";
export type ClientPhase = "setup" | "connecting" | "running" | "paused" | "completed" | "error";

export interface TranscriptEntry {
  id: string;
  source: string;
  translation: string;
  sourceLanguage: "en" | "zh";
  targetLanguage: "en" | "zh";
  elapsedMs: number;
  translationStatus: "pending" | "complete" | "failed";
}

export interface SessionClientState {
  uiLanguage: UiLanguage;
  mode: MeetingMode;
  direction: Direction;
  consent: boolean;
  phase: ClientPhase;
  entries: TranscriptEntry[];
  interim: Record<string, string>;
  error?: string;
  autoScrollPaused: boolean;
}

export const initialSessionState: SessionClientState = {
  uiLanguage: "en",
  mode: "in-person",
  direction: "en-to-zh",
  consent: false,
  phase: "setup",
  entries: [],
  interim: {},
  autoScrollPaused: false,
};

export type SessionAction =
  | { type: "set-ui-language"; language: UiLanguage }
  | { type: "set-mode"; mode: MeetingMode }
  | { type: "set-direction"; direction: Direction }
  | { type: "set-consent"; consent: boolean }
  | { type: "set-phase"; phase: ClientPhase }
  | { type: "set-error"; message?: string }
  | { type: "interim"; utteranceId: string; text: string }
  | { type: "final"; entry: TranscriptEntry }
  | { type: "translation-pending"; entryId: string }
  | { type: "translation-complete"; entryId: string; text: string }
  | { type: "translation-failed"; entryId: string }
  | { type: "set-autoscroll"; paused: boolean };

export function sessionReducer(state: SessionClientState, action: SessionAction): SessionClientState {
  switch (action.type) {
    case "set-ui-language": return { ...state, uiLanguage: action.language };
    case "set-mode": return { ...state, mode: action.mode };
    case "set-direction": return { ...state, direction: action.direction };
    case "set-consent": return { ...state, consent: action.consent };
    case "set-phase": return { ...state, phase: action.phase };
    case "set-error": return { ...state, error: action.message, phase: action.message ? "error" : state.phase };
    case "interim": return { ...state, interim: { ...state.interim, [action.utteranceId]: action.text } };
    case "final": {
      const interim = { ...state.interim };
      delete interim[action.entry.id];
      return { ...state, entries: [...state.entries, action.entry].sort((a, b) => a.elapsedMs - b.elapsedMs), interim };
    }
    case "translation-pending": return { ...state, entries: state.entries.map((entry) => entry.id === action.entryId ? { ...entry, translationStatus: "pending" } : entry) };
    case "translation-complete": return { ...state, entries: state.entries.map((entry) => entry.id === action.entryId ? { ...entry, translation: action.text, translationStatus: "complete" } : entry) };
    case "translation-failed": return { ...state, entries: state.entries.map((entry) => entry.id === action.entryId ? { ...entry, translationStatus: "failed" } : entry) };
    case "set-autoscroll": return { ...state, autoScrollPaused: action.paused };
  }
}

export function clientPhaseFromServer(state: SessionState): ClientPhase {
  if (state === "connecting") return "connecting";
  if (state === "running") return "running";
  if (state === "paused") return "paused";
  if (state === "completed" || state === "stopping") return "completed";
  return "setup";
}
