import type { GeneratedTraining } from "./schemas";

// Shared between server and browser. The browser gets the full pack (all docs
// are fictional and public), so the player can show source text for citations.

export type PackStyle = {
  tone: string;
  readingLevel: string;
  sentenceLength: string;
  colors: { primary: string; accent: string; background: string };
  logoText: string;
  preferences: string[];
  look: { font: "sans" | "serif"; corners: "sharp" | "soft" };
};

export type PackConfig = {
  name: string;
  displayName: string;
  organization: string;
  description: string;
  style: PackStyle;
  guardrails: string[];
  audience: { role: string; notes: string }[];
  glossary: { term: string; definition: string }[];
  neverSay: string[];
  starterPrompts: string[];
};

export type Section = {
  ref: string; // "footage-request-sop#2.2" or "glossary#Custody log"
  docId: string;
  docTitle: string;
  number: string; // "2.2"
  title: string;
  text: string;
};

export type Pack = PackConfig & {
  docs: { id: string; title: string }[];
  sections: Section[];
  // Example trainings for illustration and a reliable live demo. Never fed back to the AI.
  samples: GeneratedTraining[];
};

// "SOP-104: Customer Footage Requests" + "2.2" -> "SOP-104 §2.2"
export function sectionLabel(s: Section) {
  if (s.docId === "glossary") return `Glossary: ${s.title}`;
  const short = s.docTitle.includes(":") ? s.docTitle.split(":")[0].trim() : s.docTitle;
  return `${short} §${s.number}`;
}
