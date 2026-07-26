import type { TranslationInput, TranslationProvider, TranslationResult } from "./translationProvider";

export const DEFAULT_GEMINI_TRANSLATION_MODEL = "gemini-3.1-flash-lite";
const GEMINI_GENERATE_CONTENT_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeminiTranslationOptions {
  apiKey: string;
  model?: string;
  fetcher?: typeof fetch;
}

export class GeminiTextTranslationProvider implements TranslationProvider {
  constructor(private readonly options: GeminiTranslationOptions) {
    if (!options.apiKey) throw new Error("GEMINI_API_KEY is required");
  }

  async translate(input: TranslationInput): Promise<TranslationResult> {
    const model = this.options.model ?? DEFAULT_GEMINI_TRANSLATION_MODEL;
    const response = await (this.options.fetcher ?? fetch)(
      `${GEMINI_GENERATE_CONTENT_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.options.apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: [
              "Translate faithfully between English and Simplified Chinese.",
              "Preserve names, numbers, dates, negation, deadlines, and commitments.",
              "Return only JSON with keys translation, sourceLanguage, targetLanguage.",
              JSON.stringify(input),
            ].join("\n") }],
          }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    if (!response.ok) throw new Error(`gemini_translation_http_${response.status}`);
    const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const raw = body.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;
    if (!raw) throw new Error("gemini_translation_empty_output");
    let parsed: Partial<TranslationResult>;
    try { parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as Partial<TranslationResult>; }
    catch { throw new Error("gemini_translation_invalid_json"); }
    if (typeof parsed.translation !== "string" || parsed.sourceLanguage !== input.sourceLanguage || parsed.targetLanguage !== input.targetLanguage) {
      throw new Error("gemini_translation_invalid_shape");
    }
    return parsed as TranslationResult;
  }
}
