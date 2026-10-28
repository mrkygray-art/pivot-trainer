"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Pack, Section } from "@/lib/pack-types";
import { sectionLabel } from "@/lib/pack-types";
import type { Citation } from "@/lib/schemas";

type Ctx = { pack: Pack; open: (c: Citation) => void; find: (ref: string) => Section | undefined };
const SourceContext = createContext<Ctx | null>(null);

export function useSources() {
  const ctx = useContext(SourceContext);
  if (!ctx) throw new Error("useSources must be used inside SourceProvider");
  return ctx;
}

function findIn(pack: Pack, ref: string) {
  return pack.sections.find((s) => s.ref === ref) ?? pack.sections.find((s) => s.ref.toLowerCase() === ref.toLowerCase());
}

// Highlights the cited quote inside the section text (case-insensitive; best effort on the first fragment).
function Highlighted({ text, quote }: { text: string; quote: string }) {
  const fragment = quote.split(/\.\.\.|…/)[0].trim().replace(/^["']|["'.]$/g, "");
  const idx = fragment ? text.toLowerCase().indexOf(fragment.toLowerCase()) : -1;
  if (idx < 0) return <p className="whitespace-pre-wrap leading-relaxed">{text}</p>;
  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {text.slice(0, idx)}
      <mark className="pk-quote">{text.slice(idx, idx + fragment.length)}</mark>
      {text.slice(idx + fragment.length)}
    </p>
  );
}

export function SourceProvider({ pack, children }: { pack: Pack; children: ReactNode }) {
  const [active, setActive] = useState<Citation | null>(null);
  const section = active ? findIn(pack, active.ref) : undefined;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <SourceContext.Provider value={{ pack, open: setActive, find: (ref) => findIn(pack, ref) }}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <motion.aside
              role="dialog"
              aria-label="Where this came from"
              className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
              initial={{ x: 40 }}
              animate={{ x: 0 }}
              exit={{ x: 40 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-subtle">Where this came from</p>
                  <h2 className="pk-heading mt-1 text-xl font-bold">{section ? sectionLabel(section) : active.ref}</h2>
                </div>
                <button onClick={() => setActive(null)} className="pk-btn-ghost px-3 py-1 text-sm" aria-label="Close source">
                  Close
                </button>
              </div>
              {section ? (
                <>
                  <h3 className="mt-5 font-semibold">{section.title}</h3>
                  <div className="mt-2 text-[15px] text-ink">
                    <Highlighted text={section.text || section.title} quote={active.quote} />
                  </div>
                  <p className="mt-6 text-sm text-subtle">From your documents. The highlighted words are the exact text this part of the lesson is based on.</p>
                </>
              ) : (
                <p className="mt-5 text-red-700">We couldn&apos;t find this part in your documents. It is marked for a closer look.</p>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </SourceContext.Provider>
  );
}

export function CitationChips({ citations, className = "" }: { citations: Citation[]; className?: string }) {
  const { open, find } = useSources();
  // One chip per section, even if it's quoted twice.
  const unique = citations.filter((c, i) => citations.findIndex((x) => x.ref === c.ref) === i);
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {unique.map((c) => {
        const s = find(c.ref);
        return (
          <button key={c.ref} type="button" className="pk-chip" onClick={() => open(c)} title={`"${c.quote}"`}>
            <span aria-hidden>§</span> {s ? sectionLabel(s) : c.ref}
          </button>
        );
      })}
    </div>
  );
}
