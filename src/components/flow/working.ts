// The visit's working data. Lives only in React state: nothing is written to
// browser storage, so a reload or a later visit starts fresh.
import { slugify, type CustomPackData } from "@/lib/custom-pack";
import type { DocKind } from "@/lib/pack-types";
import { docMarkdown, parseSections } from "@/lib/sections";

export type SectionMethod = "numbered" | "headings" | "claude" | "edited";
export type DocStatus = "reading" | "sectioning" | "ready" | "error";

export type WorkingDoc = {
  id: string;
  title: string;
  kind: DocKind;
  source: string; // file name or "Pasted text"
  sample: boolean;
  status: DocStatus;
  error?: string;
  text: string;
  body: string | null; // markdown with "## N Title" sections
  method?: SectionMethod;
};

export type Working = Omit<CustomPackData, "docs"> & { docs: WorkingDoc[]; isSample: boolean };

// Rules shown in Step 2. The first two are always on.
export const RULES = {
  onlyDocs: "Answer only from the knowledge base.",
  showSource: "Cite document and section for every slide and question.",
  sayNotCovered: "If not covered, say it is not covered.",
  checkWithHr: "Remind learners to check with HR on tricky or specific cases.",
} as const;
export const ALWAYS_ON_RULES: string[] = [RULES.onlyDocs, RULES.showSource];
export const TOGGLE_RULES: { text: string; label: string }[] = [
  { text: RULES.sayNotCovered, label: "Say so when something is not covered" },
  { text: RULES.checkWithHr, label: "Remind learners to check with HR on tricky cases" },
];

export const TONES = [
  { id: "warm", label: "Warm and supportive", hint: "Kind and encouraging. Good for people topics.", tone: "warm, supportive, respectful; speaks to people as capable adults" },
  { id: "direct", label: "Direct and practical", hint: "Short, clear steps. Good for procedures.", tone: "direct, practical, plain; short clear steps" },
  { id: "formal", label: "Formal and precise", hint: "Careful, exact wording. Good for compliance.", tone: "formal, precise, measured; exact wording" },
] as const;

export function toneId(tone: string) {
  const t = tone.toLowerCase();
  if (t.includes("warm") || t.includes("supportive")) return "warm";
  if (t.includes("formal") || t.includes("precise")) return "formal";
  return "direct";
}

export const DEFAULT_BRAND = "#1B4FD6";

export function emptyWorking(): Working {
  return {
    name: "custom-my-documents", // one working set per visit, so a fixed name is enough
    displayName: "My documents",
    organization: "",
    description: "",
    style: {
      tone: TONES[1].tone,
      readingLevel: "plain, 8th grade",
      sentenceLength: "short",
      colors: { primary: DEFAULT_BRAND, accent: "#B45309", background: "#F5F6F8" },
      logoText: "",
      preferences: [],
      look: { font: "sans", corners: "soft" },
    },
    guardrails: [...ALWAYS_ON_RULES, RULES.sayNotCovered, RULES.checkWithHr],
    audience: [],
    glossary: [],
    neverSay: ["guaranteed"],
    starterPrompts: [],
    docs: [],
    isSample: false,
  };
}

// A saved demo file (or a sample, which ships in the same format) as working data.
export function workingFromPack(pack: CustomPackData, isSample: boolean): Working {
  const guardrails = [...new Set([...ALWAYS_ON_RULES, ...pack.guardrails])];
  return {
    ...pack,
    guardrails,
    isSample,
    docs: pack.docs.map((d) => {
      const body = d.markdown.replace(/^# .*\r?\n/, "").trim();
      return { id: d.id, title: d.title, kind: d.kind, source: isSample ? "Sample" : "Saved demo", sample: isSample, status: "ready" as const, text: body, body };
    }),
  };
}

export function readyDocs(w: Working) {
  return w.docs.filter((d) => d.status === "ready" && d.body);
}

export function docSections(doc: WorkingDoc) {
  return doc.body ? parseSections(doc.id, docMarkdown(doc.title, doc.body)).sections : [];
}

export function topicCount(w: Working) {
  return readyDocs(w).reduce((n, d) => n + docSections(d).length, 0);
}

export function uniqueDocId(title: string, docs: WorkingDoc[]) {
  const base = slugify(title);
  let id = base;
  for (let i = 2; docs.some((d) => d.id === id); i++) id = `${base}-${i}`;
  return id;
}

// What the server needs: the pack in its validated shape, ready documents only.
export function toPackData(w: Working): CustomPackData {
  const { docs, isSample: _isSample, ...rest } = w;
  void _isSample;
  const audience = rest.audience.filter((a) => a.role.trim());
  return {
    ...rest,
    displayName: rest.displayName.trim() || "My documents",
    organization: rest.organization.trim() || "Your organization",
    style: { ...rest.style, logoText: rest.style.logoText.trim() || (rest.organization.trim() || "PIVOT TRAINER").toUpperCase().slice(0, 30) },
    guardrails: rest.guardrails.map((g) => g.trim()).filter(Boolean),
    neverSay: rest.neverSay.map((n) => n.trim()).filter(Boolean),
    starterPrompts: rest.starterPrompts.map((s) => s.trim()).filter(Boolean).slice(0, 6),
    glossary: rest.glossary.filter((g) => g.term.trim() && g.definition.trim()),
    audience: audience.length ? audience : [{ role: "employees", notes: "" }],
    docs: docs
      .filter((d) => d.status === "ready" && d.body)
      .map((d) => ({ id: d.id, title: d.title, kind: d.kind, markdown: docMarkdown(d.title, d.body ?? "") })),
  };
}

// "people-manager" -> "People manager"
export function roleLabel(role: string) {
  const s = role.replace(/[-_]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Idea chips without an AI call: one per main topic that has text.
export function topicIdeas(w: Working, count = 3) {
  const ideas: string[] = [];
  for (const d of readyDocs(w)) {
    for (const s of docSections(d)) {
      if (!s.number.includes(".") && s.text.length > 40 && !/^(purpose|introduction|scope|why)/i.test(s.title)) {
        ideas.push(`A short training about "${s.title}"`);
      }
    }
  }
  return [...new Set(ideas)].slice(0, count);
}
