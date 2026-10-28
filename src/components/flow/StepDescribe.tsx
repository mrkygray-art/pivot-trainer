"use client";

import { useRef, useState } from "react";
import { DEMO_LIMITS } from "@/lib/config";
import { speechSupported, startDictation } from "@/lib/speech";
import type { GeneratedTraining } from "@/lib/schemas";
import { Card, StepFooter, StepIntro } from "./ui";
import { TONES, readyDocs, roleLabel, toneId, topicCount, type Working } from "./working";

type Props = {
  working: Working;
  request: string;
  setRequest: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  ideas: string[];
  savedTraining: GeneratedTraining | null;
  error: string | null;
  onOpenSavedTraining: () => void;
  onBuild: () => void;
  onBack: () => void;
  onChangeStyle: () => void;
  onChangeDocuments: () => void;
};

export default function StepDescribe(props: Props) {
  const { working, request, setRequest, role, setRole, ideas, savedTraining, error } = props;
  // Only rendered in the browser after the user acts, so this reads once.
  const [micOk] = useState(() => speechSupported());
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const docs = readyDocs(working);
  const tone = TONES.find((t) => t.id === toneId(working.style.tone))!;
  const roles = working.audience.filter((a) => a.role.trim());

  function toggleMic() {
    if (listening) return stopRef.current();
    setMicError(null);
    setListening(true);
    stopRef.current = startDictation({ onText: (t) => setRequest(t), onError: setMicError, onEnd: () => setListening(false) });
  }

  return (
    <div>
      <StepIntro step="Step 3 of 4" title="Describe the training you need" />

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-[#F1B5B5] bg-[#FDECEC] px-4 py-3 text-[#7F1D1D]">
          {error}
        </div>
      )}

      {savedTraining && (
        <div className="mb-6">
          <Card title="Your saved training is ready" hint={savedTraining.training.title}>
            <button className="pk-btn" onClick={props.onOpenSavedTraining}>
              Start this training →
            </button>
            <span className="ml-3 text-subtle">or describe a new one below.</span>
          </Card>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <label htmlFor="request" className="text-xl font-bold app-heading">
            What should the training cover?
          </label>
          <textarea
            id="request"
            className="app-input mt-3 text-lg"
            rows={4}
            maxLength={500}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="For example: what a manager should do when an employee raises a concern"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {micOk && (
              <button type="button" onClick={toggleMic} aria-pressed={listening} className={`pk-btn-ghost ${listening ? "border-[#B91C1C] text-[#B91C1C]" : ""}`}>
                {listening ? "● Listening… tap to stop" : "🎤 Speak it"}
              </button>
            )}
            {micOk && <span className="text-sm text-subtle">Works best in Chrome or Edge. You can always type instead.</span>}
          </div>
          {micError && <p className="mt-2 text-sm text-demo-ink">{micError}</p>}

          {ideas.length > 0 && (
            <div className="mt-5">
              <p className="text-muted">Not sure what to ask for? Try an idea from your documents:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ideas.map((idea) => (
                  <button key={idea} type="button" className="pk-chip" onClick={() => setRequest(idea)}>
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {roles.length > 0 && (
          <Card title="Who is this training for?">
            <fieldset>
              <legend className="sr-only">Who is this training for?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {roles.map((a) => (
                  <label key={a.role} className="choice-card">
                    <input type="radio" name="role" checked={role === a.role} onChange={() => setRole(a.role)} />
                    <span>
                      <span className="block font-semibold">{roleLabel(a.role)}</span>
                      {a.notes && <span className="block text-sm text-subtle">{a.notes}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card title="What you will get">
            <ul className="space-y-1">
              <li>✓ {DEMO_LIMITS.slides} slides</li>
              <li>✓ {DEMO_LIMITS.activities} interactive activity</li>
              <li>✓ {DEMO_LIMITS.questions} quiz questions</li>
              <li>✓ Tone: {tone.label.toLowerCase()}</li>
            </ul>
            <button type="button" className="pk-link mt-2" onClick={props.onChangeStyle}>
              Change style and rules
            </button>
          </Card>
          <Card title="We check your documents first">
            <p className="text-muted">
              Before writing anything, we check that your documents cover what you asked for. If part of it isn&apos;t there, we tell you and never make it up.
            </p>
            <button type="button" className="pk-link mt-2" onClick={props.onChangeDocuments}>
              Your documents: {docs.length} {docs.length === 1 ? "document" : "documents"}, {topicCount(working)} topics
            </button>
          </Card>
        </div>
      </div>

      <StepFooter
        onBack={props.onBack}
        next={
          <button className="pk-btn" disabled={request.trim().length < 3} onClick={props.onBuild}>
            Build my training →
          </button>
        }
      />
    </div>
  );
}
