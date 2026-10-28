import { resolvePack } from "@/lib/resolve-pack";
import { callStructured } from "@/lib/claude";
import { MODELS, EFFORT } from "@/lib/config";
import { Outline, trainingSchemaFor, Verification, type Flag, type GeneratedTraining, type Training } from "@/lib/schemas";
import { generatePrompt, systemBlocks, VERIFY_SYSTEM, verifyPrompt } from "@/lib/prompts";
import { buildClaims, runCodeChecks } from "@/lib/checks";
import { badRequest, cleanRequest, errorResponse } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    checkRateLimit(req, "build");
    const body = await req.json();
    const request = cleanRequest(body.request);
    if (!request) return badRequest("Missing request.");
    const outline = Outline.safeParse(body.outline);
    if (!outline.success) return badRequest("Approve an outline first.");
    const pack = await resolvePack(body);

    // 1. Generate (Opus).
    const { data } = await callStructured({
      model: MODELS.generate,
      effort: EFFORT.generate,
      system: systemBlocks(pack),
      user: generatePrompt(request, outline.data),
      schema: trainingSchemaFor(outline.data.activity),
    });
    const training: Training = data;

    // 2. Code checks: section refs exist, quotes are verbatim, never-say list, quiz integrity.
    const flags: Flag[] = runCodeChecks(training, pack);

    // 3. Verify pass (Sonnet): does each cited source actually support the claim?
    const { data: verification } = await callStructured({
      model: MODELS.verify,
      effort: EFFORT.verify,
      system: [{ text: VERIFY_SYSTEM }],
      user: verifyPrompt(buildClaims(training, pack)),
      schema: Verification,
      maxTokens: 16000,
    });
    for (const r of verification.results) {
      if (!r.supported) flags.push({ itemId: r.claimId, source: "verify", message: r.issue || "Not supported by the cited source." });
    }

    const result: GeneratedTraining = {
      training,
      flags,
      packName: pack.name,
      request,
      createdAt: new Date().toISOString(),
      verifiedBy: MODELS.verify,
    };
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
