import { AiUnavailableError, type AIProvider } from "./types";

type OllamaConfig = {
  baseUrl: string;
  model: string;
  /** A 3B model on a laptop CPU can take minutes on a long chunk. */
  timeoutMs?: number;
  fetch?: typeof fetch;
};

type OllamaChatResponse = {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
};

/** Local development provider. Free, so cost is always 0. */
export function createOllamaProvider(config: OllamaConfig): AIProvider {
  const doFetch = config.fetch ?? fetch;
  return {
    name: "ollama",
    model: config.model,
    async generate(request) {
      const started = performance.now();
      let response: Response;
      try {
        response = await doFetch(
          `${config.baseUrl.replace(/\/$/, "")}/api/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(config.timeoutMs ?? 600_000),
            body: JSON.stringify({
              model: config.model,
              stream: false,
              // Structured outputs: Ollama constrains decoding to this schema.
              format: request.jsonSchema,
              options: {
                temperature: 0,
                num_ctx: 8192,
                num_predict: request.maxOutputTokens,
              },
              messages: [
                { role: "system", content: request.system },
                { role: "user", content: request.prompt },
              ],
            }),
          },
        );
      } catch (error) {
        throw new AiUnavailableError(
          `Ollama is unreachable at ${config.baseUrl}: ${String(error)}`,
        );
      }
      if (!response.ok) {
        throw new AiUnavailableError(
          `Ollama returned ${response.status}: ${(await response.text()).slice(0, 300)}`,
        );
      }
      const body = (await response.json()) as OllamaChatResponse;
      return {
        text: body.message?.content ?? "",
        inputTokens: body.prompt_eval_count ?? 0,
        outputTokens: body.eval_count ?? 0,
        costMicros: 0,
        durationMs: Math.round(performance.now() - started),
      };
    },
  };
}
