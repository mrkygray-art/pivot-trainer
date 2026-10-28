"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Coverage } from "@/lib/schemas";
import { Card, StepIntro } from "./ui";

export type BuildPhase = "checking" | "writing" | "generating" | "partly" | "not_covered";

type Props = {
  phase: BuildPhase;
  request: string;
  coverage: Coverage | null;
  ideas: string[];
  onBuildPart: () => void;
  onAddDocument: () => void;
  onPickIdea: (idea: string) => void;
  onBack: () => void;
};

// Lines advance with the real requests: checking -> outline -> generate (+ verify).
// Inside the one generate request, the last two lines advance on typical timings.
const LINES = ["Reading your documents", "Writing the slides", "Making the quiz", "Checking every slide against your documents"];

function activeLine(phase: BuildPhase, secondsInGenerate: number) {
  if (phase === "checking") return 0;
  if (phase === "writing") return 1;
  if (secondsInGenerate < 18) return 1;
  if (secondsInGenerate < 27) return 2;
  return 3;
}

export default function BuildScreen(props: Props) {
  const { phase, request, coverage } = props;
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (phase !== "generating") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(t);
      setSeconds(0);
    };
  }, [phase]);

  if (phase === "partly" && coverage) {
    return (
      <div>
        <StepIntro step="Step 3 of 4" title="Your documents cover part of this" />
        <Card>
          <p className="text-lg">{coverage.summary}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-bold text-success">✓ We can teach</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {coverage.covered.map((c) => (
                  <li key={c.topic}>{c.topic}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#9B1C1C]">✕ Not in your documents</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {coverage.notCovered.map((c) => (
                  <li key={c.topic}>
                    {c.topic} <span className="text-subtle">({c.reason})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="pk-btn" onClick={props.onBuildPart}>
              Build the part we can
            </button>
            <button className="pk-btn-ghost" onClick={props.onAddDocument}>
              Add a document
            </button>
            <button className="pk-btn-ghost" onClick={props.onBack}>
              Change my request
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "not_covered" && coverage) {
    return (
      <div>
        <StepIntro step="Step 3 of 4" title="Your documents don't cover this yet" />
        <Card>
          <p className="text-lg">{coverage.summary}</p>
          {coverage.notCovered.length > 0 && (
            <>
              <h2 className="mt-5 text-lg font-bold">What&apos;s missing</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {coverage.notCovered.map((c) => (
                  <li key={c.topic}>
                    {c.topic} <span className="text-subtle">({c.reason})</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-5 text-muted">We won&apos;t make anything up. Add a document that covers it, or try one of these ideas from your documents:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {props.ideas.map((idea) => (
              <button key={idea} type="button" className="pk-chip" onClick={() => props.onPickIdea(idea)}>
                {idea}
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="pk-btn" onClick={props.onAddDocument}>
              Add a document
            </button>
            <button className="pk-btn-ghost" onClick={props.onBack}>
              Change my request
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const active = activeLine(phase, seconds);
  return (
    <div className="mx-auto max-w-xl py-6">
      <StepIntro step="Step 3 of 4" title="Building your training…">
        <p>&ldquo;{request}&rdquo;</p>
      </StepIntro>
      <ol className="space-y-4" aria-live="polite">
        {LINES.map((label, i) => {
          const state = i < active ? "done" : i === active ? "active" : "todo";
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
                  state === "done" ? "bg-success text-white" : state === "active" ? "border-2 border-primary text-primary" : "border border-line text-subtle"
                }`}
                aria-hidden
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={state === "todo" ? "text-subtle" : state === "active" ? "font-semibold" : ""}>
                {label}
                <span className="sr-only">{state === "done" ? " (done)" : state === "active" ? " (in progress)" : ""}</span>
              </span>
              {state === "active" && (
                <motion.span className="ml-auto h-2.5 w-2.5 rounded-full bg-primary" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-8 text-subtle">This usually takes about a minute.</p>
    </div>
  );
}
