"use client";

import { useState } from "react";
import { docSections, type WorkingDoc } from "./working";

const HEADING = /^#{2,4}\s+\d+(?:\.\d+)*\s+/;

// Index-based edits on the markdown body: the Nth numbered heading line.
function headingLines(body: string) {
  return body
    .split("\n")
    .map((l, i) => (HEADING.test(l) ? i : -1))
    .filter((i) => i >= 0);
}

function rename(body: string, nth: number, title: string) {
  const lines = body.split("\n");
  const idx = headingLines(body)[nth];
  lines[idx] = `${lines[idx].match(HEADING)![0]}${title.trim() || "Untitled"}`;
  return lines.join("\n");
}

// Removing a topic's heading folds its text into the topic above it.
function mergeUp(body: string, nth: number) {
  const lines = body.split("\n");
  lines.splice(headingLines(body)[nth], 1);
  return lines.join("\n");
}

// Optional: rename topics, merge two, or edit a document's text directly.
export default function TopicEditor({ docs, update }: { docs: WorkingDoc[]; update: (id: string, patch: Partial<WorkingDoc>) => void }) {
  const [textEdit, setTextEdit] = useState<Record<string, string>>({});

  return (
    <div className="mt-4 space-y-6">
      {docs.map((doc) => {
        const topics = docSections(doc);
        const draft = textEdit[doc.id];
        return (
          <div key={doc.id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">{doc.title}</h3>
              <button
                className="pk-btn-ghost text-sm"
                onClick={() =>
                  setTextEdit((t) => {
                    if (draft === undefined) return { ...t, [doc.id]: doc.body ?? "" };
                    const next = { ...t };
                    delete next[doc.id];
                    return next;
                  })
                }
              >
                {draft === undefined ? "Edit the text" : "Cancel"}
              </button>
            </div>

            {draft !== undefined ? (
              <div className="mt-3">
                <p className="mb-2 text-sm text-subtle">
                  A line that starts with <code>## 2</code> or <code>## 2.1</code> followed by a name starts a new topic.
                </p>
                <label className="sr-only" htmlFor={`text-${doc.id}`}>
                  Text of {doc.title}
                </label>
                <textarea
                  id={`text-${doc.id}`}
                  className="app-input font-mono text-sm"
                  rows={14}
                  value={draft}
                  onChange={(e) => setTextEdit((t) => ({ ...t, [doc.id]: e.target.value }))}
                />
                <button
                  className="pk-btn mt-2"
                  disabled={headingLines(draft).length === 0}
                  onClick={() => {
                    update(doc.id, { body: draft, text: draft, method: "edited" });
                    setTextEdit((t) => {
                      const next = { ...t };
                      delete next[doc.id];
                      return next;
                    });
                  }}
                >
                  Save the text
                </button>
                {headingLines(draft).length === 0 && <p className="mt-1 text-sm text-[#9B1C1C]">Keep at least one topic line.</p>}
              </div>
            ) : (
              <ol className="mt-2 divide-y divide-line">
                {topics.map((s, i) => (
                  <li key={`${s.number}-${i}`} className="grid gap-2 py-3 sm:grid-cols-[3.5rem_1fr_auto] sm:items-start">
                    <span className="pt-2 text-sm font-semibold text-subtle">{s.number}</span>
                    <div>
                      <input
                        className="app-input font-semibold"
                        defaultValue={s.title}
                        aria-label={`Name of topic ${s.number}`}
                        onBlur={(e) => e.target.value !== s.title && update(doc.id, { body: rename(doc.body!, i, e.target.value), method: "edited" })}
                      />
                      <p className="mt-1 line-clamp-2 text-sm text-subtle">{s.text || "A heading for the topics below it."}</p>
                    </div>
                    {i > 0 && (
                      <button className="pk-btn-ghost text-sm" onClick={() => update(doc.id, { body: mergeUp(doc.body!, i), method: "edited" })}>
                        Join with the one above
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}
