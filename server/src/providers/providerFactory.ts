import { EchoTranslationProvider, MockTranscriptionProvider } from "./mockProviders";
import { OpenAIRealtimeWhisperProvider } from "./openaiRealtimeWhisper";
import { OpenAITextTranslationProvider } from "./translationProvider";
import { GeminiLiveTranscriptionProvider } from "./geminiLiveTranscription";
import { GeminiTextTranslationProvider } from "./geminiTranslationProvider";
import type { MeetingProviders } from "../session/websocketServer";

export function createMeetingProviders(environment: NodeJS.ProcessEnv = process.env): MeetingProviders {
  const geminiKey = environment.GEMINI_API_KEY;
  if (geminiKey) {
    return {
      transcription: new GeminiLiveTranscriptionProvider({ apiKey: geminiKey, model: environment.GEMINI_LIVE_MODEL }),
      translation: new GeminiTextTranslationProvider({ apiKey: geminiKey, model: environment.GEMINI_TRANSLATION_MODEL }),
    };
  }
  const apiKey = environment.OPENAI_API_KEY;
  const translationModel = environment.OPENAI_TRANSLATION_MODEL;
  if (apiKey && translationModel) {
    return {
      transcription: new OpenAIRealtimeWhisperProvider({ apiKey }),
      translation: new OpenAITextTranslationProvider({ apiKey, model: translationModel }),
    };
  }
  return { transcription: new MockTranscriptionProvider(), translation: new EchoTranslationProvider() };
}
