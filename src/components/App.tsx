"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { postJson } from "@/lib/client-api";
import { customToPack } from "@/lib/custom-pack";
import { buildDemoFile, demoFileName, parseDemoFile, type DemoFile } from "@/lib/demo-file";
import type { Coverage, GeneratedTraining, Outline, RuleSuggestions } from "@/lib/schemas";
import { SourceProvider } from "./SourceDrawer";
import Player from "./Player";
import StartScreen from "./flow/StartScreen";
import StepDocuments from "./flow/StepDocuments";
import StepStyle from "./flow/StepStyle";
import StepDescribe from "./flow/StepDescribe";
import BuildScreen, { type BuildPhase } from "./flow/BuildScreen";
import ReadyScreen from "./flow/ReadyScreen";
import ResultsScreen from "./flow/ResultsScreen";
import { emptyWorking, readyDocs, toPackData, topicIdeas, workingFromPack, type Working, type WorkingDoc } from "./flow/working";

type Stage = "start" | "documents" | "style" | "describe" | "build" | "ready" | "lesson" | "results" | "practice";

const STEPS = ["Add documents", "Style and rules", "Describe it", "Learn and certificate"] as const;
const STEP_OF: Record<Stage, number> = { start: -1, documents: 0, style: 1, describe: 2, build: 2, ready: 2, lesson: 3, results: 3, practice: 3 };
const STEP_STAGE: Stage[] = ["documents", "style", "describe"];

function download(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Everything for the visit lives in this component's state. Nothing is written to
// browser storage or the server, so a reload or a later visit starts fresh.
export default function App() {
  const [samples, setSamples] = useState<{ sample: DemoFile; secondSample: DemoFile } | null>(null);
  const [stage, setStage] = useState<Stage>("start");
  const [working, setWorking] = useState<Working>(() => emptyWorking());
  const [training, setTraining] = useState<GeneratedTraining | null>(null);
  const [savedTrainingReady, setSavedTrainingReady] = useState(false);
  const [request, setRequest] = useState("");
  const [role, setRole] = useState("");
  const [buildPhase, setBuildPhase] = useState<BuildPhase>("checking");
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [learner, setLearner] = useState("");
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [practiceDone, setPracticeDone] = useState(false);
  const [aiIdeas, setAiIdeas] = useState<string[]>([]);
  const [suggestedTerms, setSuggestedTerms] = useState<RuleSuggestions["glossary"]>([]);
  const [dirty, setDirty] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const suggestKey = useRef("");

  useEffect(() => {
    fetch("/api/samples")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSamples(d))
      .catch(() => {});
  }, []);

  // Warn before leaving when there is work to lose.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "If you leave, your demo will be lost. Download it first.";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const packData = useMemo(() => toPackData(working), [working]);
  const pack = useMemo(() => customToPack(packData), [packData]);
  const userDocs = working.docs.filter((d) => !d.sample);
  const ideas = useMemo(() => {
    const fromSample = working.isSample ? working.starterPrompts : [];
    return [...new Set([...aiIdeas, ...fromSample, ...topicIdeas(working)])].slice(0, 3);
  }, [aiIdeas, working]);
  const canSave = userDocs.length > 0 || training !== null;

  function go(next: Stage) {
    setMenuOpen(false);
    setNotice(null);
    setStage(next);
    window.scrollTo({ top: 0 });
  }

  function setDocs(fn: (docs: WorkingDoc[]) => WorkingDoc[]) {
    setDirty(true);
    setWorking((w) => ({ ...w, docs: fn(w.docs) }));
  }

  function editWorking(fn: (w: Working) => Working) {
    setDirty(true);
    setWorking(fn);
  }

  function resetAll() {
    setWorking(emptyWorking());
    setTraining(null);
    setSavedTrainingReady(false);
    setRequest("");
    setRole("");
    setCoverage(null);
    setBuildError(null);
    setLearner("");
    setReviewedIds([]);
    setPracticeDone(false);
    setAiIdeas([]);
    setSuggestedTerms([]);
    setDirty(false);
    suggestKey.current = "";
  }

  function startOver() {
    if (dirty && !confirm("Start over? Everything you added will be cleared. Download your demo first if you want to keep it.")) return;
    resetAll();
    go("start");
  }

  function startWithMyDocuments() {
    if (working.isSample) resetAll();
    go("documents");
  }

  function useOwnDocuments() {
    if (dirty && !confirm("Leave the sample? What you added to it will be cleared.")) return;
    resetAll();
    go("documents");
  }

  // Samples and saved demos share one format and one loading path.
  function loadDemo(demo: DemoFile, opts: { showTraining: boolean; goTo: Stage }) {
    resetAll();
    const w = workingFromPack(demo.pack, !!demo.isSample);
    setWorking(w);
    setRole(w.audience[0]?.role ?? "");
    if (opts.showTraining && demo.training) {
      setTraining(demo.training);
      setSavedTrainingReady(opts.goTo === "describe");
    }
    go(opts.goTo);
  }

  async function openSavedFile(file: File | undefined) {
    if (!file) return;
    setNotice(null);
    const result = parseDemoFile(await file.text());
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    loadDemo(result.demo, { showTraining: true, goTo: "describe" });
  }

  function saveDemo() {
    setMenuOpen(false);
    if (!confirm("This file includes the text of your documents. Share it carefully.\n\nDownload it now?")) return;
    download(demoFileName(), buildDemoFile(packData, training, working.isSample));
  }

  // After Step 1, draft ideas, audience roles, and key terms from the user's own documents.
  async function suggestFromDocuments() {
    const docs = readyDocs(working).filter((d) => !d.sample);
    const key = docs.map((d) => `${d.id}:${d.body?.length}`).join("|");
    if (!docs.length || key === suggestKey.current) return;
    suggestKey.current = key;
    try {
      const { suggestions } = await postJson<{ suggestions: RuleSuggestions }>("/api/suggest-rules", {
        docs: docs.map((d) => ({ title: d.title, markdown: d.body ?? "" })),
      });
      setAiIdeas(suggestions.starterPrompts.map((p) => p.replace(/^Build a short training on\s*/i, "A short training on ")));
      setSuggestedTerms(suggestions.glossary);
      setWorking((w) => {
        const roles = [...w.audience, ...suggestions.audience.filter((a) => !w.audience.some((x) => x.role === a.role))];
        return { ...w, audience: roles, organization: w.organization || suggestions.organization };
      });
      setRole((r) => r || suggestions.audience[0]?.role || "");
    } catch {
      suggestKey.current = ""; // Ideas fall back to topic names; nothing else depends on this.
    }
  }

  async function build(skipCoverageGate = false) {
    setBuildError(null);
    setSavedTrainingReady(false);
    go("build");
    try {
      let cov = coverage;
      if (!skipCoverageGate || !cov) {
        setBuildPhase("checking");
        cov = (await postJson<{ coverage: Coverage }>("/api/coverage", { pack: packData.name, customPack: packData, request })).coverage;
        setCoverage(cov);
        if (cov.verdict === "not_covered") return setBuildPhase("not_covered");
        if (cov.verdict === "partly" && !skipCoverageGate) return setBuildPhase("partly");
      }
      setBuildPhase("writing");
      const effectiveRole = packData.audience.some((a) => a.role === role) ? role : packData.audience[0].role;
      const { outline } = await postJson<{ outline: Outline }>("/api/outline", { pack: packData.name, customPack: packData, request, role: effectiveRole, coverage: cov });
      setBuildPhase("generating");
      const result = await postJson<GeneratedTraining>("/api/generate", { pack: packData.name, customPack: packData, request, outline });
      setTraining(result);
      setReviewedIds([]);
      setPracticeDone(false);
      setDirty(true);
      go("ready");
    } catch (e) {
      setBuildError(`We couldn't build the training. ${(e as Error).message}`);
      go("describe");
    }
  }

  const step = STEP_OF[stage];
  const lessonVars = {
    "--pk-primary": pack.style.colors.primary,
    "--pk-accent": pack.style.colors.accent,
    "--pk-bg": pack.style.colors.background,
    "--pk-radius": pack.style.look.corners === "soft" ? "16px" : "6px",
    "--pk-font": pack.style.look.font === "serif" ? "var(--font-serif)" : "var(--font-inter)",
  } as CSSProperties;
  const wide = stage === "start" || stage === "results";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-4 py-3">
          <button className="flex min-h-[44px] items-center gap-3" onClick={() => (stage === "start" ? null : go("start"))} aria-label="Pivot Trainer, go to the start">
            <span className="app-heading text-xl font-bold text-ink">Pivot Trainer</span>
            <span className="rounded-full bg-demo-bg px-2.5 py-0.5 text-sm font-semibold text-demo-ink">Demo version</span>
          </button>
          <div className="relative">
            <button className="pk-btn-ghost" aria-expanded={menuOpen} aria-controls="app-menu" onClick={() => setMenuOpen((v) => !v)}>
              Menu
            </button>
            {menuOpen && (
              <div id="app-menu" className="absolute right-0 mt-2 w-60 rounded-xl border border-line bg-white p-2 shadow-lg">
                {canSave && (
                  <button className="block min-h-[44px] w-full rounded-lg px-3 text-left hover:bg-soft" onClick={saveDemo}>
                    Save my demo
                  </button>
                )}
                <button
                  className="block min-h-[44px] w-full rounded-lg px-3 text-left hover:bg-soft"
                  onClick={() => {
                    setMenuOpen(false);
                    fileInput.current?.click();
                  }}
                >
                  Open a saved demo
                </button>
                <button className="block min-h-[44px] w-full rounded-lg px-3 text-left hover:bg-soft" onClick={startOver}>
                  Start over
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label="Open a saved demo file"
        tabIndex={-1}
        onChange={(e) => {
          openSavedFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <main className={`mx-auto w-full flex-1 px-4 py-8 ${wide ? "max-w-[1120px]" : "max-w-[960px]"}`}>
        {step >= 0 && (
          <nav aria-label="Your progress" className="mb-8">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STEPS.map((label, i) => {
                const done = i < step || stage === "results";
                const current = i === step && stage !== "results";
                const clickable = done && i < 3 && stage !== "build";
                const body = (
                  <>
                    <span className="block text-sm text-subtle">Step {i + 1}</span>
                    <span className="block font-semibold">
                      {done && <span aria-hidden>✓ </span>}
                      {label}
                      {done && <span className="sr-only"> (done)</span>}
                    </span>
                  </>
                );
                const cls = `block w-full rounded-xl border-2 px-3 py-2 text-left ${
                  current ? "border-[#1B4FD6] bg-soft" : done ? "border-line bg-white" : "border-transparent bg-[#EEF1F5] text-subtle"
                }`;
                return (
                  <li key={label}>
                    {clickable ? (
                      <button className={`${cls} min-h-[44px] hover:border-[#1B4FD6]`} onClick={() => go(STEP_STAGE[i])}>
                        {body}
                      </button>
                    ) : (
                      <div className={cls} aria-current={current ? "step" : undefined}>
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {notice && (
          <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-[#F1B5B5] bg-[#FDECEC] px-4 py-3 text-[#7F1D1D]">
            <span>{notice}</span>
            <button className="min-h-[44px] px-2 font-semibold" onClick={() => setNotice(null)} aria-label="Dismiss message">
              ✕
            </button>
          </div>
        )}

        {working.isSample && ["documents", "style", "describe"].includes(stage) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-2">
            <span>You are using a sample. The company is made up.</span>
            <button className="pk-link" onClick={useOwnDocuments}>
              Use my own documents instead
            </button>
          </div>
        )}

        {stage === "start" && (
          <StartScreen
            sample={samples ? { organization: samples.sample.pack.organization, description: samples.sample.pack.description } : null}
            hasSecondSample={!!samples}
            hasFinishedExample={!!samples?.sample.training}
            onStart={startWithMyDocuments}
            onOpenSaved={() => fileInput.current?.click()}
            onOpenSample={() => samples && loadDemo(samples.sample, { showTraining: false, goTo: "describe" })}
            onSeeExample={() => samples && loadDemo(samples.sample, { showTraining: true, goTo: "ready" })}
            onSecondSample={() => samples && loadDemo(samples.secondSample, { showTraining: false, goTo: "describe" })}
          />
        )}

        {stage === "documents" && (
          <StepDocuments
            working={working}
            setDocs={setDocs}
            onBack={() => go("start")}
            onOpenSaved={() => fileInput.current?.click()}
            onNext={() => {
              suggestFromDocuments();
              go("style");
            }}
          />
        )}

        {stage === "style" && (
          <StepStyle working={working} setWorking={editWorking} suggestedTerms={suggestedTerms} onBack={() => go("documents")} onNext={() => go("describe")} />
        )}

        {stage === "describe" && (
          <StepDescribe
            working={working}
            request={request}
            setRequest={setRequest}
            role={packData.audience.some((a) => a.role === role) ? role : packData.audience[0].role}
            setRole={setRole}
            ideas={ideas}
            savedTraining={savedTrainingReady ? training : null}
            error={buildError}
            onOpenSavedTraining={() => go("ready")}
            onBuild={() => build(false)}
            onBack={() => go("style")}
            onChangeStyle={() => go("style")}
            onChangeDocuments={() => go("documents")}
          />
        )}

        {stage === "build" && (
          <BuildScreen
            phase={buildPhase}
            request={request}
            coverage={coverage}
            ideas={ideas}
            onBuildPart={() => build(true)}
            onAddDocument={() => go("documents")}
            onPickIdea={(idea) => {
              setRequest(idea);
              go("describe");
            }}
            onBack={() => go("describe")}
          />
        )}

        {stage === "ready" && training && (
          <ReadyScreen generated={training} learner={learner} setLearner={setLearner} onStart={() => go("lesson")} onBack={() => go("describe")} />
        )}

        {(stage === "lesson" || stage === "practice") && training && (
          <div className="pk-lesson rounded-[20px] p-3 sm:p-6" style={{ ...lessonVars, background: pack.style.colors.background }}>
            <SourceProvider pack={pack}>
              <Player
                key={`${training.createdAt}-${stage}`}
                generated={training}
                learner={learner}
                practiceIds={stage === "practice" ? reviewedIds : undefined}
                onMastered={(reviewed) => {
                  if (stage === "practice") setPracticeDone(true);
                  else setReviewedIds(reviewed);
                  go("results");
                }}
                onExit={() => go(stage === "practice" ? "results" : "ready")}
              />
            </SourceProvider>
          </div>
        )}

        {stage === "results" && training && (
          <ResultsScreen
            pack={pack}
            generated={training}
            learner={learner}
            reviewedIds={reviewedIds}
            practiceDone={practiceDone}
            onPractice={() => go("practice")}
            onSaveDemo={saveDemo}
            onBuildAnother={() => {
              setRequest("");
              setCoverage(null);
              go("describe");
            }}
          />
        )}
      </main>

      <footer className="border-t border-line bg-white py-6 text-center text-sm text-subtle">
        Pivot Trainer is an independent prototype. Sample companies are fictional. Not affiliated with any training vendor.
      </footer>
    </div>
  );
}
