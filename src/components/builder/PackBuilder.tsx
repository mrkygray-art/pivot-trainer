"use client";

import { useEffect, useState } from "react";
import { CustomPackData } from "@/lib/custom-pack";
import { storage } from "@/lib/storage";
import DocumentsStep from "./DocumentsStep";
import SectionsStep from "./SectionsStep";
import RulesStep from "./RulesStep";
import ReviewStep, { reviewProblems } from "./ReviewStep";
import { draftSections, fromPackData, newDraft, toPackData, type Draft, type DraftDoc } from "./draft";

const STEPS = ["Documents", "Sections", "Rules", "Review"] as const;

type Props = {
  editPack: CustomPackData | null;
  onSaved: (pack: CustomPackData) => void;
  onCancel: () => void;
};

// Stage A: set up the knowledge base (documents -> sections -> rules -> review) before any training is built.
export default function PackBuilder({ editPack, onSaved, onCancel }: Props) {
  // A new pack resumes any unsaved draft; editing starts from the saved pack.
  const [draft, setDraftState] = useState<Draft>(() => (editPack ? fromPackData(editPack) : (storage.draft<Draft>() ?? newDraft())));
  const [step, setStep] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft.editing) storage.saveDraft(draft);
  }, [draft]);

  const setDraft = (fn: (d: Draft) => Draft) => setDraftState(fn);
  const setDocs = (fn: (docs: DraftDoc[]) => DraftDoc[]) => setDraftState((d) => ({ ...d, docs: fn(d.docs) }));

  const canLeave = [
    draft.docs.length > 0,
    draft.docs.length > 0 && draft.docs.every((d) => draftSections(d).length > 0),
    true,
    true,
  ];
  const blockedReason = ["Add at least one document to continue.", "Wait for every document to have sections.", "", ""][step];

  function save() {
    const parsed = CustomPackData.safeParse(toPackData(draft));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setSaveError(`${issue.path.join(" › ")}: ${issue.message}`);
      return;
    }
    storage.saveCustomPack(parsed.data);
    storage.clearDraft();
    onSaved(parsed.data);
  }

  async function importPack(file: File | undefined) {
    if (!file) return;
    setImportError(null);
    try {
      const parsed = CustomPackData.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Not a Pivot Trainer pack file.");
      const taken = storage.customPacks().some((p) => p.name === parsed.data.name);
      const data = taken ? { ...parsed.data, name: `custom-${Date.now().toString(36)}` } : parsed.data;
      setDraftState({ ...fromPackData(data), editing: false });
      setStep(3);
    } catch (e) {
      setImportError(`Couldn't import that file: ${(e as Error).message}`);
    }
  }

  function startOver() {
    if (!confirm("Discard this draft and start over?")) return;
    storage.clearDraft();
    setDraftState(newDraft());
    setStep(0);
  }

  const problems = reviewProblems(draft);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">Stage A · Set up the knowledge base</p>
          <h1 className="pk-heading text-3xl font-bold">{draft.editing ? `Edit pack: ${draft.displayName}` : "New content pack"}</h1>
          <p className="mt-1 max-w-2xl text-neutral-600">Add your SOPs, policies, and guidelines, check how they&apos;re split into citable sections, and set the rules. Trainings come after.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!draft.editing && (
            <label className="pk-btn-ghost cursor-pointer text-sm">
              Import pack file
              <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => importPack(e.target.files?.[0])} />
            </label>
          )}
          {!draft.editing && draft.docs.length > 0 && (
            <button className="pk-btn-ghost text-sm" onClick={startOver}>
              Start over
            </button>
          )}
          <button className="pk-btn-ghost text-sm" onClick={onCancel}>
            {draft.editing ? "Cancel" : "Close (draft is kept)"}
          </button>
        </div>
      </div>
      {importError && <p className="mt-2 text-sm text-red-700">{importError}</p>}

      <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Pack builder steps">
        {STEPS.map((label, i) => {
          const reachable = i <= step || canLeave.slice(0, i).every(Boolean);
          return (
            <li key={label}>
              <button
                disabled={!reachable}
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={`w-full rounded-[var(--pk-radius)] border-b-4 px-2 py-2 text-left text-sm font-semibold transition ${
                  i === step ? "border-primary text-primary" : i < step ? "border-primary/40 text-neutral-700" : "border-black/10 text-neutral-400"
                }`}
              >
                <span className="block text-xs font-normal">Step {i + 1}</span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        {step === 0 && <DocumentsStep docs={draft.docs} setDocs={setDocs} />}
        {step === 1 && <SectionsStep docs={draft.docs} setDocs={setDocs} />}
        {step === 2 && <RulesStep draft={draft} setDraft={setDraft} />}
        {step === 3 && <ReviewStep draft={draft} />}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button className="pk-btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          ← Back
        </button>
        <div className="flex items-center gap-3">
          {!canLeave[step] && <p className="text-sm text-neutral-500">{blockedReason}</p>}
          {step < 3 ? (
            <button className="pk-btn" disabled={!canLeave[step]} onClick={() => setStep((s) => s + 1)}>
              Next: {STEPS[step + 1]} →
            </button>
          ) : (
            <button className="pk-btn" disabled={problems.length > 0} onClick={save}>
              {draft.editing ? "Save changes" : "Save pack"}
            </button>
          )}
        </div>
      </div>
      {saveError && <p className="mt-2 text-right text-sm text-red-700">Couldn&apos;t save. {saveError}</p>}
    </section>
  );
}
