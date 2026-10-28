import { callStructured } from "@/lib/claude";
import { MODELS, EFFORT } from "@/lib/config";
import { SectionBreaks } from "@/lib/schemas";
import { SECTION_SYSTEM, sectionPrompt } from "@/lib/prompts";
import { autoNumberHeadings, hasNumberedSections, keepPreamble, splitAtAnchors } from "@/lib/sections";
import { badRequest, errorResponse } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

const MAX_CHARS = 100_000;

// Document text -> markdown body with numbered "## N Title" sections.
// 1. Numbered headings already there: keep them.
// 2. Unnumbered headings: number them by level (no AI).
// 3. No headings: Claude says where sections start; the code splits the original text there.
export async function POST(req: Request) {
  try {
    checkRateLimit(req, "assist");
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 160) : "";
    const text = typeof body.text === "string" ? body.text.replace(/\r\n/g, "\n").trim() : "";
    if (text.length < 20) return badRequest("This document is empty or too short.");
    if (text.length > MAX_CHARS) return badRequest(`This document is too long (limit ${MAX_CHARS.toLocaleString()} characters). Split it into parts.`);

    if (hasNumberedSections(text)) {
      return Response.json({ body: keepPreamble(text), method: "numbered" });
    }
    const numbered = autoNumberHeadings(text);
    if (numbered) {
      return Response.json({ body: keepPreamble(numbered), method: "headings" });
    }

    const { data } = await callStructured({
      model: MODELS.generate,
      effort: EFFORT.sections,
      system: [{ text: SECTION_SYSTEM }],
      user: sectionPrompt(title || "Untitled", text),
      schema: SectionBreaks,
      maxTokens: 16000,
    });
    const result = splitAtAnchors(text, data.sections);
    if (!result.unchanged) {
      // By construction this can't happen; refuse rather than risk altered wording.
      return Response.json({ error: "Sectioning changed the document text, so it was discarded. Try again." }, { status: 500 });
    }
    return Response.json({
      body: result.body,
      method: "claude",
      docTitle: result.docTitle,
      matched: result.used,
      suggested: data.sections.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
