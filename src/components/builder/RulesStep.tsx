"use client";

import { useState } from "react";
import { postJson } from "@/lib/client-api";
import { docMarkdown } from "@/lib/sections";
import type { RuleSuggestions } from "@/lib/schemas";
import { Card, Field, ListEditor, PairEditor, inputClass } from "./fields";
import type { Draft } from "./draft";

type Props = { draft: Draft; setDraft: (fn: (d: Draft) => Draft) => void };

const uniq = (items: string[]) => items.filter((x, i) => x.trim() && items.findIndex((y) => y.trim().toLowerCase() === x.trim().toLowerCase()) === i);

// Suggestions fill what's empty and add to lists; nothing the user typed is overwritten.
function applySuggestions(d: Draft, s: RuleSuggestions): Draft {
  const has = (v: string) => v.trim().length > 0;
  const audienceIsDefault = d.audience.length === 1 && d.audience[0].role === "staff" && !d.audience[0].notes;
  return {
    ...d,
    displayName: has(d.displayName) ? d.displayName : s.displayName,
    organization: has(d.organization) ? d.organization : s.organization,
    description: has(d.description) ? d.description : s.description,
    style: { ...d.style, tone: s.tone || d.style.tone, readingLevel: s.readingLevel || d.style.readingLevel },
    audience: audienceIsDefault ? s.audience : [...d.audience, ...s.audience.filter((a) => !d.audience.some((x) => x.role === a.role))],
    glossary: [...d.glossary, ...s.glossary.filter((g) => !d.glossary.some((x) => x.term.toLowerCase() === g.term.toLowerCase()))],
    guardrails: uniq([...d.guardrails, ...s.guardrails]),
    neverSay: uniq([...d.neverSay, ...s.neverSay]),
    starterPrompts: uniq([...d.starterPrompts, ...s.starterPrompts]),
  };
}

export default function RulesStep({ draft, setDraft }: Props) {
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setStyle = (patch: Partial<Draft["style"]>) => setDraft((d) => ({ ...d, style: { ...d.style, ...patch } }));

  async function suggest() {
    setSuggesting(true);
    setSuggestError(null);
    try {
      const { suggestions } = await postJson<{ suggestions: RuleSuggestions }>("/api/suggest-rules", {
        docs: draft.docs.map((d) => ({ title: d.title, markdown: docMarkdown(d.title, d.body ?? d.text) })),
      });
      setDraft((d) => applySuggestions(d, suggestions));
      setSuggested(true);
    } catch (e) {
      setSuggestError((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="pk-card flex flex-wrap items-center justify-between gap-3 border-primary/30 p-5">
        <div className="max-w-xl">
          <p className="font-bold">Draft the rules from your documents</p>
          <p className="text-sm text-neutral-600">
            Claude reads your documents and suggests a glossary, audience roles, guardrails, and a never-say list. It only fills blanks and adds to lists. Review everything before saving.
          </p>
          {suggested && <p className="mt-1 text-sm text-emerald-800">✓ Suggestions added below. Edit or remove anything that isn&apos;t right.</p>}
          {suggestError && <p className="mt-1 text-sm text-red-700">{suggestError}</p>}
        </div>
        <button className="pk-btn" onClick={suggest} disabled={suggesting}>
          {suggesting ? "Reading your documents…" : "✨ Suggest from my documents"}
        </button>
      </div>

      <Card title="About this pack">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pack name" hint="Shown in the pack switcher">
            <input className={inputClass} value={draft.displayName} maxLength={60} onChange={(e) => set({ displayName: e.target.value })} placeholder="e.g. Kitchen Safety" />
          </Field>
          <Field label="Organization">
            <input className={inputClass} value={draft.organization} maxLength={120} onChange={(e) => set({ organization: e.target.value })} placeholder="e.g. Brightfork Kitchens" />
          </Field>
          <Field label="Short description" hint="One line on what these documents cover">
            <input className={inputClass} value={draft.description} maxLength={300} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <Field label="Logo text" hint="Leave blank to use the pack name">
            <input className={inputClass} value={draft.style.logoText} maxLength={30} onChange={(e) => setStyle({ logoText: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card title="Audience roles" hint="Who the trainings are for. The learner picks one when asking for a training.">
        <PairEditor rows={draft.audience} keys={["role", "notes"]} labels={["Role", "What they need from the training"]} onChange={(audience) => set({ audience })} addLabel="Add role" />
      </Card>

      <Card title="Guardrails" hint="Rules the AI must follow every time, such as disclaimers, escalation language, or topics to avoid.">
        <ListEditor items={draft.guardrails} onChange={(guardrails) => set({ guardrails })} placeholder="e.g. This is training, not legal advice." addLabel="Add guardrail" />
      </Card>

      <Card title="Never-say list" hint="Words or claims that must never appear. Checked on every generated training.">
        <ListEditor items={draft.neverSay} onChange={(neverSay) => set({ neverSay })} placeholder="e.g. guaranteed" addLabel="Add phrase" />
      </Card>

      <Card title="Glossary" hint="Approved terms. The AI uses these exact definitions, and learners can see them as flip cards.">
        <PairEditor rows={draft.glossary} keys={["term", "definition"]} labels={["Term", "Approved definition"]} onChange={(glossary) => set({ glossary })} addLabel="Add term" multilineSecond />
      </Card>

      <Card title="Style" hint="How trainings from this pack sound and look.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tone">
            <input className={inputClass} value={draft.style.tone} onChange={(e) => setStyle({ tone: e.target.value })} />
          </Field>
          <Field label="Reading level">
            <input className={inputClass} value={draft.style.readingLevel} onChange={(e) => setStyle({ readingLevel: e.target.value })} />
          </Field>
          <Field label="Sentence length">
            <input className={inputClass} value={draft.style.sentenceLength} onChange={(e) => setStyle({ sentenceLength: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Preferences" hint='For example "short steps" or "lead with the why"'>
            <ListEditor items={draft.style.preferences} onChange={(preferences) => setStyle({ preferences })} placeholder="e.g. use numbered procedures" addLabel="Add preference" />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          {(["primary", "accent", "background"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm font-semibold capitalize">
              <input
                type="color"
                value={draft.style.colors[k]}
                onChange={(e) => setStyle({ colors: { ...draft.style.colors, [k]: e.target.value.toUpperCase() } })}
                className="h-9 w-12 cursor-pointer rounded border border-black/15"
              />
              {k} color
            </label>
          ))}
          <fieldset className="flex items-center gap-3 text-sm">
            <legend className="sr-only">Font</legend>
            <span className="font-semibold">Font</span>
            {(["sans", "serif"] as const).map((f) => (
              <label key={f} className="flex items-center gap-1">
                <input type="radio" checked={draft.style.look.font === f} onChange={() => setStyle({ look: { ...draft.style.look, font: f } })} />
                {f === "sans" ? "Sans-serif" : "Serif"}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex items-center gap-3 text-sm">
            <legend className="sr-only">Corners</legend>
            <span className="font-semibold">Corners</span>
            {(["sharp", "soft"] as const).map((c) => (
              <label key={c} className="flex items-center gap-1">
                <input type="radio" checked={draft.style.look.corners === c} onChange={() => setStyle({ look: { ...draft.style.look, corners: c } })} />
                {c === "sharp" ? "Sharp" : "Rounded"}
              </label>
            ))}
          </fieldset>
        </div>
      </Card>

      <Card title="Starter requests" hint="Suggested training requests shown on the start screen.">
        <ListEditor items={draft.starterPrompts} onChange={(starterPrompts) => set({ starterPrompts })} placeholder="Build a short training on…" addLabel="Add request" />
      </Card>
    </div>
  );
}
