"use client";

import type { ActivityType, Outline } from "@/lib/schemas";
import { CitationChips } from "./SourceDrawer";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  process_flow: "Animated process flow",
  timeline: "Animated timeline",
  scenario_chat: "Scenario chat",
  sort: "Put-in-order activity",
  flip_cards: "Flip cards",
};

export default function OutlinePanel({ outline, onBack, onApprove }: { outline: Outline; onBack: () => void; onApprove: () => void }) {
  return (
    <section>
      <p className="text-sm text-neutral-500">Step 2 of 3 · Approve the outline</p>
      <h1 className="pk-heading mt-1 text-3xl font-bold">{outline.title}</h1>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="pk-chip">For: {outline.audienceRole}</span>
        <span className="pk-chip">Content: {outline.contentType}</span>
        <span className="pk-chip">Activity: {ACTIVITY_LABELS[outline.activity]}</span>
      </div>
      <p className="mt-3 text-neutral-600">{outline.formatReason}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr]">
        <ol className="space-y-3">
          {outline.chapters.map((c, i) => (
            <li key={i} className="pk-card p-4">
              <p className="text-xs font-semibold text-accent">Slide {i + 1}</p>
              <p className="pk-heading font-bold">{c.title}</p>
              <p className="mt-1 text-sm text-neutral-600">{c.goal}</p>
              <CitationChips className="mt-2" citations={c.refs.map((ref) => ({ ref, quote: "" }))} />
            </li>
          ))}
        </ol>
        <div className="pk-card h-fit p-4">
          <h2 className="font-bold">Quiz plan</h2>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
            {outline.quizPlan.map((q, i) => (
              <li key={i}>
                {q.focus}
                <CitationChips className="mt-1" citations={[{ ref: q.ref, quote: "" }]} />
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-neutral-500">Every question must be answered correctly to finish. Misses send the learner back to the source.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="pk-btn-ghost" onClick={onBack}>
          ← Back to coverage
        </button>
        <button className="pk-btn" onClick={onApprove}>
          Approve and generate →
        </button>
      </div>
    </section>
  );
}
