"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Pack } from "@/lib/pack-types";
import type { Coverage, GeneratedTraining, Outline } from "@/lib/schemas";
import { storage } from "@/lib/storage";
import { postJson } from "@/lib/client-api";
import { customToPack, type CustomPackData } from "@/lib/custom-pack";
import { SourceProvider } from "./SourceDrawer";
import AskPanel from "./AskPanel";
import CoveragePanel from "./CoveragePanel";
import OutlinePanel from "./OutlinePanel";
import GeneratingPanel from "./GeneratingPanel";
import ReadyPanel from "./ReadyPanel";
import Player from "./Player";
import SavedCertificates from "./SavedCertificates";
import PackBuilder from "./builder/PackBuilder";

type Stage = "ask" | "coverage" | "outline" | "generating" | "ready" | "learn" | "builder";

const NEUTRAL_STYLE = {
  colors: { primary: "#334155", accent: "#D97706", background: "#F8FAFC" },
  look: { font: "sans", corners: "soft" },
} as const;

function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [builtIn, setBuiltIn] = useState<Pack[] | null>(null);
  const [customData, setCustomData] = useState<CustomPackData[]>([]);
  const [editPack, setEditPack] = useState<CustomPackData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [packName, setPackName] = useState<string>("");
  const [stage, setStage] = useState<Stage>("ask");
  const [request, setRequest] = useState("");
  const [role, setRole] = useState("");
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [generated, setGenerated] = useState<GeneratedTraining | null>(null);
  const [learner, setLearner] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/packs")
      .then((r) => r.json())
      .then((d: { packs: Pack[] }) => {
        setBuiltIn(d.packs);
        setCustomData(storage.customPacks());
        const first = d.packs.find((p) => p.name === "security-sop") ?? d.packs[0];
        setPackName(first.name);
        setRole(first.audience[0].role);
      })
      .catch(() => setLoadError("Couldn't load the content packs."));
  }, []);

  // Built-in packs come from the server; packs made in the builder live in this browser.
  const packs = useMemo(() => (builtIn ? [...builtIn, ...customData.map(customToPack)] : null), [builtIn, customData]);
  const pack = useMemo(() => packs?.find((p) => p.name === packName) ?? null, [packs, packName]);

  // What the API needs to know which pack to use: a built-in name, or the full custom pack.
  function packRef() {
    const custom = customData.find((c) => c.name === packName);
    return custom ? { pack: packName, customPack: custom } : { pack: packName };
  }

  function resetFlow(nextStage: Stage = "ask") {
    setStage(nextStage);
    setCoverage(null);
    setOutline(null);
    setGenerated(null);
    setError(null);
    setBusy(false);
  }

  function switchPack(name: string) {
    const next = packs?.find((p) => p.name === name);
    if (!next) return;
    setPackName(name);
    setRole(next.audience[0].role);
    setRequest("");
    resetFlow();
  }

  async function runCoverage() {
    if (!pack) return;
    setBusy(true);
    setError(null);
    try {
      const { coverage } = await postJson<{ coverage: Coverage }>("/api/coverage", { ...packRef(), request });
      setCoverage(coverage);
      setStage("coverage");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runOutline() {
    if (!pack || !coverage) return;
    setBusy(true);
    setError(null);
    try {
      const { outline } = await postJson<{ outline: Outline }>("/api/outline", { ...packRef(), request, role, coverage });
      setOutline(outline);
      setStage("outline");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runGenerate() {
    if (!pack || !outline) return;
    setStage("generating");
    setError(null);
    try {
      const result = await postJson<GeneratedTraining>("/api/generate", { ...packRef(), request, outline });
      storage.saveLastTraining(result);
      setGenerated(result);
      setStage("ready");
    } catch (e) {
      setError((e as Error).message);
      setStage("outline");
    }
  }

  function openBuilder(edit: CustomPackData | null) {
    setEditPack(edit);
    resetFlow("builder");
  }

  function onPackSaved(data: CustomPackData) {
    const all = storage.customPacks();
    setCustomData(all);
    setPackName(data.name);
    setRole(data.audience[0].role);
    setRequest("");
    setEditPack(null);
    resetFlow();
  }

  function deletePack(name: string) {
    const target = customData.find((c) => c.name === name);
    if (!target || !confirm(`Delete the pack "${target.displayName}" from this browser? Export it first if you want a copy.`)) return;
    storage.removeCustomPack(name);
    setCustomData(storage.customPacks());
    switchPack(builtIn?.[0]?.name ?? "");
  }

  function openTraining(g: GeneratedTraining) {
    setGenerated(g);
    setRequest(g.request);
    setStage("ready");
  }

  if (loadError) return <p className="p-10 text-red-700">{loadError}</p>;
  if (!packs || !pack) return <p className="p-10 text-neutral-500">Loading packs…</p>;

  // The pack builder isn't tied to any pack, so it uses a neutral look.
  const inBuilder = stage === "builder";
  const style = inBuilder ? NEUTRAL_STYLE : pack.style;
  const themeVars = {
    "--pk-primary": style.colors.primary,
    "--pk-accent": style.colors.accent,
    "--pk-bg": style.colors.background,
    "--pk-radius": style.look.corners === "soft" ? "16px" : "4px",
    "--pk-font": style.look.font === "serif" ? "var(--font-serif)" : "var(--font-geist-sans)",
  } as CSSProperties;

  return (
    <div className="pk-shell min-h-screen flex flex-col" style={themeVars}>
      <SourceProvider pack={pack}>
        <header className="border-b border-black/5 bg-white/80 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
            <button onClick={() => resetFlow()} className="flex items-baseline gap-3 text-left">
              <span className="pk-heading text-lg font-bold tracking-wider text-primary">{inBuilder ? "PIVOT TRAINER" : pack.style.logoText}</span>
              <span className="text-xs text-neutral-500 hidden sm:inline">
                {inBuilder ? "Set up a knowledge base" : `Training built from ${pack.organization}`}
              </span>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <nav aria-label="Content pack" className="flex flex-wrap gap-1 rounded-full bg-neutral-100 p-1">
                {packs.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => switchPack(p.name)}
                    disabled={busy || stage === "generating"}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                      p.name === pack.name ? "bg-white shadow text-primary" : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {p.displayName}
                  </button>
                ))}
              </nav>
              <button
                onClick={() => openBuilder(null)}
                disabled={busy || stage === "generating"}
                className="rounded-full border border-dashed border-black/25 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:border-primary hover:text-primary"
              >
                + New pack
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {error && (
            <div role="alert" className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {stage === "ask" && (
            <>
              <AskPanel
                key={pack.name}
                pack={pack}
                request={request}
                setRequest={setRequest}
                role={role}
                setRole={setRole}
                busy={busy}
                onSubmit={runCoverage}
                onOpenTraining={openTraining}
                onEditPack={pack.custom ? () => openBuilder(customData.find((c) => c.name === pack.name) ?? null) : undefined}
                onExportPack={pack.custom ? () => downloadJson(`${pack.name}.json`, customData.find((c) => c.name === pack.name)) : undefined}
                onDeletePack={pack.custom ? () => deletePack(pack.name) : undefined}
                onNewPack={() => openBuilder(null)}
              />
              <SavedCertificates />
            </>
          )}
          {stage === "builder" && (
            <PackBuilder
              key={editPack?.name ?? "new"}
              editPack={editPack}
              onSaved={onPackSaved}
              onCancel={() => {
                setEditPack(null);
                resetFlow();
              }}
            />
          )}
          {stage === "coverage" && coverage && (
            <CoveragePanel
              request={request}
              coverage={coverage}
              busy={busy}
              onBack={() => resetFlow()}
              onContinue={runOutline}
            />
          )}
          {stage === "outline" && outline && (
            <OutlinePanel outline={outline} onBack={() => setStage("coverage")} onApprove={runGenerate} />
          )}
          {stage === "generating" && <GeneratingPanel />}
          {stage === "ready" && generated && (
            <ReadyPanel
              generated={generated}
              learner={learner}
              setLearner={setLearner}
              onStart={() => setStage("learn")}
              onBack={() => resetFlow()}
            />
          )}
          {stage === "learn" && generated && (
            <Player
              key={generated.createdAt}
              pack={pack}
              generated={generated}
              learner={learner}
              onExit={() => resetFlow()}
            />
          )}
        </main>

        <footer className="py-6 text-center text-xs text-neutral-500">
          Pivot Trainer is an independent prototype. The sample packs and their organizations are fictional. Not affiliated with any training vendor.
        </footer>
      </SourceProvider>
    </div>
  );
}
