// Turning documents into numbered, citable sections. Shared by the server and the
// pack builder in the browser. Section text is only ever sliced from the original
// document, never rewritten, so citation quotes can be checked word-for-word.
import type { Section } from "./pack-types";

const NUMBERED_HEADING = /^#{2,4}\s+(\d+(?:\.\d+)*)\s+(.+)$/;
const ANY_HEADING = /^(#{1,6})\s+(.+)$/;

// Splits a markdown doc into numbered sections. A heading like "## 2 Receiving"
// or "### 2.2 Log the request first" starts a section; text runs to the next heading.
export function parseSections(docId: string, markdown: string): { title: string; sections: Section[] } {
  const lines = markdown.split(/\r?\n/);
  const docTitle = (lines.find((l) => l.startsWith("# ")) ?? `# ${docId}`).slice(2).trim();
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const m = line.match(NUMBERED_HEADING);
    if (m) {
      if (current) sections.push(current);
      current = { ref: `${docId}#${m[1]}`, docId, docTitle, number: m[1], title: m[2].trim(), text: "" };
    } else if (current && !line.startsWith("# ")) {
      current.text += line + "\n";
    }
  }
  if (current) sections.push(current);
  for (const s of sections) s.text = s.text.trim();
  return { title: docTitle, sections };
}

export function glossarySections(glossary: { term: string; definition: string }[]): Section[] {
  return glossary.map((g) => ({
    ref: `glossary#${g.term}`,
    docId: "glossary",
    docTitle: "Glossary",
    number: "",
    title: g.term,
    text: g.definition,
  }));
}

const LEADING_NUMBER = /^(\d+(?:\.\d+)*)\.?\s+/;

// Markdown headings without numbers ("## Purpose") get numbered by level:
// the shallowest level used becomes 1, 2, 3; the next becomes 1.1, 1.2; and so on.
// Returns null when the text has fewer than two headings.
export function autoNumberHeadings(body: string): string | null {
  const lines = body.split(/\r?\n/);
  const levels = lines.map((l) => l.match(ANY_HEADING)?.[1].length ?? 0).filter((n) => n > 0);
  if (levels.length < 2) return null;
  const used = [...new Set(levels)].sort((a, b) => a - b);
  const counters: number[] = [];

  return lines
    .map((line) => {
      const m = line.match(ANY_HEADING);
      if (!m) return line;
      const depth = used.indexOf(m[1].length);
      counters.length = depth + 1;
      counters[depth] = (counters[depth] ?? 0) + 1;
      for (let i = 0; i < depth; i++) counters[i] = counters[i] ?? 1;
      const title = m[2].trim().replace(LEADING_NUMBER, "");
      return `## ${counters.join(".")} ${title}`;
    })
    .join("\n");
}

// Text before the first numbered heading would otherwise drop out of the knowledge
// base, so it becomes a "0 Introduction" section.
export function keepPreamble(body: string) {
  const lines = body.split(/\r?\n/);
  const first = lines.findIndex((l) => NUMBERED_HEADING.test(l));
  if (first <= 0) return body;
  const preamble = lines.slice(0, first).filter((l) => !l.startsWith("# ")).join("\n").trim();
  return preamble ? `## 0 Introduction\n${preamble}\n\n${lines.slice(first).join("\n")}` : body;
}

export function hasNumberedSections(body: string) {
  return body.split(/\r?\n/).filter((l) => NUMBERED_HEADING.test(l)).length >= 2;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Finds where an anchor ("the first few words of a section") starts, at or after `from`.
// Exact match first, then a whitespace- and case-tolerant match (PDF text has odd breaks).
function findAnchor(text: string, anchor: string, from: number): number {
  const exact = text.indexOf(anchor, from);
  if (exact >= 0) return exact;
  const words = anchor.trim().split(/\s+/).filter(Boolean).map(escapeRegex);
  if (words.length === 0) return -1;
  const re = new RegExp(words.join("\\s+"), "gi");
  re.lastIndex = from;
  const m = re.exec(text);
  return m ? m.index : -1;
}

export type SectionBreak = { number: string; title: string; anchor: string };

// Splits the original text at each anchor and adds a numbered heading there.
// If a chunk starts with a short line that is the section's own heading, that
// line becomes the heading instead of being repeated in the body.
// A single short line before the first section is returned as the document title.
// `unchanged` confirms the slices put back together are exactly the original text.
export function splitAtAnchors(
  text: string,
  breaks: SectionBreak[],
): { body: string; used: number; unchanged: boolean; docTitle?: string } {
  const starts: { pos: number; brk: SectionBreak }[] = [];
  let cursor = 0;
  for (const brk of breaks) {
    const pos = findAnchor(text, brk.anchor, cursor);
    if (pos < 0) continue;
    starts.push({ pos, brk });
    cursor = pos + 1;
  }
  if (starts.length === 0) {
    return { body: `## 1 ${breaks[0]?.title ?? "Document"}\n${text.trim()}`, used: 0, unchanged: true };
  }

  const preamble = text.slice(0, starts[0].pos);
  const preambleLine = preamble.trim();
  const docTitle = preambleLine && !preambleLine.includes("\n") && preambleLine.length <= 120 ? preambleLine : undefined;
  if (!docTitle) starts[0].pos = 0; // a longer preamble belongs to the first section

  const slices: string[] = docTitle ? [preamble] : [];
  const parts = starts.map(({ pos, brk }, i) => {
    const slice = text.slice(pos, i + 1 < starts.length ? starts[i + 1].pos : text.length);
    slices.push(slice);
    let chunk = slice.trim();
    let title = brk.title.trim();
    const firstLine = chunk.split(/\r?\n/)[0].trim();
    const lineTitle = firstLine.replace(LEADING_NUMBER, "").replace(/[:.]$/, "").trim();
    if (firstLine.length <= 100 && lineTitle && lineTitle.toLowerCase() === title.toLowerCase().replace(/[:.]$/, "")) {
      title = lineTitle;
      chunk = chunk.slice(firstLine.length).trim();
    }
    return `## ${brk.number} ${title}\n${chunk}`;
  });
  const squash = (s: string) => s.replace(/\s+/g, "");
  return { body: parts.join("\n\n"), used: starts.length, unchanged: squash(slices.join("")) === squash(text), docTitle };
}

export function docMarkdown(title: string, body: string) {
  return `# ${title}\n\n${body.trim()}\n`;
}
