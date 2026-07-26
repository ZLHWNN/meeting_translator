export interface TranslationInput {
  sourceText: string;
  sourceLanguage: "en" | "zh";
  targetLanguage: "en" | "zh";
  context: string[];
}

export interface TranslationResult {
  translation: string;
  sourceLanguage: "en" | "zh";
  targetLanguage: "en" | "zh";
}

export interface TranslationProvider {
  translate(input: TranslationInput): Promise<TranslationResult>;
}

export interface OpenAITextTranslationOptions {
  apiKey: string;
  model: string;
  endpoint?: string;
}

export class OpenAITextTranslationProvider implements TranslationProvider {
  constructor(private readonly options: OpenAITextTranslationOptions) {
    if (!options.apiKey) throw new Error("OPENAI_API_KEY is required");
    if (!options.model) throw new Error("OPENAI_TRANSLATION_MODEL is required");
  }

  async translate(input: TranslationInput): Promise<TranslationResult> {
    const response = await fetch(this.options.endpoint ?? "https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.options.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.options.model,
        input: [
          {
            role: "system",
            content: "Translate faithfully between English and Simplified Chinese. Preserve names, numbers, dates, negation, deadlines, and commitments. Return only JSON with keys translation, sourceLanguage, targetLanguage.",
          },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`translation_provider_http_${response.status}`);
    const body = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const raw = body.output_text ?? body.output?.flatMap((item) => item.content ?? []).find((part) => part.type === "output_text")?.text;
    if (!raw) throw new Error("translation_provider_empty_output");
    let parsed: Partial<TranslationResult>;
    try { parsed = JSON.parse(raw) as Partial<TranslationResult>; } catch { throw new Error("translation_provider_invalid_json"); }
    if (typeof parsed.translation !== "string" || parsed.sourceLanguage !== input.sourceLanguage || parsed.targetLanguage !== input.targetLanguage) {
      throw new Error("translation_provider_invalid_shape");
    }
    return parsed as TranslationResult;
  }
}
