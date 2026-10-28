"use client";

import { motion } from "motion/react";
import type { Slide } from "@/lib/schemas";
import { CitationChips } from "./SourceDrawer";
import FlagNote from "./FlagNote";
import type { Flag } from "@/lib/schemas";

export default function ContentSlide({ slide, index, total, flags }: { slide: Slide; index: number; total: number; flags: Flag[] }) {
  return (
    <motion.article key={slide.id} className="pk-card p-6 sm:p-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">
        Slide {index + 1} of {total}
      </p>
      <h2 className="pk-heading mt-2 text-2xl sm:text-3xl font-bold">{slide.title}</h2>
      <ul className="mt-5 space-y-3">
        {slide.bullets.map((b, i) => (
          <motion.li
            key={i}
            className="flex gap-3 text-lg leading-snug"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.12 }}
          >
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>{b}</span>
          </motion.li>
        ))}
      </ul>
      <details className="mt-6 text-sm text-muted">
        <summary className="cursor-pointer font-semibold">Narration script</summary>
        <p className="mt-2 italic">{slide.narration}</p>
      </details>
      <div className="mt-5 border-t border-black/5 pt-4">
        <p className="mb-2 text-sm font-semibold text-subtle">Where this came from</p>
        <CitationChips citations={slide.citations} />
      </div>
      <FlagNote flags={flags} />
    </motion.article>
  );
}
