import type { Pack, Section } from "./pack-types";
import type { Activity, Citation, Flag, Training } from "./schemas";

// Lowercase, straighten quotes/dashes, collapse whitespace, drop markdown ticks.
export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// A quote matches if every fragment (split on ellipses) appears in the section text.
export function quoteInSection(quote: string, section: Section) {
  const haystack = normalize(`${section.title} ${section.text}`);
  const fragments = quote
    .split(/\.\.\.|…/)
    .map((f) => normalize(f).replace(/^["'.,;: ]+|["'.,;: ]+$/g, ""))
    .filter((f) => f.length > 0);
  return fragments.length > 0 && fragments.every((f) => haystack.includes(f));
}

export function findSection(pack: Pack, ref: string): Section | undefined {
  const exact = pack.sections.find((s) => s.ref === ref);
  if (exact) return exact;
  // Tolerate case differences on glossary terms.
  return pack.sections.find((s) => s.ref.toLowerCase() === ref.toLowerCase());
}

// Every citation in the training, tagged with the item it belongs to.
export function collectCitations(t: Training): { itemId: string; citation: Citation }[] {
  const out: { itemId: string; citation: Citation }[] = [];
  for (const s of t.slides) for (const c of s.citations) out.push({ itemId: s.id, citation: c });
  activityItems(t.activity).forEach((item, i) => {
    for (const c of item.citations) out.push({ itemId: `activity.${i + 1}`, citation: c });
  });
  for (const q of t.quiz) for (const c of q.citations) out.push({ itemId: q.id, citation: c });
  return out;
}

// Flattens an activity into (text, citation) items so it can be checked and verified.
export function activityItems(a: Activity): { text: string; citations: Citation[] }[] {
  switch (a.type) {
    case "process_flow":
      return a.steps.map((s) => ({ text: `${s.label}: ${s.detail}`, citations: s.citations }));
    case "timeline":
      return a.events.map((e) => ({ text: `${e.when} - ${e.label}: ${e.detail}`, citations: e.citations }));
    case "scenario_chat":
      return a.steps.map((s) => {
        const best = s.choices.find((c) => c.best);
        return {
          text: `When someone says "${s.message}", the best reply is "${best?.text ?? "(none marked)"}". ${best?.feedback ?? ""}`,
          citations: s.citations,
        };
      });
    case "sort":
      return a.items.map((it, i) => ({ text: `Step ${i + 1}: ${it.text}`, citations: it.citations }));
    case "flip_cards":
      return a.cards.map((c) => ({ text: `${c.term}: ${c.definition}`, citations: c.citations }));
  }
}

// All learner-visible text, for the never-say scan.
function allText(t: Training): { itemId: string; text: string }[] {
  const out: { itemId: string; text: string }[] = [{ itemId: "title", text: `${t.title} ${t.summary}` }];
  for (const s of t.slides) out.push({ itemId: s.id, text: [s.title, ...s.bullets, s.narration].join(" ") });
  const a = t.activity;
  const head = "intro" in a ? a.intro : "instruction" in a ? a.instruction : "";
  out.push({ itemId: "activity", text: `${a.title} ${head}` });
  if (a.type === "scenario_chat") {
    a.steps.forEach((s, i) =>
      out.push({
        itemId: `activity.${i + 1}`,
        text: [s.message, ...s.choices.flatMap((c) => [c.text, c.feedback])].join(" "),
      }),
    );
  } else {
    activityItems(a).forEach((item, i) => out.push({ itemId: `activity.${i + 1}`, text: item.text }));
  }
  for (const q of t.quiz) out.push({ itemId: q.id, text: [q.question, ...q.choices, q.explanation].join(" ") });
  return out;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function runCodeChecks(t: Training, pack: Pack): Flag[] {
  const flags: Flag[] = [];

  for (const { itemId, citation } of collectCitations(t)) {
    const section = findSection(pack, citation.ref);
    if (!section) {
      flags.push({ itemId, source: "citation-check", message: `Cites "${citation.ref}", which is not a section in this pack.` });
    } else if (!quoteInSection(citation.quote, section)) {
      flags.push({ itemId, source: "citation-check", message: `Quote not found word-for-word in ${citation.ref}: "${citation.quote}"` });
    }
  }

  for (const s of t.slides) {
    if (s.citations.length === 0) flags.push({ itemId: s.id, source: "citation-check", message: "Slide has no citation." });
  }
  activityItems(t.activity).forEach((item, i) => {
    if (item.citations.length === 0) flags.push({ itemId: `activity.${i + 1}`, source: "citation-check", message: "Activity item has no citation." });
  });

  const slideIds = new Set(t.slides.map((s) => s.id));
  for (const q of t.quiz) {
    if (q.correctIndex < 0 || q.correctIndex >= q.choices.length) {
      flags.push({ itemId: q.id, source: "citation-check", message: "Correct answer index is out of range." });
    }
    if (q.citations.length === 0) flags.push({ itemId: q.id, source: "citation-check", message: "Question has no citation." });
    if (!slideIds.has(q.sourceSlideId)) {
      flags.push({ itemId: q.id, source: "citation-check", message: `Points to slide "${q.sourceSlideId}", which does not exist.` });
    }
  }

  for (const phrase of pack.neverSay) {
    const re = new RegExp(`\\b${escapeRegex(phrase)}\\b`, "i");
    for (const { itemId, text } of allText(t)) {
      if (re.test(text)) flags.push({ itemId, source: "never-say", message: `Uses a never-say phrase: "${phrase}".` });
    }
  }

  return flags;
}

// Claims for the verify pass: each item's text plus the full text of what it cites.
export function buildClaims(t: Training, pack: Pack) {
  const sourceText = (refs: string[]) =>
    refs
      .map((r) => findSection(pack, r))
      .filter((s): s is Section => !!s)
      .map((s) => `[${s.ref}] ${s.title}\n${s.text}`)
      .join("\n\n") || "(cited section not found)";

  const claims: { claimId: string; claim: string; source: string }[] = [];
  for (const s of t.slides) {
    claims.push({
      claimId: s.id,
      claim: [s.title, ...s.bullets.map((b) => `- ${b}`)].join("\n"),
      source: sourceText(s.citations.map((c) => c.ref)),
    });
  }
  activityItems(t.activity).forEach((item, i) =>
    claims.push({ claimId: `activity.${i + 1}`, claim: item.text, source: sourceText(item.citations.map((c) => c.ref)) }),
  );
  for (const q of t.quiz) {
    claims.push({
      claimId: q.id,
      claim: `Q: ${q.question}\nCorrect answer: ${q.choices[q.correctIndex] ?? "(invalid)"}\nExplanation: ${q.explanation}`,
      source: sourceText(q.citations.map((c) => c.ref)),
    });
  }
  return claims;
}
