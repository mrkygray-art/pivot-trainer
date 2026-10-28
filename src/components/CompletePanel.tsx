"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Pack } from "@/lib/pack-types";
import type { GeneratedTraining } from "@/lib/schemas";
import { storage, type SavedCertificate } from "@/lib/storage";
import { downloadCertificate, newCertificateId } from "@/lib/certificate";
import { CitationChips } from "./SourceDrawer";

type Props = {
  pack: Pack;
  generated: GeneratedTraining;
  learner: string;
  missedIds: string[];
  retestMode: boolean;
  onRetest: () => void;
  onExit: () => void;
};

export default function CompletePanel({ pack, generated, learner, missedIds, retestMode, onRetest, onExit }: Props) {
  const t = generated.training;
  const total = t.quiz.length;
  const score = Math.round(((total - missedIds.length) / total) * 100);
  const missedQuestions = t.quiz.filter((q) => missedIds.includes(q.id));

  // Issued once per completion; a retest of missed questions doesn't issue a new one.
  const [cert] = useState<SavedCertificate>(() => ({
    id: newCertificateId(),
    learner,
    course: t.title,
    packName: pack.name,
    packDisplayName: pack.displayName,
    organization: pack.organization,
    score,
    date: new Date().toISOString(),
    colors: { primary: pack.style.colors.primary, accent: pack.style.colors.accent },
  }));
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (retestMode) return;
    storage.saveCertificate(cert);
  }, [cert, retestMode]);

  if (retestMode) {
    return (
      <section className="pk-card mx-auto max-w-xl p-8 text-center">
        <h2 className="pk-heading text-2xl font-bold">Review complete</h2>
        <p className="mt-2 text-neutral-600">You answered every missed question correctly. Your certificate is saved from your first completion.</p>
        <button className="pk-btn mt-6" onClick={onExit}>
          Done
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <motion.div className="pk-card p-8 text-center" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <motion.div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          ✓
        </motion.div>
        <h2 className="pk-heading mt-4 text-3xl font-bold">Training complete</h2>
        <p className="mt-2 text-neutral-600">
          {learner}, you finished <span className="font-semibold">{t.title}</span>.
        </p>
        <p className="mt-4 text-5xl font-bold text-primary">{score}%</p>
        <p className="text-sm text-neutral-500">
          answered correctly on the first try ({total - missedIds.length} of {total})
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            className="pk-btn"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              try {
                await downloadCertificate(cert);
              } finally {
                setDownloading(false);
              }
            }}
          >
            {downloading ? "Preparing PDF…" : "Download certificate (PDF)"}
          </button>
          <button className="pk-btn-ghost" onClick={onExit}>
            Back to start
          </button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Certificate ID {cert.id} · saved in this browser for later
        </p>
      </motion.div>

      {missedQuestions.length > 0 && (
        <div className="pk-card mt-6 p-6">
          <h3 className="font-bold">Review list</h3>
          <p className="text-sm text-neutral-600">You missed these at first. They&apos;re saved so you can retest them.</p>
          <ul className="mt-3 space-y-3">
            {missedQuestions.map((q) => (
              <li key={q.id} className="border-t border-black/5 pt-3">
                <p className="font-medium">{q.question}</p>
                <p className="text-sm text-neutral-600">Answer: {q.choices[q.correctIndex]}</p>
                <CitationChips className="mt-1" citations={q.citations} />
              </li>
            ))}
          </ul>
          <button className="pk-btn-ghost mt-4" onClick={onRetest}>
            Retest missed questions
          </button>
        </div>
      )}
    </section>
  );
}
