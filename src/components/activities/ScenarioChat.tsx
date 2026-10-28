"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Activity } from "@/lib/schemas";
import { CitationChips } from "../SourceDrawer";

type Props = { activity: Extract<Activity, { type: "scenario_chat" }>; onDone: () => void };
type Bubble = { from: "them" | "you" | "coach"; text: string; good?: boolean };

// Messenger-style scenario. A weaker reply gets coaching and the learner tries again;
// the best reply moves the conversation forward.
export default function ScenarioChat({ activity, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [tried, setTried] = useState<number[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const finished = step >= activity.steps.length;
  const current = activity.steps[step];
  // "Typing" until the current step's message has been shown.
  const typing = !finished && bubbles.filter((b) => b.from === "them").length <= step;

  // Show the other person's message after a short "typing" pause.
  useEffect(() => {
    if (finished) {
      onDone();
      return;
    }
    const t = setTimeout(() => {
      setBubbles((b) => [...b, { from: "them", text: activity.steps[step].message }]);
    }, 900);
    return () => clearTimeout(t);
  }, [step, finished, activity.steps, onDone]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [bubbles, typing]);

  function choose(i: number) {
    const c = current.choices[i];
    setBubbles((b) => [...b, { from: "you", text: c.text }, { from: "coach", text: c.feedback, good: c.best }]);
    if (c.best) {
      setTried([]);
      setTimeout(() => setStep((s) => s + 1), 900);
    } else {
      setTried((t) => [...t, i]);
    }
  }

  const name = activity.otherPerson.split(/[,(]/)[0].trim();

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-[var(--pk-radius)] border border-black/10 bg-neutral-50">
        <div className="flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3 rounded-t-[var(--pk-radius)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-bold text-white">{name.charAt(0)}</span>
          <div>
            <p className="font-semibold leading-tight">{name}</p>
            <p className="text-sm text-subtle">{activity.otherPerson}</p>
          </div>
        </div>
        <div className="max-h-[420px] min-h-[260px] space-y-3 overflow-y-auto p-4">
          <AnimatePresence initial={false}>
            {bubbles.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${b.from === "you" ? "justify-end" : b.from === "coach" ? "justify-center" : "justify-start"}`}
              >
                {b.from === "coach" ? (
                  <p className={`max-w-[90%] rounded-md px-3 py-2 text-sm ${b.good ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                    <span className="font-semibold">{b.good ? "✓ Good reply. " : "Coach: "}</span>
                    {b.text}
                  </p>
                ) : (
                  <p
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      b.from === "you" ? "rounded-br-sm bg-primary text-white" : "rounded-bl-sm bg-white shadow-sm"
                    }`}
                  >
                    {b.text}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {typing && !finished && (
            <div className="flex gap-1 px-2" aria-label={`${name} is typing`}>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 w-2 rounded-full bg-neutral-400"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {!finished && !typing && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-muted">How do you reply?</p>
          <div className="mt-2 space-y-2">
            {current.choices.map((c, i) => (
              <button
                key={i}
                type="button"
                disabled={tried.includes(i)}
                onClick={() => choose(i)}
                className="block w-full rounded-[var(--pk-radius)] border border-black/15 bg-white px-4 py-3 text-left hover:border-primary disabled:opacity-40 disabled:line-through"
              >
                {c.text}
              </button>
            ))}
          </div>
          <CitationChips className="mt-3" citations={current.citations} />
        </div>
      )}
      {finished && <p className="mt-4 font-semibold text-emerald-800">Conversation complete.</p>}
    </div>
  );
}
