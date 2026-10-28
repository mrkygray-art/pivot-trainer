import { resolvePack } from "@/lib/resolve-pack";
import { callStructured } from "@/lib/claude";
import { MODELS, EFFORT } from "@/lib/config";
import { Coverage, Outline } from "@/lib/schemas";
import { outlinePrompt, systemBlocks } from "@/lib/prompts";
import { badRequest, cleanRequest, errorResponse } from "@/lib/api";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const request = cleanRequest(body.request);
    if (!request) return badRequest("Missing request.");
    const coverage = Coverage.safeParse(body.coverage);
    if (!coverage.success || !coverage.data.canBuild) return badRequest("Run a coverage check that can build first.");
    const pack = await resolvePack(body);
    const role = pack.audience.some((a) => a.role === body.role) ? String(body.role) : pack.audience[0].role;

    const { data } = await callStructured({
      model: MODELS.generate,
      effort: EFFORT.outline,
      system: systemBlocks(pack),
      user: outlinePrompt(request, role, coverage.data),
      schema: Outline,
      maxTokens: 8000,
    });
    return Response.json({ outline: data });
  } catch (err) {
    return errorResponse(err);
  }
}
