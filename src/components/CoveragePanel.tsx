"use client";

import { motion } from "motion/react";
import type { Coverage } from "@/lib/schemas";
import { CitationChips } from "./SourceDrawer";

export default function CoveragePanel(props: {
  request: string;
  coverage: Coverage;
  busy: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { request, coverage, busy, onBack, onContinue } = props;
  return (
    <section>
      <p className="text-sm text-neutral-500">Step 1 of 3 · Coverage check</p>
      <h1 className="pk-heading mt-1 text-3xl font-bold">&ldquo;{request}&rdquo;</h1>
      <p className={`mt-3 max-w-3xl text-lg ${coverage.canBuild ? "text-neutral-700" : "text-red-800"}`}>{coverage.summary}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="pk-card p-5">
          <h2 className="font-bold text-emerald-800">✓ Covered by the documents</h2>
          {coverage.covered.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-600">Nothing in the knowledge base covers this request.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {coverage.covered.map((c, i) => (
                <motion.li key={c.topic} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <p className="font-medium">{c.topic}</p>
                  <CitationChips className="mt-1" citations={c.refs.map((ref) => ({ ref, quote: "" }))} />
                </motion.li>
              ))}
            </ul>
          )}
        </div>
        <div className="pk-card p-5">
          <h2 className="font-bold text-red-800">✕ Not covered</h2>
          {coverage.notCovered.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-600">No gaps found for this request.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {coverage.notCovered.map((c) => (
                <li key={c.topic}>
                  <p className="font-medium">{c.topic}</p>
                  <p className="text-sm text-neutral-600">{c.reason}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-neutral-500">Gaps are left out of the training. Nothing is invented to fill them.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="pk-btn-ghost" onClick={onBack} disabled={busy}>
          ← Try another request
        </button>
        {coverage.canBuild && (
          <button className="pk-btn" onClick={onContinue} disabled={busy}>
            {busy ? "Drafting the outline…" : "Draft the outline →"}
          </button>
        )}
      </div>
    </section>
  );
}
