"use client";

import { useRef, useState } from "react";
import { DOC_KIND_LABELS, type Pack } from "@/lib/pack-types";
import type { GeneratedTraining } from "@/lib/schemas";
import { storage } from "@/lib/storage";
import { speechSupported, startDictation } from "@/lib/speech";

export default function AskPanel(props: {
  pack: Pack;
  request: string;
  setRequest: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  busy: boolean;
  onSubmit: () => void;
  onOpenTraining: (g: GeneratedTraining) => void;
  onNewPack: () => void;
  // Only for packs made in the builder.
  onEditPack?: () => void;
  onExportPack?: () => void;
  onDeletePack?: () => void;
}) {
  const { pack, request, setRequest, role, setRole, busy, onSubmit, onOpenTraining } = props;
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  // Only ever rendered in the browser (after packs load) and keyed by pack, so these read once at mount.
  const [micOk] = useState(() => speechSupported());
  const [last] = useState<GeneratedTraining | null>(() => storage.lastTraining(pack.name));
  const stopRef = useRef<() => void>(() => {});

  function toggleMic() {
    if (listening) {
      stopRef.current();
      return;
    }
    setMicError(null);
    setListening(true);
    stopRef.current = startDictation({
      onText: (text) => setRequest(text),
      onError: setMicError,
      onEnd: () => setListening(false),
    });
  }

  const canSubmit = request.trim().length >= 3 && !busy;

  return (
    <section>
      <h1 className="pk-heading text-3xl sm:text-4xl font-bold text-neutral-900">What training do you need?</h1>
      <p className="mt-2 max-w-2xl text-neutral-600">{pack.description} Everything is built only from these documents, with a citation on every slide and question.</p>

      <form
        className="pk-card mt-6 p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit();
        }}
      >
        <label htmlFor="request" className="text-sm font-semibold text-neutral-700">
          Describe it, or press the mic and say it
        </label>
        <div className="mt-2 flex gap-2">
          <textarea
            id="request"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSubmit) onSubmit();
              }
            }}
            rows={2}
            maxLength={500}
            placeholder="Build a short training on…"
            className="flex-1 resize-none rounded-[var(--pk-radius)] border border-black/15 px-3 py-2 text-base outline-none focus:border-primary"
          />
          {micOk && (
            <button
              type="button"
              onClick={toggleMic}
              aria-pressed={listening}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              className={`shrink-0 rounded-[var(--pk-radius)] border px-4 text-sm font-semibold transition ${
                listening ? "border-red-300 bg-red-50 text-red-700 animate-pulse" : "border-black/15 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {listening ? "● Listening" : "🎤 Speak"}
            </button>
          )}
        </div>
        {micError && <p className="mt-2 text-sm text-amber-700">{micError}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            Audience
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-[var(--pk-radius)] border border-black/15 bg-white px-2 py-1.5"
            >
              {pack.audience.map((a) => (
                <option key={a.role} value={a.role}>
                  {a.role}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="pk-btn" disabled={!canSubmit}>
            {busy ? "Checking the documents…" : "Check coverage →"}
          </button>
        </div>
      </form>

      {pack.starterPrompts.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Try one</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pack.starterPrompts.map((p) => (
              <button key={p} type="button" onClick={() => setRequest(p)} className="pk-btn-ghost text-sm font-medium">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {(pack.samples.length > 0 || last) && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Or open a ready-made training</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {last && (
              <TrainingCard label="Your last build" g={last} onOpen={() => onOpenTraining(last)} />
            )}
            {pack.samples.map((s) => (
              <TrainingCard key={s.createdAt} label="Example (illustration only)" g={s} onOpen={() => onOpenTraining(s)} />
            ))}
          </div>
        </div>
      )}

      <details className="mt-8 text-sm text-neutral-600" open={pack.custom}>
        <summary className="cursor-pointer font-semibold">What&apos;s in this pack?</summary>
        <ul className="mt-2 list-disc pl-5">
          {pack.docs.map((d) => (
            <li key={d.id}>
              {d.kind && <span className="font-semibold">{DOC_KIND_LABELS[d.kind]}: </span>}
              {d.title} ({pack.sections.filter((s) => s.docId === d.id).length} sections)
            </li>
          ))}
          <li>Glossary of {pack.glossary.length} approved terms</li>
          <li>
            {pack.guardrails.length} guardrails · {pack.neverSay.length} never-say phrases · roles: {pack.audience.map((a) => a.role).join(", ")}
          </li>
        </ul>
        <p className="mt-2">Tone: {pack.style.tone}. Reading level: {pack.style.readingLevel}.</p>
        {pack.custom && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="pk-btn-ghost px-3 py-1.5 text-sm" onClick={props.onEditPack}>
              Edit documents and rules
            </button>
            <button className="pk-btn-ghost px-3 py-1.5 text-sm" onClick={props.onExportPack}>
              Export pack file
            </button>
            <button className="px-3 py-1.5 text-sm text-neutral-500 hover:text-red-700" onClick={props.onDeletePack}>
              Delete pack
            </button>
          </div>
        )}
      </details>

      {!pack.custom && (
        <div className="pk-card mt-8 flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="max-w-xl">
            <p className="font-bold">Have your own SOPs, policies, or guidelines?</p>
            <p className="text-sm text-neutral-600">
              Set up a knowledge base first: add documents, check the citable sections, and set the rules. Then build trainings from it.
            </p>
          </div>
          <button className="pk-btn" onClick={props.onNewPack}>
            + Create a content pack
          </button>
        </div>
      )}
    </section>
  );
}

function TrainingCard({ label, g, onOpen }: { label: string; g: GeneratedTraining; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="pk-card p-4 text-left hover:border-primary/40">
      <p className="text-xs font-semibold text-accent">{label}</p>
      <p className="pk-heading mt-1 font-bold">{g.training.title}</p>
      <p className="mt-1 text-sm text-neutral-600">
        {g.training.slides.length} slides · 1 activity · {g.training.quiz.length} questions
      </p>
    </button>
  );
}
