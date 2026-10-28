"use client";

import { useState } from "react";
import { storage, type SavedCertificate } from "@/lib/storage";
import { downloadCertificate } from "@/lib/certificate";

// Certificates saved in this browser, re-downloadable any time. Remounts each
// time the start screen shows, so it always reads the latest list.
export default function SavedCertificates() {
  const [certs, setCerts] = useState<SavedCertificate[]>(() => storage.certificates());

  if (certs.length === 0) return null;

  return (
    <div className="mt-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Saved certificates</p>
      <ul className="pk-card mt-2 divide-y divide-black/5">
        {certs.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <p className="font-semibold">{c.course}</p>
              <p className="text-neutral-500">
                {c.learner} · {c.packDisplayName} · {new Date(c.date).toLocaleDateString()} · {c.score}%
              </p>
            </div>
            <div className="flex gap-2">
              <button className="pk-btn-ghost px-3 py-1 text-sm" onClick={() => downloadCertificate(c)}>
                PDF
              </button>
              <button
                className="px-2 py-1 text-sm text-neutral-500 hover:text-red-700"
                aria-label={`Remove certificate ${c.id}`}
                onClick={() => {
                  storage.removeCertificate(c.id);
                  setCerts(storage.certificates());
                }}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
