import { loadPack } from "@/lib/packs";
import { callStructured } from "@/lib/claude";
import { MODELS, EFFORT } from "@/lib/config";
import { Coverage } from "@/lib/schemas";
import { coveragePrompt, systemBlocks } from "@/lib/prompts";
import { findSection } from "@/lib/checks";
import { badRequest, cleanRequest, errorResponse } from "@/lib/api";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const request = cleanRequest(body.request);
    if (!request) return badRequest("Describe the training you want (at least a few words).");
    const pack = await loadPack(String(body.pack));

    const { data } = await callStructured({
      model: MODELS.generate,
      effort: EFFORT.coverage,
      system: systemBlocks(pack),
      user: coveragePrompt(request),
      schema: Coverage,
      maxTokens: 8000,
    });

    // Drop any refs that aren't real sections, so the UI never shows a dead citation.
    const coverage: Coverage = {
      ...data,
      covered: data.covered
        .map((c) => ({ ...c, refs: c.refs.filter((r) => findSection(pack, r)) }))
        .filter((c) => c.refs.length > 0),
    };
    if (coverage.covered.length === 0) coverage.canBuild = false;

    return Response.json({ coverage });
  } catch (err) {
    return errorResponse(err);
  }
}
