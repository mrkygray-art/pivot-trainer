"use client";

import type { GeneratedTraining } from "@/lib/schemas";
import { Card, StepIntro } from "./ui";
import { ACTIVITY_LABELS } from "../labels";

type Props = {
  generated: GeneratedTraining;
  learner: string;
  setLearner: (v: string) => void;
  onStart: () => void;
  onBack: () => void;
};

export default function ReadyScreen({ generated, learner, setLearner, onStart, onBack }: Props) {
  const t = generated.training;
  const flagged = new Set(generated.flags.map((f) => f.itemId.split(".")[0])).size;
  const name = learner.trim();

  return (
    <div className="mx-auto max-w-2xl">
      <StepIntro step="Your training is ready" title={t.title}>
        <p>{t.summary}</p>
      </StepIntro>

      <Card title="What's inside">
        <ul className="space-y-1">
          <li>✓ {t.slides.length} slides, each showing where it came from in your documents</li>
          <li>✓ 1 interactive activity: {ACTIVITY_LABELS[t.activity.type].toLowerCase()}</li>
          <li>✓ {t.quiz.length} quiz questions. A missed question shows the exact part of the document, then asks again.</li>
        </ul>
        <p className="mt-4 rounded-xl bg-[#F3F6FA] px-4 py-3">
          {flagged === 0
            ? "We checked every slide and question against your documents. Everything matched."
            : `We checked every slide and question against your documents. ${flagged} ${flagged === 1 ? "item" : "items"} could not be fully matched; ${flagged === 1 ? "it is" : "they are"} marked in the lesson so you can take a closer look.`}
        </p>
      </Card>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (name) onStart();
        }}
      >
        <Card>
          <label htmlFor="learner" className="text-xl font-bold app-heading">
            What name should appear on your certificate?
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <input
              id="learner"
              className="app-input min-w-0 flex-1"
              value={learner}
              onChange={(e) => setLearner(e.target.value)}
              maxLength={60}
              placeholder="First and last name"
              autoComplete="name"
            />
            <button type="submit" className="pk-btn" disabled={!name}>
              Start the lesson →
            </button>
          </div>
        </Card>
      </form>

      <button className="pk-btn-ghost mt-6" onClick={onBack}>
        ← Back to Step 3
      </button>
    </div>
  );
}
