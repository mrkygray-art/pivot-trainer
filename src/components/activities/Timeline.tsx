"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Activity } from "@/lib/schemas";
import { CitationChips } from "../SourceDrawer";

type Props = { activity: Extract<Activity, { type: "timeline" }>; onDone: () => void };

// Events appear one at a time down a vertical line.
export default function Timeline({ activity, onDone }: Props) {
  const [shown, setShown] = useState(0);
  const events = activity.events;

  useEffect(() => {
    if (shown >= events.length) {
      onDone();
      return;
    }
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : 1100);
    return () => clearTimeout(t);
  }, [shown, events.length, onDone]);

  return (
    <div>
      <ol className="relative ml-3 border-l-2 border-primary/25">
        {events.slice(0, shown).map((e, i) => (
          <motion.li key={i} className="relative mb-6 pl-6" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-primary shadow" />
            <p className="text-xs font-bold uppercase tracking-wide text-accent">{e.when}</p>
            <p className="pk-heading font-bold">{e.label}</p>
            <p className="mt-1 text-neutral-700">{e.detail}</p>
            <CitationChips className="mt-2" citations={e.citations} />
          </motion.li>
        ))}
      </ol>
      {shown >= events.length && (
        <button type="button" className="pk-btn-ghost text-sm" onClick={() => setShown(0)}>
          ↻ Replay
        </button>
      )}
    </div>
  );
}
