import { DEFAULT_GUARDRAILS, slugify, type CustomPackData } from "@/lib/custom-pack";
import type { DocKind } from "@/lib/pack-types";
import { docMarkdown, parseSections } from "@/lib/sections";

export type SectionMethod = "numbered" | "headings" | "claude" | "edited";

export type DraftDoc = {
  id: string;
  title: string;
  kind: DocKind;
  source: string; // "Pasted text" or the file name
  text: string; // as pasted or extracted
  body: string | null; // markdown with "## N Title" sections, once sectioned
  method?: SectionMethod;
};

export type Draft = Omit<CustomPackData, "docs"> & { docs: DraftDoc[]; editing: boolean };

export function newDraft(): Draft {
  return {
    name: `custom-${Date.now().toString(36)}`,
    displayName: "",
    organization: "",
    description: "",
    style: {
      tone: "clear, practical, respectful",
      readingLevel: "plain, 8th grade",
      sentenceLength: "short",
      colors: { primary: "#4F46E5", accent: "#D97706", background: "#F8FAFC" },
      logoText: "",
      preferences: [],
      look: { font: "sans", corners: "soft" },
    },
    guardrails: [...DEFAULT_GUARDRAILS],
    audience: [{ role: "staff", notes: "" }],
    glossary: [],
    neverSay: ["guaranteed"],
    starterPrompts: [],
    docs: [],
    editing: false,
  };
}

export function uniqueDocId(title: string, docs: DraftDoc[]) {
  const base = slugify(title);
  let id = base;
  for (let i = 2; docs.some((d) => d.id === id); i++) id = `${base}-${i}`;
  return id;
}

export function draftSections(doc: DraftDoc) {
  return doc.body ? parseSections(doc.id, docMarkdown(doc.title, doc.body)).sections : [];
}

export function toPackData(d: Draft): CustomPackData {
  const { docs, ...withFlag } = d;
  const rest: Omit<Draft, "docs" | "editing"> = { ...withFlag };
  delete (rest as Partial<Draft>).editing;
  return {
    ...rest,
    style: { ...rest.style, logoText: rest.style.logoText.trim() || rest.displayName.trim().toUpperCase().slice(0, 30) },
    guardrails: rest.guardrails.map((g) => g.trim()).filter(Boolean),
    neverSay: rest.neverSay.map((n) => n.trim()).filter(Boolean),
    starterPrompts: rest.starterPrompts.map((s) => s.trim()).filter(Boolean),
    glossary: rest.glossary.filter((g) => g.term.trim() && g.definition.trim()),
    audience: rest.audience.filter((a) => a.role.trim()),
    docs: docs.map((doc) => ({ id: doc.id, title: doc.title, kind: doc.kind, markdown: docMarkdown(doc.title, doc.body ?? "") })),
  };
}

// Opening a saved pack in the builder: its docs are already sectioned.
export function fromPackData(p: CustomPackData): Draft {
  return {
    ...p,
    editing: true,
    docs: p.docs.map((doc) => {
      const body = doc.markdown.replace(/^# .*\r?\n/, "").trim();
      return { id: doc.id, title: doc.title, kind: doc.kind, source: "Saved pack", text: body, body, method: "edited" as const };
    }),
  };
}
