import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

// Server-only. The key comes from ANTHROPIC_API_KEY and never reaches the browser.
const client = new Anthropic();

export class ClaudeError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

// One structured call: cached system blocks + a user message, parsed against a Zod schema.
// Streams under the hood so long generations don't hit HTTP timeouts.
export async function callStructured<S extends z.ZodType>(opts: {
  model: string;
  effort: Effort;
  system: { text: string; cache?: boolean }[];
  user: string;
  schema: S;
  maxTokens?: number;
}): Promise<{ data: z.infer<S>; usage: Anthropic.Beta.BetaUsage; model: string }> {
  const stream = client.beta.messages.stream({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 32000,
    // Server-side refusal fallback: if a safety classifier declines, the API reroutes by category.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system.map((b) => ({
      type: "text" as const,
      text: b.text,
      ...(b.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
    })),
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: opts.effort, format: betaZodOutputFormat(opts.schema) },
  });

  let message;
  try {
    message = await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new ClaudeError("Claude is rate limited. Try again in a minute.", 429);
    if (err instanceof Anthropic.AuthenticationError) throw new ClaudeError("The server's Claude API key is missing or invalid.", 500);
    if (err instanceof Anthropic.BadRequestError) throw new ClaudeError(`Claude rejected the request: ${err.message}`, 500);
    if (err instanceof Anthropic.APIError) throw new ClaudeError(`Claude API error (${err.status}): ${err.message}`);
    throw err;
  }

  if (message.stop_reason === "refusal") {
    throw new ClaudeError("Claude declined this request. Try rewording it.", 422);
  }
  if (message.stop_reason === "max_tokens") {
    throw new ClaudeError("The response ran too long and was cut off. Try a narrower request.");
  }
  if (message.parsed_output == null) {
    throw new ClaudeError("Claude's response did not match the expected format.");
  }
  return { data: message.parsed_output as z.infer<S>, usage: message.usage, model: message.model };
}
