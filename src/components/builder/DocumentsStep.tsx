"use client";

import { useState } from "react";
import { DOC_KIND_LABELS, type DocKind } from "@/lib/pack-types";
import { postFile } from "@/lib/client-api";
import { Card, Field, inputClass } from "./fields";
import { uniqueDocId, type DraftDoc } from "./draft";

type Props = { docs: DraftDoc[]; setDocs: (fn: (docs: DraftDoc[]) => DraftDoc[]) => void };

function guessKind(name: string): DocKind {
  const n = name.toLowerCase();
  if (/polic|pol-/.test(n)) return "policy";
  if (/guide/.test(n)) return "guideline";
  return "sop";
}

const ACCEPT = ".docx,.pdf,.txt,.md,.markdown";

export default function DocumentsStep({ docs, setDocs }: Props) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [uploading, setUploading] = useState<string[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteKind, setPasteKind] = useState<DocKind>("sop");
  const [pasteText, setPasteText] = useState("");

  function addDoc(title: string, kind: DocKind, text: string, source: string) {
    setDocs((current) => [...current, { id: uniqueDocId(title, current), title, kind, source, text, body: null }]);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadErrors([]);
    const list = Array.from(files);
    setUploading(list.map((f) => f.name));
    for (const file of list) {
      try {
        const { title, text } = await postFile<{ title: string; text: string }>("/api/extract", file);
        if (text.trim().length < 20) throw new Error("No usable text found.");
        addDoc(title, guessKind(file.name), text, file.name);
      } catch (e) {
        setUploadErrors((errs) => [...errs, `${file.name}: ${(e as Error).message}`]);
      }
      setUploading((u) => u.filter((n) => n !== file.name));
    }
  }

  function addPasted() {
    addDoc(pasteTitle.trim(), pasteKind, pasteText.trim(), "Pasted text");
    setPasteTitle("");
    setPasteText("");
  }

  const update = (id: string, patch: Partial<DraftDoc>) => setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  return (
    <div className="space-y-6">
      <Card title="Add your documents" hint="SOPs, policies, and guidelines. These become the only source of truth for every training built from this pack.">
        <div className="mb-4 flex gap-1 rounded-full bg-neutral-100 p-1 w-fit" role="tablist">
          {(["upload", "paste"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${mode === m ? "bg-white shadow text-primary" : "text-neutral-600"}`}
            >
              {m === "upload" ? "Upload files" : "Paste text"}
            </button>
          ))}
        </div>

        {mode === "upload" ? (
          <div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--pk-radius)] border-2 border-dashed border-black/15 bg-neutral-50 px-6 py-10 text-center hover:border-primary">
              <span className="font-semibold">Choose files</span>
              <span className="mt-1 text-sm text-neutral-500">Word (.docx), PDF, text, or markdown · up to 4 MB each · you can pick several</span>
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
            {uploading.length > 0 && <p className="mt-3 text-sm text-neutral-600">Reading {uploading.join(", ")}…</p>}
            {uploadErrors.map((err) => (
              <p key={err} className="mt-2 text-sm text-red-700">
                {err}
              </p>
            ))}
            <p className="mt-3 text-xs text-neutral-500">Scanned PDFs (pictures of pages) have no text to read. Paste the text instead.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <Field label="Document title">
                <input className={inputClass} value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="e.g. Visitor Sign-In SOP" />
              </Field>
              <Field label="Type">
                <KindSelect value={pasteKind} onChange={setPasteKind} />
              </Field>
            </div>
            <Field label="Text">
              <textarea className={inputClass} rows={10} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste the full document text here. Headings help, but aren't required." />
            </Field>
            <button className="pk-btn" disabled={!pasteTitle.trim() || pasteText.trim().length < 20} onClick={addPasted}>
              Add document
            </button>
          </div>
        )}
      </Card>

      <Card title={`Documents in this pack (${docs.length})`} hint={docs.length === 0 ? "Nothing added yet." : "Check each title and type. Titles appear in every citation."}>
        <ul className="space-y-3">
          {docs.map((d) => (
            <li key={d.id} className="rounded-[var(--pk-radius)] border border-black/10 p-4">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                <Field label="Title">
                  <input className={inputClass} value={d.title} onChange={(e) => update(d.id, { title: e.target.value })} />
                </Field>
                <Field label="Type">
                  <KindSelect value={d.kind} onChange={(kind) => update(d.id, { kind })} />
                </Field>
                <button className="pk-btn-ghost text-sm" onClick={() => setDocs((ds) => ds.filter((x) => x.id !== d.id))}>
                  Remove
                </button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                {d.source} · {d.text.length.toLocaleString()} characters
                {d.body ? " · sectioned" : ""}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{d.text.slice(0, 300).replace(/^#+\s*/gm, "")}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function KindSelect({ value, onChange }: { value: DocKind; onChange: (k: DocKind) => void }) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as DocKind)}>
      {(Object.keys(DOC_KIND_LABELS) as DocKind[]).map((k) => (
        <option key={k} value={k}>
          {DOC_KIND_LABELS[k]}
        </option>
      ))}
    </select>
  );
}
