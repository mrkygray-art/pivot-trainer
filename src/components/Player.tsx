"use client";

import { useCallback, useState } from "react";
import type { Pack } from "@/lib/pack-types";
import type { GeneratedTraining } from "@/lib/schemas";
import { courseKey, storage } from "@/lib/storage";
import ContentSlide from "./ContentSlide";
import Quiz from "./Quiz";
import CompletePanel from "./CompletePanel";
import FlagNote from "./FlagNote";
import { flagsFor } from "./trainingStats";
import { ACTIVITY_LABELS } from "./OutlinePanel";
import ProcessFlow from "./activities/ProcessFlow";
import Timeline from "./activities/Timeline";
import ScenarioChat from "./activities/ScenarioChat";
import SortActivity from "./activities/SortActivity";
import FlipCards from "./activities/FlipCards";

type Phase = "slides" | "activity" | "quiz" | "done";

export default function Player({ pack, generated, learner, onExit }: { pack: Pack; generated: GeneratedTraining; learner: string; onExit: () => void }) {
  const t = generated.training;
  const key = courseKey(generated);
  const [phase, setPhase] = useState<Phase>("slides");
  const [slideIndex, setSlideIndex] = useState(0);
  const [activityDone, setActivityDone] = useState(false);
  // Quiz state: the queue holds question ids still to be answered correctly.
  const [queue, setQueue] = useState<string[]>(() => t.quiz.map((q) => q.id));
  const [missed, setMissed] = useState<string[]>([]);
  const [answered, setAnswered] = useState(0); // question attempts, for numbering
  const [reviewingFor, setReviewingFor] = useState<string | null>(null);
  const [retestMode, setRetestMode] = useState(false);

  const markActivityDone = useCallback(() => setActivityDone(true), []);

  const current = t.quiz.find((q) => q.id === queue[0]);
  const totalSteps = t.slides.length + 1 + t.quiz.length;
  const quizProgress = t.slides.length + 1 + (t.quiz.length - queue.length);
  const doneSteps = reviewingFor
    ? quizProgress
    : phase === "slides"
      ? slideIndex
      : phase === "activity"
        ? t.slides.length
        : phase === "quiz"
          ? quizProgress
          : totalSteps;

  function nextQuestion(wasCorrect: boolean) {
    if (!current) return;
    const id = current.id;
    setAnswered((n) => n + 1);
    const rest = queue.slice(1);
    if (wasCorrect) {
      setQueue(rest);
      if (rest.length === 0) finish();
    } else {
      // Re-queue at the end so it comes back before the course can complete.
      setQueue([...rest, id]);
    }
  }

  function recordMiss() {
    if (!current || missed.includes(current.id)) return;
    const next = [...missed, current.id];
    setMissed(next);
    storage.saveMissed(key, next);
  }

  function finish() {
    setPhase("done");
    setReviewingFor(null);
  }

  function reviewSlide() {
    if (!current) return;
    const idx = t.slides.findIndex((s) => s.id === current.sourceSlideId);
    nextQuestion(false);
    setReviewingFor(current.id);
    setSlideIndex(Math.max(0, idx));
    setPhase("slides");
  }

  function retestMissed() {
    setRetestMode(true);
    setQueue(missed);
    setAnswered(0);
    setPhase("quiz");
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-500">{learner}</p>
          <h1 className="pk-heading text-xl font-bold">{t.title}</h1>
        </div>
        <button className="pk-btn-ghost text-sm" onClick={onExit}>
          Exit
        </button>
      </div>
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-black/5" role="progressbar" aria-valuemin={0} aria-valuemax={totalSteps} aria-valuenow={doneSteps}>
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(doneSteps / totalSteps) * 100}%` }} />
      </div>

      {phase === "slides" && (
        <>
          {reviewingFor && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/40 bg-white px-4 py-3">
              <p className="text-sm">
                <span className="font-semibold">Reviewing the source</span> for a question you missed. It&apos;s waiting for you in the quiz.
              </p>
              <button
                className="pk-btn text-sm"
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
            <div className="mt-5 flex justify-between">
              <button className="pk-btn-ghost" disabled={slideIndex === 0} onClick={() => setSlideIndex((i) => i - 1)}>
                ← Back
              </button>
              <button
                className="pk-btn"
                onClick={() => (slideIndex < t.slides.length - 1 ? setSlideIndex((i) => i + 1) : setPhase("activity"))}
              >
                {slideIndex < t.slides.length - 1 ? "Next →" : `Next: ${ACTIVITY_LABELS[t.activity.type]} →`}
              </button>
            </div>
          )}
        </>
      )}

      {phase === "activity" && (
        <>
          <article className="pk-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">{ACTIVITY_LABELS[t.activity.type]}</p>
            <h2 className="pk-heading mt-2 text-2xl font-bold">{t.activity.title}</h2>
            {"intro" in t.activity && <p className="mt-2 text-neutral-600">{t.activity.intro}</p>}
            <div className="mt-6">
              {t.activity.type === "process_flow" && <ProcessFlow activity={t.activity} onDone={markActivityDone} />}
              {t.activity.type === "timeline" && <Timeline activity={t.activity} onDone={markActivityDone} />}
              {t.activity.type === "scenario_chat" && <ScenarioChat activity={t.activity} onDone={markActivityDone} />}
              {t.activity.type === "sort" && <SortActivity activity={t.activity} onDone={markActivityDone} />}
              {t.activity.type === "flip_cards" && <FlipCards activity={t.activity} onDone={markActivityDone} />}
            </div>
            <FlagNote flags={flagsFor(generated.flags, "activity")} />
          </article>
          <div className="mt-5 flex justify-between">
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
          key={`${current.id}-${answered}`}
          question={current}
          number={answered + 1}
          remaining={queue.length}
          retry={missed.includes(current.id)}
          slideNumber={(() => {
            const idx = t.slides.findIndex((s) => s.id === current.sourceSlideId);
            return idx >= 0 ? idx + 1 : null;
          })()}
          flags={flagsFor(generated.flags, current.id)}
          onCorrect={() => nextQuestion(true)}
          onWrongContinue={() => {
            recordMiss();
            nextQuestion(false);
          }}
          onReviewSlide={() => {
            recordMiss();
            reviewSlide();
          }}
        />
      )}

      {phase === "done" && (
        <CompletePanel
          pack={pack}
          generated={generated}
          learner={learner}
          missedIds={missed}
          retestMode={retestMode}
          onRetest={retestMissed}
          onExit={onExit}
        />
      )}
    </section>
  );
}
