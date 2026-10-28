"use client";

import { useState } from "react";
import type { Pack } from "@/lib/pack-types";
import type { GeneratedTraining } from "@/lib/schemas";
import { downloadCertificate, newCertificateId, type CertificateData } from "@/lib/certificate";
import { Card, Note, StatusChip, StepIntro } from "./ui";

type Props = {
  pack: Pack;
  generated: GeneratedTraining;
  learner: string;
  reviewedIds: string[]; // questions that needed a second look
  practiceDone: boolean;
  onPractice: () => void;
  onSaveDemo: () => void;
  onBuildAnother: () => void;
};

// Step 4. Only reachable once every question has been answered correctly.
export default function ResultsScreen({ pack, generated, learner, reviewedIds, practiceDone, onPractice, onSaveDemo, onBuildAnother }: Props) {
  const t = generated.training;
  const total = t.quiz.length;
  const reviewed = t.quiz.filter((q) => reviewedIds.includes(q.id)).length;
  const [downloading, setDownloading] = useState(false);
  const [cert] = useState<CertificateData>(() => ({
    id: newCertificateId(),
    learner,
    course: t.title,
    organization: pack.organization,
    mastered: total,
    total,
    date: new Date().toISOString(),
    colors: { primary: pack.style.colors.primary, accent: pack.style.colors.accent },
  }));

  const topicFor = (qid: string) => {
    const q = t.quiz.find((x) => x.id === qid)!;
    const s = pack.sections.find((x) => x.ref === q.citations[0]?.ref);
    return s?.title ?? q.question;
  };
  const dateText = new Date(cert.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div>
      <StepIntro step="Step 4 of 4" title="You finished the training.">
        <p>
          Every question is now answered correctly. Where a second look was needed, we showed you the exact part of the document and asked again.
        </p>
      </StepIntro>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <p className="app-heading text-4xl font-bold text-success">
            {total} of {total} mastered
          </p>
          <p className="mt-1 text-muted">
            {total - reviewed} on the first try, {reviewed} after a second look
          </p>
          <ul className="mt-5 divide-y divide-line">
            {t.quiz.map((q, i) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <span className="text-subtle">Question {i + 1}:</span> {topicFor(q.id)}
                </span>
                {reviewedIds.includes(q.id) ? <StatusChip kind="review">After review</StatusChip> : <StatusChip kind="success">First try</StatusChip>}
              </li>
            ))}
          </ul>
          {reviewed > 0 && (
            <button className="pk-btn-ghost mt-4" onClick={onPractice}>
              Practice the ones I needed review on
            </button>
          )}
          {practiceDone && <p className="mt-2 text-success">✓ Practice done. You answered them all correctly again.</p>}
        </Card>

        <Card>
          <div
            className="rounded-xl bg-white p-6 text-center"
            style={{ border: `4px solid ${cert.colors.primary}`, boxShadow: `inset 0 0 0 6px white, inset 0 0 0 7px ${cert.colors.accent}` }}
            aria-label="Certificate preview"
          >
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: cert.colors.primary }}>
              {cert.organization}
            </p>
            <p className="app-heading mt-3 text-2xl font-bold">Certificate of Completion</p>
            <p className="mt-3 text-subtle">This certifies that</p>
            <p className="app-heading mt-1 text-2xl font-bold" style={{ color: cert.colors.primary }}>
              {cert.learner}
            </p>
            <p className="mt-2 text-subtle">has completed the training</p>
            <p className="mt-1 font-semibold">{cert.course}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="font-semibold text-subtle">Date</p>
                <p>{dateText}</p>
              </div>
              <div>
                <p className="font-semibold text-subtle">Result</p>
                <p>
                  {cert.mastered} of {cert.total} mastered
                </p>
              </div>
              <div className="col-span-2">
                <p className="font-semibold text-subtle">Certificate ID</p>
                <p>{cert.id}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-subtle">Made with Pivot Trainer, an independent prototype.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
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
              {downloading ? "Preparing…" : "Download certificate (PDF)"}
            </button>
            <button className="pk-btn-ghost" onClick={onSaveDemo}>
              Save my demo
            </button>
            <button className="pk-btn-ghost" onClick={onBuildAnother}>
              Build another training
            </button>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Note>Nothing is kept after you leave. Download your certificate and your demo now.</Note>
      </div>
    </div>
  );
}
