import { AiUnavailableError, type AIProvider } from "./types";

type HostedConfig = {
  apiKey: string;
  model: string;
  /** Defaults to the Anthropic Messages API. */
  baseUrl?: string;
  /** US dollars per million tokens. */
  priceInputPerMTok: number;
  priceOutputPerMTok: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
};

type MessagesResponse = {
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
};

/** Cost in millionths of a dollar: tokens x (USD per million tokens). */
export function costMicros(
  inputTokens: number,
  outputTokens: number,
  priceInputPerMTok: number,
  priceOutputPerMTok: number,
) {
  return Math.round(
    inputTokens * priceInputPerMTok + outputTokens * priceOutputPerMTok,
  );
}

/** Production provider: a hosted model over HTTPS. The key never leaves the server. */
export function createHostedProvider(config: HostedConfig): AIProvider {
  const doFetch = config.fetch ?? fetch;
  const url = `${(config.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`;
  return {
    name: "hosted",
    model: config.model,
    async generate(request) {
      const started = performance.now();
      let response: Response;
      try {
        response = await doFetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
          },
          signal: AbortSignal.timeout(config.timeoutMs ?? 120_000),
          body: JSON.stringify({
            model: config.model,
            max_tokens: request.maxOutputTokens,
            temperature: 0,
            system: `${request.system}\n\nReply with one JSON object that matches this JSON Schema, and nothing else:\n${JSON.stringify(request.jsonSchema)}`,
            messages: [{ role: "user", content: request.prompt }],
          }),
        });
      } catch (error) {
        throw new AiUnavailableError(`AI API unreachable: ${String(error)}`);
      }
      if (!response.ok) {
        // 4xx other than rate limits means our request is wrong; still surfaced as unavailable
        // so the job fails visibly after its retries instead of hanging.
        throw new AiUnavailableError(
          `AI API returned ${response.status}: ${(await response.text()).slice(0, 300)}`,
        );
      }
      const body = (await response.json()) as MessagesResponse;
      const inputTokens = body.usage?.input_tokens ?? 0;
      const outputTokens = body.usage?.output_tokens ?? 0;
      return {
        text: (body.content ?? [])
          .filter((c) => c.type === "text")
          .map((c) => c.text ?? "")
          .join(""),
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
