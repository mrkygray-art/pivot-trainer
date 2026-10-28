"use client";

import { useEffect, useRef, useState } from "react";
import { DOC_KIND_LABELS } from "@/lib/pack-types";
import { postJson } from "@/lib/client-api";
import { Card, inputClass } from "./fields";
import { draftSections, type DraftDoc, type SectionMethod } from "./draft";

type Props = { docs: DraftDoc[]; setDocs: (fn: (docs: DraftDoc[]) => DraftDoc[]) => void };
type SectionResponse = { body: string; method: SectionMethod; docTitle?: string; matched?: number; suggested?: number };

const METHOD_NOTE: Record<SectionMethod, string> = {
  numbered: "Kept the document's own numbered headings.",
  headings: "Numbered the document's headings. No AI used.",
  claude: "Claude suggested where sections start. Your wording was not changed (checked in code).",
  edited: "Edited by hand.",
};

const HEADING = /^#{2,4}\s+\d+(?:\.\d+)*\s+/;

// Index-based edits on the markdown body: the Nth numbered heading line.
function headingLineIndexes(body: string) {
  return body
    .split("\n")
    .map((l, i) => (HEADING.test(l) ? i : -1))
    .filter((i) => i >= 0);
}

function renameSection(body: string, nth: number, title: string) {
  const lines = body.split("\n");
  const idx = headingLineIndexes(body)[nth];
  const prefix = lines[idx].match(HEADING)![0];
  lines[idx] = `${prefix}${title.trim() || "Untitled"}`;
  return lines.join("\n");
}

// Removing a section's heading folds its text into the section above.
function mergeIntoPrevious(body: string, nth: number) {
  const lines = body.split("\n");
  lines.splice(headingLineIndexes(body)[nth], 1);
  return lines.join("\n");
}

export default function SectionsStep({ docs, setDocs }: Props) {
  const [running, setRunning] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const started = useRef(new Set<string>());

  const update = (id: string, patch: Partial<DraftDoc>) => setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  async function runSections(doc: DraftDoc) {
    setRunning((r) => [...r, doc.id]);
    setErrors((e) => ({ ...e, [doc.id]: "" }));
    try {
      const res = await postJson<SectionResponse>("/api/sections", { title: doc.title, text: doc.text });
      const fromFile = doc.source !== "Pasted text" && doc.source !== "Saved pack";
      update(doc.id, { body: res.body, method: res.method, ...(res.docTitle && fromFile ? { title: res.docTitle } : {}) });
    } catch (e) {
      setErrors((errs) => ({ ...errs, [doc.id]: (e as Error).message }));
    } finally {
      setRunning((r) => r.filter((x) => x !== doc.id));
    }
  }

  // Section every document that hasn't been sectioned yet, one request each.
  useEffect(() => {
    for (const doc of docs) {
      if (doc.body === null && !started.current.has(doc.id)) {
        started.current.add(doc.id);
        runSections(doc);
      }
    }
    // runSections only uses setters and its argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  return (
    <div className="space-y-6">
      <p className="text-neutral-700">
        Each section gets a number (§2.1) that citations point to. Check the titles, merge sections that belong together, or edit the text directly.
      </p>
      {docs.map((doc) => {
        const sections = draftSections(doc);
        const isRunning = running.includes(doc.id);
        const textEdit = editing[doc.id];
        return (
          <Card
            key={doc.id}
            title={doc.title}
            hint={`${DOC_KIND_LABELS[doc.kind]} · ${sections.length} section${sections.length === 1 ? "" : "s"}`}
            actions={
              doc.body !== null && !isRunning ? (
                <div className="flex gap-2">
                  <button
                    className="pk-btn-ghost px-3 py-1.5 text-sm"
                    onClick={() => setEditing((e) => (textEdit === undefined ? { ...e, [doc.id]: doc.body ?? "" } : Object.fromEntries(Object.entries(e).filter(([k]) => k !== doc.id))))}
                  >
                    {textEdit === undefined ? "Edit as text" : "Cancel text edit"}
                  </button>
                  <button className="pk-btn-ghost px-3 py-1.5 text-sm" onClick={() => runSections({ ...doc, text: doc.text })}>
                    Redo sections
                  </button>
                </div>
              ) : null
            }
          >
            {isRunning && <p className="text-sm text-neutral-600">Creating sections…</p>}
            {errors[doc.id] && (
              <div className="text-sm text-red-700">
                {errors[doc.id]}{" "}
                <button className="underline" onClick={() => runSections(doc)}>
                  Try again
                </button>
              </div>
            )}
            {doc.method && !isRunning && <p className="mb-3 text-sm text-emerald-800">✓ {METHOD_NOTE[doc.method]}</p>}

            {textEdit !== undefined ? (
              <div>
                <p className="mb-2 text-xs text-neutral-500">
                  A line like <code>## 2.1 Section title</code> starts a section. Everything under it, up to the next such line, is that section&apos;s text.
                </p>
                <textarea
                  className={`${inputClass} font-mono text-sm`}
                  rows={16}
                  value={textEdit}
                  onChange={(e) => setEditing((ed) => ({ ...ed, [doc.id]: e.target.value }))}
                />
                <button
                  className="pk-btn mt-2"
                  disabled={headingLineIndexes(textEdit).length === 0}
                  onClick={() => {
                    update(doc.id, { body: textEdit, text: textEdit, method: "edited" });
                    setEditing((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== doc.id)));
                  }}
                >
                  Apply text edits
                </button>
                {headingLineIndexes(textEdit).length === 0 && <p className="mt-1 text-sm text-red-700">Add at least one section heading.</p>}
              </div>
            ) : (
              !isRunning &&
              doc.body !== null && (
                <ol className="divide-y divide-black/5">
                  {sections.map((s, i) => (
                    <li key={`${s.number}-${i}`} className="grid gap-2 py-3 sm:grid-cols-[4rem_1fr_auto] sm:items-start">
                      <span className="pk-chip w-fit">§{s.number}</span>
                      <div>
                        <input
                          className={`${inputClass} py-1 font-semibold`}
                          defaultValue={s.title}
                          aria-label={`Title of section ${s.number}`}
                          onBlur={(e) => e.target.value !== s.title && update(doc.id, { body: renameSection(doc.body!, i, e.target.value), method: "edited" })}
                        />
                        <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{s.text || <em>No text. Usually a heading for the subsections below it.</em>}</p>
                      </div>
                      {i > 0 && (
                        <button
                          className="text-sm text-neutral-500 hover:text-primary"
                          onClick={() => update(doc.id, { body: mergeIntoPrevious(doc.body!, i), method: "edited" })}
                        >
                          Merge into §{sections[i - 1].number}
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              )
            )}
          </Card>
        );
      })}
    </div>
  );
}
