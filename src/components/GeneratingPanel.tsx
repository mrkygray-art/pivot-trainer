"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

// The server runs these in one request; the steps advance on a rough schedule so
// the wait reads as progress. Timings match typical runs (about 30-45 seconds).
const STEPS = [
  { label: "Writing slides, activity, and quiz from the approved outline", at: 0 },
  { label: "Checking every citation against the exact section text", at: 24 },
  { label: "Second model verifying each claim against its source", at: 27 },
];

export default function GeneratingPanel() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const activeIndex = STEPS.reduce((acc, s, i) => (seconds >= s.at ? i : acc), 0);

  return (
    <section className="mx-auto max-w-xl py-10">
      <p className="text-sm text-neutral-500">Step 3 of 3 · Generating</p>
      <h1 className="pk-heading mt-1 text-3xl font-bold">Building your training…</h1>
      <ol className="mt-8 space-y-4">
        {STEPS.map((s, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "todo";
          return (
            <motion.li key={s.label} className="flex items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: state === "todo" ? 0.4 : 1 }}>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  state === "done" ? "bg-primary text-white" : state === "active" ? "border-2 border-primary text-primary" : "border border-neutral-300 text-neutral-400"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              <span className={state === "active" ? "font-semibold" : ""}>{s.label}</span>
              {state === "active" && (
                <motion.span className="ml-auto h-2 w-2 rounded-full bg-accent" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
              )}
            </motion.li>
          );
        })}
      </ol>
      <p className="mt-8 text-sm text-neutral-500">{seconds}s · usually under a minute</p>
    </section>
  );
}
