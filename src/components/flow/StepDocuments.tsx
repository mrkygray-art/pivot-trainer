"use client";

import { useState } from "react";
import { postFile, postJson } from "@/lib/client-api";
import { Card, Note, StatusChip, StepFooter, StepIntro } from "./ui";
import TopicEditor from "./TopicEditor";
import { docSections, readyDocs, uniqueDocId, type SectionMethod, type Working, type WorkingDoc } from "./working";
import type { DocKind } from "@/lib/pack-types";

type Props = {
  working: Working;
  setDocs: (fn: (docs: WorkingDoc[]) => WorkingDoc[]) => void;
  onNext: () => void;
  onBack: () => void;
  onOpenSaved: () => void;
};

const ACCEPT = ".docx,.pdf,.txt,.md,.markdown";
type SectionResponse = { body: string; method: SectionMethod; docTitle?: string };

function guessKind(name: string): DocKind {
  const n = name.toLowerCase();
  if (/polic/.test(n)) return "policy";
  if (/guide/.test(n)) return "guideline";
  return "sop";
}

export default function StepDocuments({ working, setDocs, onNext, onBack, onOpenSaved }: Props) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [editTopics, setEditTopics] = useState(false);

  const update = (id: string, patch: Partial<WorkingDoc>) => setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  // Read a document, then find its topics. Both steps report a plain status.
  async function findTopics(id: string, title: string, text: string, fromFile: boolean) {
    update(id, { status: "sectioning", text });
    try {
      const res = await postJson<SectionResponse>("/api/sections", { title, text });
      update(id, { status: "ready", body: res.body, method: res.method, ...(res.docTitle && fromFile ? { title: res.docTitle } : {}) });
    } catch (e) {
      update(id, { status: "error", error: (e as Error).message });
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const taken = [...working.docs];
    const queued = Array.from(files).map((file) => {
      const title = file.name.replace(/\.[^.]+$/, "");
      const doc: WorkingDoc = { id: uniqueDocId(title, taken), title, kind: guessKind(file.name), source: file.name, sample: false, status: "reading", text: "", body: null };
      taken.push(doc);
      return { file, doc };
    });
    setDocs((ds) => [...ds, ...queued.map((q) => q.doc)]);
    for (const { file, doc } of queued) {
      const id = doc.id;
      try {
        const { title, text } = await postFile<{ title: string; text: string }>("/api/extract", file);
        if (text.trim().length < 20) throw new Error("We found no text in it.");
        update(id, { title });
        await findTopics(id, title, text, true);
      } catch (e) {
        update(id, { status: "error", error: (e as Error).message });
      }
    }
  }

  function addPasted() {
    const title = pasteTitle.trim();
    const text = pasteText.trim();
    const id = uniqueDocId(title, working.docs);
    setDocs((ds) => [...ds, { id, title, kind: "sop", source: "Pasted text", sample: false, status: "sectioning", text, body: null }]);
    setPasteTitle("");
    setPasteText("");
    findTopics(id, title, text, false);
  }

  const ready = readyDocs(working);
  const busy = working.docs.some((d) => d.status === "reading" || d.status === "sectioning");
  const mainTopics = ready.flatMap((d) => docSections(d).filter((s) => !s.number.includes(".")).map((s) => ({ key: s.ref, title: s.title })));

  return (
    <div>
      <StepIntro step="Step 1 of 4" title="Add your documents">
        <p>The training uses only these documents. If something isn&apos;t in them, we&apos;ll tell you instead of making it up.</p>
      </StepIntro>

      <div className="space-y-6">
        <Card>
          <div className="mb-4 flex w-fit gap-1 rounded-full bg-[#EEF1F5] p-1" role="tablist" aria-label="How to add a document">
            {(["upload", "paste"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`min-h-[44px] rounded-full px-5 font-semibold ${mode === m ? "bg-white text-primary shadow" : "text-muted"}`}
              >
                {m === "upload" ? "Upload files" : "Paste text"}
              </button>
            ))}
          </div>

          {mode === "upload" ? (
            <div>
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-[#FAFBFC] px-6 py-10 text-center">
                <label className="pk-btn cursor-pointer">
                  Choose files
                  <input
                    type="file"
                    multiple
                    accept={ACCEPT}
                    className="sr-only"
                    aria-label="Choose document files"
                    onChange={(e) => {
                      onFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="mt-3 text-muted">Word, PDF, text, or Markdown · up to 4 MB each · you can choose several</p>
              </div>
              <p className="mt-3 text-sm text-subtle">
                A scanned PDF (a picture of a page) has no text we can read. Use{" "}
                <button type="button" className="font-semibold text-primary underline" onClick={() => setMode("paste")}>
                  Paste text
                </button>{" "}
                instead.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <span className="font-semibold">Document name</span>
                <input className="app-input mt-1" value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="For example: Visitor sign-in procedure" />
              </label>
              <label className="block">
                <span className="font-semibold">Document text</span>
                <textarea className="app-input mt-1" rows={9} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste the full text here." />
              </label>
              <button className="pk-btn" disabled={!pasteTitle.trim() || pasteText.trim().length < 20} onClick={addPasted}>
                Add this document
              </button>
            </div>
          )}
        </Card>

        <Card title="Your documents" hint={working.docs.length === 0 ? "Nothing added yet." : undefined}>
          <ul className="divide-y divide-line">
            {working.docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {d.title}
                    {d.sample && (
                      <span className="ml-2 align-middle">
                        <StatusChip kind="neutral">Sample</StatusChip>
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-subtle">
                    {d.status === "reading" && "Reading…"}
                    {d.status === "sectioning" && "Finding the topics…"}
                    {d.status === "ready" && (
                      <span className="text-success">✓ Read successfully · {docSections(d).length} topics</span>
                    )}
                    {d.status === "error" && <span className="text-[#9B1C1C]">We could not read this one. {d.error}</span>}
                  </p>
                </div>
                <button
                  className="pk-btn-ghost text-sm"
                  aria-label={`Remove ${d.title}`}
                  onClick={() => setDocs((ds) => ds.filter((x) => x.id !== d.id))}
                  disabled={d.status === "reading" || d.status === "sectioning"}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {ready.length > 0 && (
          <Card title="Here is what we found in your documents" hint="Does this match what you expect? Not sure? Skip this. It's fine as is.">
            <div className="flex flex-wrap gap-2">
              {mainTopics.slice(0, 18).map((t) => (
                <span key={t.key} className="rounded-full border border-line bg-[#FAFBFC] px-3 py-1 text-sm">
                  {t.title}
                </span>
              ))}
              {mainTopics.length > 18 && <span className="px-2 py-1 text-sm text-subtle">and {mainTopics.length - 18} more</span>}
            </div>
            <button type="button" className="pk-link mt-3" aria-expanded={editTopics} onClick={() => setEditTopics((v) => !v)}>
              {editTopics ? "Done editing the topics" : "Edit the topics"}
            </button>
            {editTopics && <TopicEditor docs={ready} update={update} />}
          </Card>
        )}

        <p className="text-sm text-subtle">
          Have a saved demo?{" "}
          <button type="button" className="font-semibold text-primary underline" onClick={onOpenSaved}>
            Open it
          </button>
        </p>
      </div>

      <StepFooter
        onBack={onBack}
        next={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {busy && <span className="text-subtle">Still reading your documents…</span>}
            {!busy && ready.length === 0 && <span className="text-subtle">Add at least one document to continue.</span>}
            <button className="pk-btn" disabled={busy || ready.length === 0} onClick={onNext}>
              Next: Style and rules →
            </button>
          </div>
        }
      />
      {working.docs.some((d) => d.status === "error") && ready.length > 0 && (
        <div className="mt-3">
          <Note>Documents we could not read are left out. Remove them, or paste their text instead.</Note>
        </div>
      )}
    </div>
  );
}
