"use client";

import type { ReactNode } from "react";

export const inputClass = "w-full rounded-[var(--pk-radius)] border border-black/15 bg-white px-3 py-2 outline-none focus:border-primary";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-neutral-800">{label}</span>
      {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export function Card({ title, hint, actions, children }: { title: string; hint?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="pk-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="pk-heading text-lg font-bold">{title}</h2>
          {hint && <p className="text-sm text-neutral-600">{hint}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Editable list of short strings (guardrails, never-say, preferences, starter prompts).
export function ListEditor({ items, onChange, placeholder, addLabel }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; addLabel: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={inputClass}
            value={item}
            placeholder={placeholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <RemoveButton label={`Remove "${item || "empty item"}"`} onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button type="button" className="pk-btn-ghost px-3 py-1.5 text-sm" onClick={() => onChange([...items, ""])}>
        + {addLabel}
      </button>
    </div>
  );
}

// Editable rows of two fields (glossary term/definition, audience role/notes).
export function PairEditor<K extends string>(props: {
  rows: Record<K, string>[];
  keys: [K, K];
  labels: [string, string];
  onChange: (v: Record<K, string>[]) => void;
  addLabel: string;
  multilineSecond?: boolean;
}) {
  const { rows, keys, labels, onChange, addLabel, multilineSecond } = props;
  const [a, b] = keys;
  const update = (i: number, k: K, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <input className={inputClass} value={row[a]} placeholder={labels[0]} aria-label={labels[0]} onChange={(e) => update(i, a, e.target.value)} />
          {multilineSecond ? (
            <textarea className={inputClass} rows={2} value={row[b]} placeholder={labels[1]} aria-label={labels[1]} onChange={(e) => update(i, b, e.target.value)} />
          ) : (
            <input className={inputClass} value={row[b]} placeholder={labels[1]} aria-label={labels[1]} onChange={(e) => update(i, b, e.target.value)} />
          )}
          <RemoveButton label={`Remove ${row[a] || "row"}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button
        type="button"
        className="pk-btn-ghost px-3 py-1.5 text-sm"
        onClick={() => onChange([...rows, { [a]: "", [b]: "" } as Record<K, string>])}
      >
        + {addLabel}
      </button>
    </div>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="shrink-0 rounded-md px-2 text-neutral-400 hover:bg-red-50 hover:text-red-700">
      ✕
    </button>
  );
}
