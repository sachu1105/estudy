import { costMicros } from "./hosted";
import { AiUnavailableError, type AIProvider } from "./types";

type OpenAiConfig = {
  apiKey: string;
  model: string;
  /** Any OpenAI-compatible Chat Completions API: OpenAI, Gemini, OpenRouter, Groq... */
  baseUrl?: string;
  /** US dollars per million tokens. */
  priceInputPerMTok: number;
  priceOutputPerMTok: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

type ChatResponse = {
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

/**
 * A hosted model behind the OpenAI Chat Completions shape. Text only: files are read through
 * their text layer. JSON mode keeps replies to one object; the schema rides in the system
 * prompt (not every compatible service supports strict schemas) and zod checks the result.
 */
export function createOpenAiProvider(config: OpenAiConfig): AIProvider {
  const doFetch = config.fetch ?? fetch;
  const url = `${(config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`;
  return {
    name: "openai",
    model: config.model,
    readsDocuments: false,
    async generate(request) {
      const started = performance.now();
      let response: Response;
      try {
        response = await doFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          signal: AbortSignal.timeout(config.timeoutMs ?? 300_000),
          body: JSON.stringify({
            model: config.model,
            max_tokens: request.maxOutputTokens,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `${request.system}\n\nReply with one JSON object that matches this JSON Schema, and nothing else:\n${JSON.stringify(request.jsonSchema)}`,
              },
              { role: "user", content: request.prompt },
            ],
          }),
        });
      } catch (error) {
        throw new AiUnavailableError(`AI API unreachable: ${String(error)}`);
      }
      if (!response.ok) {
        throw new AiUnavailableError(
          `AI API returned ${response.status}: ${(await response.text()).slice(0, 300)}`,
        );
      }
      const body = (await response.json()) as ChatResponse;
      const inputTokens = body.usage?.prompt_tokens ?? 0;
      const outputTokens = body.usage?.completion_tokens ?? 0;
      return {
        text: body.choices?.[0]?.message?.content ?? "",
        inputTokens,
        outputTokens,
        costMicros: costMicros(
          inputTokens,
          outputTokens,
          config.priceInputPerMTok,
          config.priceOutputPerMTok,
        ),
        durationMs: Math.round(performance.now() - started),
      };
    },
  };
}
