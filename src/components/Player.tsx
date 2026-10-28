"use client";

import { useCallback, useState } from "react";
import type { GeneratedTraining } from "@/lib/schemas";
import ContentSlide from "./ContentSlide";
import Quiz from "./Quiz";
import FlagNote from "./FlagNote";
import { flagsFor } from "./trainingStats";
import { ACTIVITY_LABELS } from "./labels";
import ProcessFlow from "./activities/ProcessFlow";
import Timeline from "./activities/Timeline";
import ScenarioChat from "./activities/ScenarioChat";
import SortActivity from "./activities/SortActivity";
import FlipCards from "./activities/FlipCards";

type Phase = "slides" | "activity" | "quiz";

type Props = {
  generated: GeneratedTraining;
  learner: string;
  // Practice mode: only these questions, then back to the results.
  practiceIds?: string[];
  // Called only when every question has been answered correctly.
  onMastered: (reviewedIds: string[]) => void;
  onExit: () => void;
};

// Pass rule: the lesson ends only when every question is answered correctly.
// No skipping, no partial pass, unlimited retries.
export default function Player({ generated, learner, practiceIds, onMastered, onExit }: Props) {
  const t = generated.training;
  const practicing = !!practiceIds;
  const questionIds = practiceIds ?? t.quiz.map((q) => q.id);
  const [phase, setPhase] = useState<Phase>(practicing ? "quiz" : "slides");
  const [slideIndex, setSlideIndex] = useState(0);
  const [activityDone, setActivityDone] = useState(false);
  const [queue, setQueue] = useState<string[]>(questionIds);
  const [reviewed, setReviewed] = useState<string[]>([]); // missed at least once
  const [attempts, setAttempts] = useState(0);
  const [reviewingFor, setReviewingFor] = useState<string | null>(null);

  const markActivityDone = useCallback(() => setActivityDone(true), []);
  const current = t.quiz.find((q) => q.id === queue[0]);
  const mastered = questionIds.length - queue.length;
  const totalSteps = practicing ? questionIds.length : t.slides.length + 1 + questionIds.length;
  const doneSteps = practicing
    ? mastered
    : reviewingFor || phase === "quiz"
      ? t.slides.length + 1 + mastered
      : phase === "activity"
        ? t.slides.length
        : slideIndex;

  function answered(correct: boolean) {
    if (!current) return;
    setAttempts((n) => n + 1);
    const rest = queue.slice(1);
    if (correct) {
      setQueue(rest);
      if (rest.length === 0) onMastered(reviewed);
    } else {
      // Ask again before the lesson can finish.
      setQueue([...rest, current.id]);
    }
  }

  function markReviewed() {
    if (current && !reviewed.includes(current.id)) setReviewed((r) => [...r, current.id]);
  }

  function reviewSlide() {
    if (!current) return;
    const idx = t.slides.findIndex((s) => s.id === current.sourceSlideId);
    answered(false);
    setReviewingFor(current.id);
    setSlideIndex(Math.max(0, idx));
    setPhase("slides");
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-subtle">{practicing ? "Practice" : `Learner: ${learner}`}</p>
          <h1 className="pk-heading text-2xl font-bold">{t.title}</h1>
        </div>
        <button className="pk-btn-ghost text-sm" onClick={onExit}>
          {practicing ? "Back to results" : "Leave the lesson"}
        </button>
      </div>
      <div
        className="mb-6 h-2 w-full overflow-hidden rounded-full bg-black/5"
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={0}
        aria-valuemax={totalSteps}
        aria-valuenow={doneSteps}
      >
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(doneSteps / totalSteps) * 100}%` }} />
      </div>

      {phase === "slides" && (
        <>
          {reviewingFor && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <p>
                <span className="font-semibold">A second look</span> at the slide behind the question you missed. The question is waiting for you.
              </p>
              <button
                className="pk-btn"
                onClick={() => {
                  setReviewingFor(null);
                  setPhase("quiz");
                }}
              >
                Back to the quiz →
              </button>
            </div>
          )}
          <ContentSlide slide={t.slides[slideIndex]} index={slideIndex} total={t.slides.length} flags={flagsFor(generated.flags, t.slides[slideIndex].id)} />
          {!reviewingFor && (
            <div className="mt-5 flex justify-between gap-3">
              <button className="pk-btn-ghost" disabled={slideIndex === 0} onClick={() => setSlideIndex((i) => i - 1)}>
                ← Back
              </button>
              <button className="pk-btn" onClick={() => (slideIndex < t.slides.length - 1 ? setSlideIndex((i) => i + 1) : setPhase("activity"))}>
                {slideIndex < t.slides.length - 1 ? "Next slide →" : `Next: ${ACTIVITY_LABELS[t.activity.type]} →`}
              </button>
            </div>
          )}
        </>
      )}

      {phase === "activity" && (
        <>
          <article className="pk-card p-6 sm:p-8">
            <p className="font-semibold text-accent">{ACTIVITY_LABELS[t.activity.type]}</p>
            <h2 className="pk-heading mt-2 text-2xl font-bold">{t.activity.title}</h2>
            {"intro" in t.activity && <p className="mt-2 text-muted">{t.activity.intro}</p>}
            <div className="mt-6">
              {t.activity.type === "process_flow" && <ProcessFlow activity={t.activity} onDone={markActivityDone} />}
              {t.activity.type === "timeline" && <Timeline activity={t.activity} onDone={markActivityDone} />}
              {t.activity.type === "scenario_chat" && <ScenarioChat activity={t.activity} onDone={markActivityDone} />}
              {t.activity.type === "sort" && <SortActivity activity={t.activity} onDone={markActivityDone} />}
              {t.activity.type === "flip_cards" && <FlipCards activity={t.activity} onDone={markActivityDone} />}
            </div>
            <FlagNote flags={flagsFor(generated.flags, "activity")} />
          </article>
          <div className="mt-5 flex justify-between gap-3">
            <button
              className="pk-btn-ghost"
              onClick={() => {
                setSlideIndex(t.slides.length - 1);
                setPhase("slides");
              }}
            >
              ← Back
            </button>
            <button className="pk-btn" disabled={!activityDone} onClick={() => setPhase("quiz")}>
              Start the quiz →
            </button>
          </div>
        </>
      )}

      {phase === "quiz" && current && (
        <Quiz
          key={`${current.id}-${attempts}`}
          question={current}
          mastered={mastered}
          total={questionIds.length}
          retry={practicing || reviewed.includes(current.id)}
          slideNumber={(() => {
            const idx = t.slides.findIndex((s) => s.id === current.sourceSlideId);
            return idx >= 0 ? idx + 1 : null;
          })()}
          flags={flagsFor(generated.flags, current.id)}
          onCorrect={() => answered(true)}
          onWrongContinue={() => {
            markReviewed();
            answered(false);
          }}
          onReviewSlide={() => {
            markReviewed();
            reviewSlide();
          }}
        />
      )}
    </section>
  );
}
