"use client";

import { useEffect, useState } from "react";
import type { Activity } from "@/lib/schemas";
import { CitationChips } from "../SourceDrawer";

type Props = { activity: Extract<Activity, { type: "flip_cards" }>; onDone: () => void };

// Glossary flip cards. Continue unlocks once every card has been flipped.
export default function FlipCards({ activity, onDone }: Props) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [seen, setSeen] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (seen.size === activity.cards.length) onDone();
  }, [seen, activity.cards.length, onDone]);

  function toggle(i: number) {
    setFlipped((f) => {
      const n = new Set(f);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
    setSeen((s) => new Set(s).add(i));
  }

  return (
    <div>
      <p className="text-sm text-muted">
        Tap each card to see the approved definition. {seen.size}/{activity.cards.length} viewed.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {activity.cards.map((c, i) => (
          <div key={i} className={`flip-card h-44 ${flipped.has(i) ? "flipped" : ""}`}>
            <button type="button" onClick={() => toggle(i)} aria-pressed={flipped.has(i)} className="flip-inner relative h-full w-full">
              <span className="flip-face absolute inset-0 flex items-center justify-center rounded-[var(--pk-radius)] bg-primary p-4 text-center text-xl font-bold text-white">
                {c.term}
              </span>
              <span className="flip-face flip-back absolute inset-0 flex items-center justify-center rounded-[var(--pk-radius)] border-2 border-primary bg-white p-4 text-center text-neutral-800">
                {c.definition}
              </span>
            </button>
          </div>
        ))}
      </div>
      <CitationChips className="mt-4" citations={activity.cards.flatMap((c) => c.citations)} />
    </div>
  );
}
