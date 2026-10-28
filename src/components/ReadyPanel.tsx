"use client";

import type { GeneratedTraining } from "@/lib/schemas";
import { collectCitationCount } from "./trainingStats";
import { ACTIVITY_LABELS } from "./OutlinePanel";
import FlagNote from "./FlagNote";

export default function ReadyPanel(props: {
  generated: GeneratedTraining;
  learner: string;
  setLearner: (v: string) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const { generated, learner, setLearner, onStart, onBack } = props;
  const t = generated.training;
  const flags = generated.flags;
  const citations = collectCitationCount(t);
  const name = learner.trim();

  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-sm text-neutral-500">Ready</p>
      <h1 className="pk-heading mt-1 text-3xl font-bold">{t.title}</h1>
      <p className="mt-2 text-neutral-600">{t.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="pk-chip">{t.slides.length} slides</span>
        <span className="pk-chip">{ACTIVITY_LABELS[t.activity.type]}</span>
        <span className="pk-chip">{t.quiz.length} quiz questions</span>
        <span className="pk-chip">{citations} citations</span>
      </div>

      <div className="pk-card mt-6 p-5">
        <h2 className="font-bold">Verification report</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>✓ Every citation checked in code: the section exists and the quote appears word-for-word.</li>
          <li>✓ Never-say list checked on all learner-facing text.</li>
          <li>✓ Each claim re-checked against its source by a second model ({generated.verifiedBy}).</li>
        </ul>
        {flags.length === 0 ? (
          <p className="mt-3 font-semibold text-emerald-800">No problems found.</p>
        ) : (
          <>
            <p className="mt-3 font-semibold text-amber-800">
              {flags.length} item{flags.length === 1 ? "" : "s"} flagged. They stay marked in the training so a reviewer can see them.
            </p>
            <FlagNote flags={flags.map((f) => ({ ...f, message: `${f.itemId}: ${f.message}` }))} />
          </>
        )}
      </div>

      <form
        className="pk-card mt-6 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (name) onStart();
        }}
      >
        <label htmlFor="learner" className="font-bold">
          Your name (for the certificate)
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="learner"
            value={learner}
            onChange={(e) => setLearner(e.target.value)}
            maxLength={60}
            placeholder="First and last name"
            autoComplete="name"
            className="min-w-0 flex-1 rounded-[var(--pk-radius)] border border-black/15 px-3 py-2"
          />
          <button type="submit" className="pk-btn" disabled={!name}>
            Start training →
          </button>
        </div>
      </form>

      <button className="pk-btn-ghost mt-6" onClick={onBack}>
        ← Start over
      </button>
    </section>
  );
}
