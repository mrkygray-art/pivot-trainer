import { DEMO_LIMITS } from "./config";
import type { Pack } from "./pack-types";
import type { Coverage, Outline } from "./schemas";

// Engine rules: generic on purpose. Anything topic-specific lives in the pack.
const ENGINE_RULES = `You build short workplace trainings from one organization's own documents (the knowledge base below).

Grounding rules (non-negotiable):
- Use only facts stated in the knowledge base. Never add policy, numbers, steps, or advice from general knowledge.
- Every claim you make must be traceable to a numbered section. Cite sections by their ref exactly as written, e.g. "doc-id#2.2". Glossary terms are cited as "glossary#Term".
- Citation quotes must be copied word-for-word from the cited section (short, under 25 words). Do not paraphrase inside a quote.
- If the knowledge base does not cover something, say so plainly. Do not fill gaps.

Style rules:
- Follow the pack's tone, reading level, sentence length, and preferences.
- Use glossary terms exactly as defined.
- Never use any phrase on the never-say list.
- Follow every pack guardrail.
- All names of people in examples or scenarios are fictional first names only.`;

export function packContext(pack: Pack) {
  const docs = pack.docs
    .map((d) => {
      const secs = pack.sections
        .filter((s) => s.docId === d.id)
        .map((s) => `[${s.ref}] ${s.number} ${s.title}\n${s.text}`)
        .join("\n\n");
      return `=== DOCUMENT ${d.id}: ${d.title} ===\n${secs}`;
    })
    .join("\n\n");

  return `PACK: ${pack.displayName} (${pack.organization})

STYLE PROFILE
- Tone: ${pack.style.tone}
- Reading level: ${pack.style.readingLevel}
- Sentence length: ${pack.style.sentenceLength}
- Preferences: ${pack.style.preferences.join("; ")}

GUARDRAILS
${pack.guardrails.map((g) => `- ${g}`).join("\n")}

AUDIENCE ROLES
${pack.audience.map((a) => `- ${a.role}: ${a.notes}`).join("\n")}

GLOSSARY (cite as glossary#Term)
${pack.glossary.map((g) => `- ${g.term}: ${g.definition}`).join("\n")}

NEVER SAY
${pack.neverSay.map((n) => `- "${n}"`).join("\n")}

KNOWLEDGE BASE
${docs}`;
}

// Rules first, then the pack. Both are stable for a given pack, so the pack block is cached.
export function systemBlocks(pack: Pack) {
  return [{ text: ENGINE_RULES }, { text: packContext(pack), cache: true }];
}

export function coveragePrompt(request: string) {
  return `A user asked: "${request}"

Check coverage BEFORE anything is generated. Break the request into the topics a short training on it would need. For each topic, decide whether the knowledge base actually covers it, and list the section refs that do.
- Put a topic under notCovered if no section addresses it, even if it seems related.
- If the request's main subject is not in the knowledge base at all, set canBuild to false and say so plainly in the summary.
- Keep topics short (a few words each). Aim for 3-6 covered topics when the subject is covered.`;
}

export function outlinePrompt(request: string, role: string, coverage: Coverage) {
  return `Request: "${request}"
Audience role: ${role}

Coverage check result:
${JSON.stringify(coverage, null, 2)}

Write a DEMO-length outline using only the covered topics.
- ${DEMO_LIMITS.minSlides}-${DEMO_LIMITS.maxSlides} chapters (each becomes one slide).
- Pick contentType by what the learner must be able to do: "procedural" (follow steps, approvals, records), "judgment" (respond well to people or situations: what to say, what to avoid, what would you do), or "terminology" (know the terms). Training on how to respond to a person is judgment, even if the source lists steps.
- Pick ONE activity that fits: procedural -> "process_flow" or "sort"; judgment -> "scenario_chat" or "timeline"; terminology -> "flip_cards".
- Plan ${DEMO_LIMITS.minQuestions}-${DEMO_LIMITS.maxQuestions} quiz questions, each tied to one section ref.`;
}

// How each fixed component behaves, so intros and instructions match the UI.
const ACTIVITY_INTERACTION: Record<Outline["activity"], string> = {
  process_flow: "they watch the steps light up in order, then click any step to read its detail (they do not drag or reorder anything).",
  timeline: "they watch events appear one at a time in order.",
  scenario_chat: "they read messages from the other person and pick a reply; weaker replies get coaching and they try again.",
  sort: "they drag the shuffled items into the correct order and check their answer.",
  flip_cards: "they tap each card to flip from the term to its approved definition.",
};

export function generatePrompt(request: string, outline: Outline) {
  return `Request: "${request}"

Approved outline (follow it):
${JSON.stringify(outline, null, 2)}

Generate the training.
- One slide per chapter, ids "s1", "s2", ... Each slide: a short title, 2-4 bullets, a narration of 2-4 sentences, and one citation for each section its bullets draw on.
- Exactly one activity of type "${outline.activity}". Keep it to 4-6 steps/events/items/cards (scenario_chat: 3 steps, each with 3 choices and exactly one best). Every item cites every section its text draws on (one citation per section used).
- Quiz: one question per quiz plan item, ids "q1", "q2", ... Four choices each, one correct (correctIndex is 0-based). Wrong choices should be plausible but clearly contradicted by the source. Each question names the sourceSlideId of the slide that teaches it and cites every section its answer and explanation draw on.
- Write for the audience role in the outline, in the pack's style.
- Write the activity intro for what the learner actually does in it: ${ACTIVITY_INTERACTION[outline.activity]}`;
}

export const VERIFY_SYSTEM = `You are a strict fact-checker for workplace training content. For each claim, you get the claim and the full text of the source section(s) it cites. Decide whether the source supports the claim.

- supported = true only if every factual statement in the claim (steps, numbers, time limits, who does what, rules) is stated in or directly implied by the source.
- Tone, framing, and harmless rewording are fine. Added facts, changed numbers, or advice the source does not give are not.
- For a quiz claim, the correct answer and the explanation must both be supported.
- If unsupported, say briefly in "issue" what the source does not support. Otherwise leave "issue" empty.
- Return one result per claimId, in the same order.`;

export function verifyPrompt(claims: { claimId: string; claim: string; source: string }[]) {
  return claims
    .map((c) => `--- claimId: ${c.claimId}\nCLAIM:\n${c.claim}\n\nSOURCE:\n${c.source}`)
    .join("\n\n");
}

