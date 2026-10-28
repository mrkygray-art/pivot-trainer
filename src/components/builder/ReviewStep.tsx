"use client";

import { DOC_KIND_LABELS } from "@/lib/pack-types";
import { Card } from "./fields";
import { draftSections, type Draft } from "./draft";

export function reviewProblems(d: Draft): string[] {
  const problems: string[] = [];
  if (!d.displayName.trim()) problems.push("Give the pack a name (Rules step, About this pack).");
  if (!d.organization.trim()) problems.push("Add the organization name (Rules step, About this pack).");
  if (d.docs.length === 0) problems.push("Add at least one document.");
  for (const doc of d.docs) {
    if (!doc.title.trim()) problems.push("Every document needs a title.");
    if (draftSections(doc).length === 0) problems.push(`"${doc.title}" has no sections yet (Sections step).`);
  }
  if (!d.audience.some((a) => a.role.trim())) problems.push("Add at least one audience role.");
  return [...new Set(problems)];
}

export default function ReviewStep({ draft }: { draft: Draft }) {
  const problems = reviewProblems(draft);
  const totalSections = draft.docs.reduce((n, d) => n + draftSections(d).length, 0);
  const logo = draft.style.logoText.trim() || draft.displayName.trim().toUpperCase() || "YOUR PACK";

  return (
    <div className="space-y-6">
      <div
        className="overflow-hidden border border-black/10"
        style={{ background: draft.style.colors.background, borderRadius: draft.style.look.corners === "soft" ? 16 : 4 }}
      >
        <div className="flex items-center justify-between bg-white/80 px-5 py-3">
          <span
            className="text-lg font-bold tracking-wider"
            style={{ color: draft.style.colors.primary, fontFamily: draft.style.look.font === "serif" ? "var(--font-serif)" : "var(--font-geist-sans)" }}
          >
            {logo}
          </span>
          <span className="text-xs text-neutral-500">Preview of the pack&apos;s look</span>
        </div>
        <div className="px-5 py-6" style={{ fontFamily: draft.style.look.font === "serif" ? "var(--font-serif)" : "var(--font-geist-sans)" }}>
          <p className="text-2xl font-bold">{draft.displayName || "Pack name"}</p>
          <p className="text-neutral-600">{draft.description || "Short description"}</p>
          <span
            className="mt-3 inline-block px-4 py-2 font-semibold text-white"
            style={{ background: draft.style.colors.primary, borderRadius: draft.style.look.corners === "soft" ? 16 : 4 }}
          >
            Check coverage →
          </span>
          <span className="ml-3 text-sm font-semibold" style={{ color: draft.style.colors.accent }}>
            Accent color
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Knowledge base" hint={`${draft.docs.length} documents · ${totalSections} citable sections`}>
          <ul className="space-y-1 text-sm">
            {draft.docs.map((d) => (
              <li key={d.id}>
                <span className="pk-chip mr-2">{DOC_KIND_LABELS[d.kind]}</span>
                {d.title} <span className="text-neutral-500">({draftSections(d).length} sections)</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Rules">
          <ul className="space-y-1 text-sm">
            <li>{draft.audience.filter((a) => a.role.trim()).length} audience roles: {draft.audience.map((a) => a.role).filter(Boolean).join(", ")}</li>
            <li>{draft.guardrails.filter((g) => g.trim()).length} guardrails</li>
            <li>{draft.neverSay.filter((n) => n.trim()).length} never-say phrases</li>
            <li>{draft.glossary.filter((g) => g.term.trim()).length} glossary terms</li>
            <li>Tone: {draft.style.tone}</li>
            <li>Reading level: {draft.style.readingLevel}</li>
          </ul>
        </Card>
      </div>

      {problems.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Before saving:</p>
          <ul className="mt-1 list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="font-semibold text-emerald-800">✓ Ready to save. The pack is stored in this browser; use Export to keep a copy or move it.</p>
      )}
    </div>
  );
}
