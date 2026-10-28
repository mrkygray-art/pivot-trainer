"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Activity } from "@/lib/schemas";
import { CitationChips } from "../SourceDrawer";

type Props = { activity: Extract<Activity, { type: "process_flow" }>; onDone: () => void };

// Steps light up in order, then the learner can click any step for detail.
export default function ProcessFlow({ activity, onDone }: Props) {
  const [lit, setLit] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const steps = activity.steps;

  useEffect(() => {
    if (lit >= steps.length) {
      onDone();
      return;
    }
    const t = setTimeout(() => setLit((n) => n + 1), lit === 0 ? 400 : 900);
    return () => clearTimeout(t);
  }, [lit, steps.length, onDone]);

  const shown = selected ?? Math.max(0, lit - 1);

  return (
    <div>
      <ol className="relative grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
        {steps.map((s, i) => {
          const on = i < lit;
          return (
            <li key={i} className="relative">
              <motion.button
                type="button"
                onClick={() => setSelected(i)}
                className={`flex h-full w-full flex-col items-start gap-2 rounded-[var(--pk-radius)] border-2 p-3 text-left transition-colors ${
                  shown === i && on ? "border-accent" : on ? "border-primary" : "border-neutral-200"
                }`}
                animate={{
                  backgroundColor: on ? "color-mix(in srgb, var(--pk-primary) 8%, white)" : "#ffffff",
                  scale: i === lit - 1 && selected === null ? [1, 1.04, 1] : 1,
                }}
                transition={{ duration: 0.4 }}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    on ? "bg-primary text-white" : "bg-neutral-200 text-neutral-500"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`text-sm font-semibold ${on ? "text-neutral-900" : "text-neutral-400"}`}>{s.label.replace(/^\d+\.\s*/, "")}</span>
              </motion.button>
              {i < steps.length - 1 && (
                <motion.span
                  aria-hidden
                  className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-primary sm:block"
                  animate={{ opacity: i < lit - 1 ? 1 : 0.15 }}
                >
                  ▶
                </motion.span>
              )}
            </li>
          );
        })}
      </ol>

      {lit > 0 && (
        <motion.div key={shown} className="mt-5 rounded-[var(--pk-radius)] bg-neutral-50 p-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <p className="font-semibold">
            Step {shown + 1}: {steps[shown].label.replace(/^\d+\.\s*/, "")}
          </p>
          <p className="mt-1 text-neutral-700">{steps[shown].detail}</p>
          <CitationChips className="mt-2" citations={steps[shown].citations} />
        </motion.div>
      )}

      <button type="button" className="pk-btn-ghost mt-4 text-sm" onClick={() => { setSelected(null); setLit(0); }}>
        ↻ Replay
      </button>
    </div>
  );
}
