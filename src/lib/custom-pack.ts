// Packs created in the pack builder. Stored in the browser and sent with each
// request; the server validates them and rebuilds sections itself.
import { z } from "zod";
import type { Pack } from "./pack-types";
import { glossarySections, parseSections } from "./sections";

const MAX_DOC_CHARS = 100_000;
const MAX_TOTAL_CHARS = 150_000;

const shortText = (max: number) => z.string().trim().max(max);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const CustomDoc = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  title: shortText(160).min(1),
  kind: z.enum(["sop", "policy", "guideline"]),
  markdown: z.string().max(MAX_DOC_CHARS),
});
export type CustomDoc = z.infer<typeof CustomDoc>;

export const CustomPackData = z
  .object({
    name: z.string().regex(/^custom-[a-z0-9-]{1,80}$/),
    displayName: shortText(60).min(1),
    organization: shortText(120).min(1),
    description: shortText(300),
    style: z.object({
      tone: shortText(200),
      readingLevel: shortText(80),
      sentenceLength: shortText(80),
      colors: z.object({ primary: hexColor, accent: hexColor, background: hexColor }),
      logoText: shortText(30),
      preferences: z.array(shortText(120)).max(12),
      look: z.object({ font: z.enum(["sans", "serif"]), corners: z.enum(["sharp", "soft"]) }),
    }),
    guardrails: z.array(shortText(300)).max(20),
    audience: z.array(z.object({ role: shortText(60).min(1), notes: shortText(200) })).min(1).max(8),
    glossary: z.array(z.object({ term: shortText(80).min(1), definition: shortText(400).min(1) })).max(60),
    neverSay: z.array(shortText(80).min(1)).max(60),
    starterPrompts: z.array(shortText(200)).max(6),
    docs: z.array(CustomDoc).min(1).max(20),
  })
  .refine((p) => p.docs.reduce((n, d) => n + d.markdown.length, 0) <= MAX_TOTAL_CHARS, {
    message: `Documents are too long in total (limit ${MAX_TOTAL_CHARS.toLocaleString()} characters).`,
  });
export type CustomPackData = z.infer<typeof CustomPackData>;

export function customToPack(data: CustomPackData): Pack {
  const sections = data.docs.flatMap((d) => parseSections(d.id, d.markdown).sections);
  return {
    ...data,
    docs: data.docs.map((d) => ({ id: d.id, title: d.title, kind: d.kind })),
    sections: [...sections, ...glossarySections(data.glossary)],
    samples: [],
    custom: true,
  };
}

export const DEFAULT_GUARDRAILS = [
  "Answer only from the knowledge base.",
  "Cite document and section for every slide and question.",
  "If not covered, say it is not covered.",
];

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "doc"
  );
}
