"use client";

import type { ReactNode } from "react";

export function StepIntro({ step, title, children }: { step?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      {step && <p className="text-sm font-semibold text-subtle">{step}</p>}
      <h1 className="mt-1 text-3xl sm:text-4xl font-bold text-ink">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-muted">{children}</div>}
    </div>
  );
}

export function Card({ title, hint, children, className = "" }: { title?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`pk-card p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      {hint && <div className="mt-1 text-muted">{hint}</div>}
      <div className={title || hint ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function StepFooter({ onBack, backLabel = "Back", next }: { onBack?: () => void; backLabel?: string; next: ReactNode }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
      {onBack ? (
        <button type="button" className="pk-btn-ghost" onClick={onBack}>
          ← {backLabel}
        </button>
      ) : (
        <span />
      )}
      {next}
    </div>
  );
}

export function Note({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "blue" }) {
  const cls = tone === "amber" ? "border-[#E8C98F] bg-demo-bg text-demo-ink" : "border-[#BCCBF3] bg-soft text-ink";
  return <div className={`rounded-xl border px-4 py-3 ${cls}`}>{children}</div>;
}

export function StatusChip({ kind, children }: { kind: "success" | "review" | "neutral"; children: ReactNode }) {
  const cls =
    kind === "success" ? "bg-success-bg text-success-ink" : kind === "review" ? "bg-review-bg text-review-ink" : "bg-[#EEF1F5] text-muted";
  return <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold ${cls}`}>{children}</span>;
}
