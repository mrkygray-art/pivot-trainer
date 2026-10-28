"use client";

import { useState } from "react";
import { Card, StepFooter, StepIntro } from "./ui";
import { ALWAYS_ON_RULES, DEFAULT_BRAND, TOGGLE_RULES, TONES, toneId, type Working } from "./working";

type Props = {
  working: Working;
  setWorking: (fn: (w: Working) => Working) => void;
  suggestedTerms: { term: string; definition: string }[];
  onNext: () => void;
  onBack: () => void;
};

const ALWAYS_ON_LABELS = ["Use only my documents", "Show where it came from"];

export default function StepStyle({ working, setWorking, suggestedTerms, onNext, onBack }: Props) {
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [avoid, setAvoid] = useState("");
  const set = (patch: Partial<Working>) => setWorking((w) => ({ ...w, ...patch }));
  const currentTone = toneId(working.style.tone);

  const known = new Set([...ALWAYS_ON_RULES, ...TOGGLE_RULES.map((r) => r.text)]);
  // Rules that came with the sample or a saved demo, beyond the standard ones.
  const [extraRules] = useState(() => working.guardrails.filter((g) => !known.has(g)));

  function toggleRule(text: string, on: boolean) {
    setWorking((w) => ({ ...w, guardrails: on ? [...new Set([...w.guardrails, text])] : w.guardrails.filter((g) => g !== text) }));
  }

  function addTerm(t: string, m: string) {
    if (!t.trim() || !m.trim()) return;
    setWorking((w) => ({ ...w, glossary: [...w.glossary.filter((g) => g.term.toLowerCase() !== t.trim().toLowerCase()), { term: t.trim(), definition: m.trim() }] }));
  }

  function addAvoid() {
    const word = avoid.trim();
    if (!word) return;
    setWorking((w) => ({ ...w, neverSay: [...new Set([...w.neverSay, word])] }));
    setAvoid("");
  }

  const unusedSuggestions = suggestedTerms.filter((s) => !working.glossary.some((g) => g.term.toLowerCase() === s.term.toLowerCase())).slice(0, 6);

  return (
    <div>
      <StepIntro step="Step 2 of 4" title="Set your style and rules">
        <p>Everything here is optional and already set up. Change what you like, or go straight to the next step.</p>
      </StepIntro>

      <div className="space-y-6">
        <Card title="How should it sound?">
          <fieldset>
            <legend className="sr-only">Tone of the training</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {TONES.map((t) => (
                <label key={t.id} className="choice-card">
                  <input
                    type="radio"
                    name="tone"
                    checked={currentTone === t.id}
                    onChange={() => setWorking((w) => ({ ...w, style: { ...w.style, tone: t.tone } }))}
                  />
                  <span>
                    <span className="block font-semibold">{t.label}</span>
                    <span className="block text-sm text-subtle">{t.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card title="Rules the training follows">
          <fieldset className="space-y-3">
            <legend className="sr-only">Rules</legend>
            {ALWAYS_ON_LABELS.map((label) => (
              <label key={label} className="flex min-h-[44px] items-center gap-3">
                <input type="checkbox" checked disabled className="h-5 w-5 accent-[#1B4FD6]" />
                <span>
                  {label} <span className="text-subtle">(always on, so nothing gets made up)</span>
                </span>
              </label>
            ))}
            {TOGGLE_RULES.map((r) => (
              <label key={r.text} className="flex min-h-[44px] items-center gap-3">
                <input type="checkbox" className="h-5 w-5 accent-[#1B4FD6]" checked={working.guardrails.includes(r.text)} onChange={(e) => toggleRule(r.text, e.target.checked)} />
                <span>{r.label}</span>
              </label>
            ))}
            {extraRules.map((text) => (
              <label key={text} className="flex min-h-[44px] items-center gap-3">
                <input type="checkbox" className="h-5 w-5 accent-[#1B4FD6]" checked={working.guardrails.includes(text)} onChange={(e) => toggleRule(text, e.target.checked)} />
                <span>{text}</span>
              </label>
            ))}
          </fieldset>
        </Card>

        <Card title="Your words">
          <h3 className="text-lg font-bold">Key terms</h3>
          <p className="text-muted">Words with a specific meaning in your organization. The training uses your meaning exactly.</p>
          {working.glossary.length > 0 && (
            <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
              {working.glossary.map((g) => (
                <li key={g.term} className="flex items-start justify-between gap-3 px-4 py-2">
                  <span>
                    <span className="font-semibold">{g.term}:</span> {g.definition}
                  </span>
                  <button
                    className="min-h-[44px] shrink-0 px-2 text-subtle hover:text-[#9B1C1C]"
                    aria-label={`Remove the term ${g.term}`}
                    onClick={() => set({ glossary: working.glossary.filter((x) => x.term !== g.term) })}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          {unusedSuggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-subtle">Found in your documents:</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {unusedSuggestions.map((s) => (
                  <button key={s.term} type="button" className="pk-chip" onClick={() => addTerm(s.term, s.definition)} title={s.definition}>
                    + {s.term}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <label className="block">
              <span className="text-sm font-semibold">Term</span>
              <input className="app-input mt-1" value={term} onChange={(e) => setTerm(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">What it means</span>
              <input className="app-input mt-1" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
            </label>
            <button
              className="pk-btn-ghost"
              disabled={!term.trim() || !meaning.trim()}
              onClick={() => {
                addTerm(term, meaning);
                setTerm("");
                setMeaning("");
              }}
            >
              Add this term
            </button>
          </div>

          <h3 className="mt-8 text-lg font-bold">Words to avoid</h3>
          <p className="text-muted">The training will never use these words.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {working.neverSay.map((w) => (
              <span key={w} className="inline-flex items-center gap-1 rounded-full border border-line bg-[#FAFBFC] pl-3 text-sm">
                {w}
                <button className="min-h-[36px] min-w-[36px] text-subtle hover:text-[#9B1C1C]" aria-label={`Remove ${w} from words to avoid`} onClick={() => set({ neverSay: working.neverSay.filter((x) => x !== w) })}>
                  ✕
                </button>
              </span>
            ))}
          </div>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addAvoid();
            }}
          >
            <label className="sr-only" htmlFor="avoid">
              Word or phrase to avoid
            </label>
            <input id="avoid" className="app-input max-w-xs" value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="For example: guaranteed" />
            <button type="submit" className="pk-btn-ghost" disabled={!avoid.trim()}>
              Add to the list
            </button>
          </form>
        </Card>

        <Card title="Your organization">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <label className="block">
              <span className="font-semibold">Organization name</span>
              <span className="block text-sm text-subtle">Shown on the certificate.</span>
              <input className="app-input mt-1" value={working.organization} maxLength={120} onChange={(e) => set({ organization: e.target.value })} placeholder="For example: Brightfork Kitchens" />
            </label>
            <div>
              <span className="font-semibold">Brand color</span>
              <span className="block text-sm text-subtle">Used in the lesson and on the certificate.</span>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Brand color"
                  value={working.style.colors.primary}
                  onChange={(e) => setWorking((w) => ({ ...w, style: { ...w.style, colors: { ...w.style.colors, primary: e.target.value.toUpperCase() } } }))}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-line"
                />
                {working.style.colors.primary.toUpperCase() !== DEFAULT_BRAND && (
                  <button
                    className="pk-link text-sm"
                    onClick={() => setWorking((w) => ({ ...w, style: { ...w.style, colors: { ...w.style.colors, primary: DEFAULT_BRAND } } }))}
                  >
                    Use the default blue
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <StepFooter
        onBack={onBack}
        next={
          <button className="pk-btn" onClick={onNext}>
            Next: Describe the training →
          </button>
        }
      />
    </div>
  );
}
