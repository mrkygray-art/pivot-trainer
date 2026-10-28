"use client";

import { DEMO_LIMITS } from "@/lib/config";
import { Card, Note, StatusChip } from "./ui";

type SampleInfo = { organization: string; description: string } | null;

type Props = {
  sample: SampleInfo;
  hasSecondSample: boolean;
  hasFinishedExample: boolean;
  onStart: () => void;
  onOpenSaved: () => void;
  onOpenSample: () => void;
  onSeeExample: () => void;
  onSecondSample: () => void;
};

const HOW = [
  { n: 1, title: "Add documents", text: "Upload or paste your policies and procedures." },
  { n: 2, title: "Style and rules", text: "Pick a tone and add key terms. Optional." },
  { n: 3, title: "Describe it", text: "Say what the training should cover." },
  { n: 4, title: "Learn and certificate", text: "Take the lesson and quiz, then download a certificate." },
];

export default function StartScreen(props: Props) {
  const { sample } = props;
  return (
    <div className="space-y-10">
      <section className="pt-4">
        <h1 className="max-w-3xl text-4xl sm:text-5xl font-bold text-ink">Turn your policies into a short, interactive training.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Add your own documents. We build a short lesson and quiz from them, and every slide shows where it came from.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button className="pk-btn px-7 text-lg" onClick={props.onStart}>
            Start with my documents
          </button>
          <span className="text-muted">No account or sign-in needed.</span>
        </div>
        <p className="mt-3 text-subtle">
          Have a saved demo?{" "}
          <button type="button" className="font-semibold text-primary underline underline-offset-2" onClick={props.onOpenSaved}>
            Open it
          </button>
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <Card title="What this demo gives you">
          <ul className="space-y-3">
            <li>
              <span className="font-semibold">One short lesson:</span> {DEMO_LIMITS.slides} slides and {DEMO_LIMITS.activities} interactive activity.
            </li>
            <li>
              <span className="font-semibold">A {DEMO_LIMITS.questions}-question quiz.</span> A missed question shows the exact part of the document, then asks again.
            </li>
            <li>
              <span className="font-semibold">A certificate</span> you can download as a PDF.
            </li>
          </ul>
        </Card>
        <Note>
          <p className="font-semibold">This is a demo.</p>
          <p className="mt-1">
            It builds one short lesson, not a full course. For this demo, please use documents you are comfortable sharing. Nothing is kept after you leave, so download your
            demo if you want to use it again.
          </p>
        </Note>
      </div>

      <section>
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((h) => (
            <li key={h.n} className="pk-card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-soft font-bold text-primary" aria-hidden>
                {h.n}
              </span>
              <p className="mt-3 font-semibold">
                <span className="sr-only">Step {h.n}: </span>
                {h.title}
              </p>
              <p className="mt-1 text-muted">{h.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {sample && (
        <section>
          <h2 className="text-2xl font-bold">Just want to look around first?</h2>
          <div className="pk-card mt-4 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div className="max-w-xl">
              <StatusChip kind="neutral">Sample</StatusChip>
              <p className="mt-2 text-lg font-semibold">{sample.organization}</p>
              <p className="text-muted">{sample.description} A made-up company with ready documents, style, and rules. You can add your own before building.</p>
            </div>
            <div className="flex flex-col items-start gap-1">
              <button className="pk-btn-ghost" onClick={props.onOpenSample}>
                Open sample
              </button>
              {props.hasFinishedExample && (
                <button type="button" className="pk-link text-sm" onClick={props.onSeeExample}>
                  See a finished example
                </button>
              )}
            </div>
          </div>
          {props.hasSecondSample && (
            <p className="mt-3 text-subtle">
              Another sample:{" "}
              <button type="button" className="font-semibold text-primary underline underline-offset-2" onClick={props.onSecondSample}>
                a security company&apos;s field procedures
              </button>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
