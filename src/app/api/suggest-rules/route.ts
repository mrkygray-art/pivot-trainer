import { z } from "zod";
import { callStructured } from "@/lib/claude";
import { MODELS, EFFORT } from "@/lib/config";
import { RuleSuggestions } from "@/lib/schemas";
import { SUGGEST_SYSTEM, suggestPrompt } from "@/lib/prompts";
import { badRequest, errorResponse } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

const Body = z.object({
  docs: z
    .array(z.object({ title: z.string().max(160), markdown: z.string().max(100_000) }))
    .min(1)
    .max(20),
});

// Drafts pack settings (glossary, roles, guardrails, never-say, tone) from the documents.
// Suggestions only: the builder shows them for the user to edit and approve.
export async function POST(req: Request) {
  try {
    checkRateLimit(req, "assist");
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return badRequest("Add at least one document first.");
    const total = parsed.data.docs.reduce((n, d) => n + d.markdown.length, 0);
    if (total > 150_000) return badRequest("Documents are too long in total for suggestions.");

    const { data } = await callStructured({
      model: MODELS.generate,
      effort: EFFORT.suggest,
      system: [{ text: SUGGEST_SYSTEM }],
      user: suggestPrompt(parsed.data.docs),
      schema: RuleSuggestions,
      maxTokens: 16000,
    });
    return Response.json({ suggestions: data });
  } catch (err) {
    return errorResponse(err);
  }
}
