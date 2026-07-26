import type { UiLanguage } from "../state/sessionReducer";

export interface Messages {
  title: string;
  subtitle: string;
  languageToggle: string;
  setup: string;
  mode: string;
  inPerson: string;
  online: string;
  microphone: string;
  defaultMicrophone: string;
  direction: string;
  enToZh: string;
  zhToEn: string;
  consent: string;
  consentCheck: string;
  start: string;
  noAccount: string;
  connecting: string;
  live: string;
  paused: string;
  resume: string;
  pause: string;
  stop: string;
  copy: string;
  returnLive: string;
  source: string;
  translation: string;
  listening: string;
  retry: string;
  unavailable: string;
  reconnect: string;
  expired: string;
  noEntries: string;
  permissionError: string;
  onlineError: string;
  consentRequired: string;
  copied: string;
}

const english: Messages = {
  title: "Live meeting translation",
  subtitle: "English ↔ 简体中文 · Source and translation stay together.",
  languageToggle: "中文",
  setup: "Start a session",
  mode: "Meeting mode",
  inPerson: "In-person microphone",
  online: "Online tab + microphone",
  microphone: "Microphone",
  defaultMicrophone: "Default microphone",
  direction: "Direction",
  enToZh: "English → 简体中文",
  zhToEn: "简体中文 → English",
  consent: "Before you start",
  consentCheck: "I understand that live audio is sent to OpenAI for transcription and translation.",
  start: "Acknowledge and start",
  noAccount: "No account required",
  connecting: "Connecting…",
  live: "Listening",
  paused: "Audio capture paused",
  resume: "Resume",
  pause: "Pause",
  stop: "Stop",
  copy: "Copy transcript",
  returnLive: "Return to live",
  source: "Source",
  translation: "Translation",
  listening: "Listening for speech…",
  retry: "Retry translation",
  unavailable: "Translation unavailable",
  reconnect: "Reconnect to continue",
  expired: "Session expired",
  noEntries: "Finalized translations will appear here.",
  permissionError: "Permission or capture failed. Check the selected microphone and browser permissions.",
  onlineError: "Online mode needs a selected browser tab that includes audio.",
  consentRequired: "Acknowledge cloud processing before starting.",
  copied: "Copied",
};

const chinese: Messages = {
  title: "实时会议翻译",
  subtitle: "English ↔ 简体中文 · 原文和译文始终一起显示。",
  languageToggle: "EN",
  setup: "开始会议翻译",
  mode: "会议模式",
  inPerson: "现场麦克风",
  online: "在线标签页 + 麦克风",
  microphone: "麦克风",
  defaultMicrophone: "默认麦克风",
  direction: "翻译方向",
  enToZh: "English → 简体中文",
  zhToEn: "简体中文 → English",
  consent: "开始前请注意",
  consentCheck: "我了解实时音频会发送到 OpenAI，用于转写和翻译。",
  start: "确认并开始",
  noAccount: "无需账户",
  connecting: "正在连接…",
  live: "正在聆听",
  paused: "音频采集已暂停",
  resume: "继续",
  pause: "暂停",
  stop: "停止",
  copy: "复制会议记录",
  returnLive: "回到最新",
  source: "原文",
  translation: "译文",
  listening: "正在等待语音…",
  retry: "重试翻译",
  unavailable: "翻译不可用",
  reconnect: "重新连接以继续",
  expired: "会话已过期",
  noEntries: "完成的翻译会显示在这里。",
  permissionError: "权限或采集失败。请检查麦克风选择和浏览器权限。",
  onlineError: "在线模式需要选择包含音频的浏览器标签页。",
  consentRequired: "开始前请确认云端处理说明。",
  copied: "已复制",
};

export const messages: Record<UiLanguage, Messages> = { en: english, "zh-Hans": chinese };
