"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Flag, Question } from "@/lib/schemas";
import { CitationChips } from "./SourceDrawer";
import FlagNote from "./FlagNote";

type Props = {
  question: Question;
  mastered: number;
  total: number;
  retry: boolean; // this question was missed before: shuffle the answers
  slideNumber: number | null;
  flags: Flag[];
  onCorrect: () => void;
  onWrongContinue: () => void;
  onReviewSlide: () => void;
};

function shuffledOrder(n: number) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Multiple choice. A miss explains why, links to the exact slide, and the question
// comes back later with its answers in a new order.
export default function Quiz(props: Props) {
  const { question: q, mastered, total, retry, slideNumber, flags } = props;
  const [order] = useState(() => (retry ? shuffledOrder(q.choices.length) : q.choices.map((_, i) => i)));
  const [picked, setPicked] = useState<number | null>(null); // original choice index
  const [submitted, setSubmitted] = useState(false);
  const correct = submitted && picked === q.correctIndex;

  return (
    <motion.article key={q.id} className="pk-card p-6 sm:p-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-primary" aria-live="polite">
          {mastered} of {total} mastered
        </p>
        {retry && <span className="pk-chip">A second look</span>}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/5" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(mastered / total) * 100}%` }} />
      </div>
      <h2 className="pk-heading mt-4 text-2xl font-bold">{q.question}</h2>

      <fieldset className="mt-5 space-y-2" disabled={submitted}>
        <legend className="sr-only">Choose one answer</legend>
        {order.map((i) => {
          const c = q.choices[i];
          const isPicked = picked === i;
          const showRight = submitted && correct && i === q.correctIndex;
          const showWrong = submitted && isPicked && !correct;
          return (
            <label
              key={i}
              className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition ${
                showRight ? "border-success bg-success-bg" : showWrong ? "border-[#B91C1C] bg-[#FDECEC]" : isPicked ? "border-primary bg-primary/5" : "border-line hover:border-[#9AA6B5]"
              }`}
            >
              <input type="radio" name={q.id} className="mt-1 h-5 w-5 accent-[var(--pk-primary)]" checked={isPicked} onChange={() => setPicked(i)} />
              <span>
                {c}
                {showRight && <span className="ml-2 font-semibold text-success-ink">(correct)</span>}
                {showWrong && <span className="ml-2 font-semibold text-[#7F1D1D]">(not this one)</span>}
              </span>
            </label>
          );
        })}
      </fieldset>

      {!submitted && (
        <button type="button" className="pk-btn mt-5" disabled={picked === null} onClick={() => setSubmitted(true)}>
          Check my answer
        </button>
      )}

      {submitted && correct && (
        <motion.div className="mt-5 rounded-xl bg-success-bg p-4 text-success-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="font-semibold">✓ Correct</p>
          <p className="mt-1">{q.explanation}</p>
          <CitationChips className="mt-2" citations={q.citations} />
          <button type="button" className="pk-btn mt-4" onClick={props.onCorrect}>
            Next →
          </button>
        </motion.div>
      )}

      {submitted && !correct && (
        <motion.div className="mt-5 rounded-xl bg-[#FDECEC] p-4 text-[#7F1D1D]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="font-semibold">Not quite. Here&apos;s why:</p>
          <p className="mt-1">{q.explanation}</p>
          <p className="mt-2">We&apos;ll ask this one again before you finish.</p>
          <CitationChips className="mt-2" citations={q.citations} />
          <div className="mt-4 flex flex-wrap gap-2">
            {slideNumber !== null && (
              <button type="button" className="pk-btn" onClick={props.onReviewSlide}>
                Take a second look at slide {slideNumber} →
              </button>
            )}
            <button type="button" className="pk-btn-ghost" onClick={props.onWrongContinue}>
              Keep going
            </button>
          </div>
        </motion.div>
      )}
      <FlagNote flags={flags} />
    </motion.article>
  );
}
