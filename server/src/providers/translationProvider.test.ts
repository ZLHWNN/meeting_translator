import assert from "node:assert/strict";
import test from "node:test";
import { OpenAITextTranslationProvider } from "./translationProvider";

test("translation adapter validates strict JSON output", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ output_text: JSON.stringify({ translation: "你好，团队。", sourceLanguage: "en", targetLanguage: "zh" }) }), { status: 200 });
  try {
    const provider = new OpenAITextTranslationProvider({ apiKey: "test-key", model: "test-model" });
    const result = await provider.translate({ sourceText: "Hello team.", sourceLanguage: "en", targetLanguage: "zh", context: [] });
    assert.deepEqual(result, { translation: "你好，团队。", sourceLanguage: "en", targetLanguage: "zh" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
