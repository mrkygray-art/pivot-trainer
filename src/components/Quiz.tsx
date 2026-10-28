"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Flag, Question } from "@/lib/schemas";
import { CitationChips } from "./SourceDrawer";
import FlagNote from "./FlagNote";

type Props = {
  question: Question;
  number: number;
  remaining: number;
  retry: boolean; // this question was missed before
  slideNumber: number | null;
  flags: Flag[];
  onCorrect: () => void;
  onWrongContinue: () => void;
  onReviewSlide: () => void;
};

// Multiple choice with remediation: a miss explains why, links to the source
// slide, and the question comes back later in the queue.
export default function Quiz(props: Props) {
  const { question: q, number, remaining, retry, slideNumber, flags } = props;
  const [picked, setPicked] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = submitted && picked === q.correctIndex;

  return (
    <motion.article key={q.id} className="pk-card p-6 sm:p-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Question {number} · {remaining} left
        </p>
        {retry && <span className="pk-chip">Second try</span>}
      </div>
      <h2 className="pk-heading mt-2 text-2xl font-bold">{q.question}</h2>

      <fieldset className="mt-5 space-y-2" disabled={submitted}>
        <legend className="sr-only">Choices</legend>
        {q.choices.map((c, i) => {
          const isPicked = picked === i;
          const showRight = submitted && i === q.correctIndex && correct;
          const showWrong = submitted && isPicked && !correct;
          return (
            <label
              key={i}
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--pk-radius)] border-2 px-4 py-3 transition ${
                showRight ? "border-emerald-500 bg-emerald-50" : showWrong ? "border-red-400 bg-red-50" : isPicked ? "border-primary bg-primary/5" : "border-black/10 hover:border-black/25"
              }`}
            >
              <input type="radio" name={q.id} className="mt-1 accent-[var(--pk-primary)]" checked={isPicked} onChange={() => setPicked(i)} />
              <span>{c}</span>
            </label>
          );
        })}
      </fieldset>

      {!submitted && (
        <button type="button" className="pk-btn mt-5" disabled={picked === null} onClick={() => setSubmitted(true)}>
          Check answer
        </button>
      )}

      {submitted && correct && (
        <motion.div className="mt-5 rounded-md bg-emerald-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="font-semibold text-emerald-900">✓ Correct</p>
          <p className="mt-1 text-emerald-900">{q.explanation}</p>
          <CitationChips className="mt-2" citations={q.citations} />
          <button type="button" className="pk-btn mt-4" onClick={props.onCorrect}>
            Next →
          </button>
        </motion.div>
      )}

      {submitted && !correct && (
        <motion.div className="mt-5 rounded-md bg-red-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="font-semibold text-red-900">Not quite. Here&apos;s why:</p>
          <p className="mt-1 text-red-900">{q.explanation}</p>
          <p className="mt-2 text-sm text-red-900">This question will come back before you finish.</p>
          <CitationChips className="mt-2" citations={q.citations} />
          <div className="mt-4 flex flex-wrap gap-2">
            {slideNumber !== null && (
              <button type="button" className="pk-btn" onClick={props.onReviewSlide}>
                Review slide {slideNumber} →
              </button>
            )}
            <button type="button" className="pk-btn-ghost" onClick={props.onWrongContinue}>
              Continue the quiz
            </button>
          </div>
        </motion.div>
      )}
      <FlagNote flags={flags} />
    </motion.article>
  );
}
