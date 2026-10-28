import { z } from "zod";

// These schemas are sent to Claude as structured-output formats, so they stay
// simple: no min/max constraints (limits are enforced in prompts and in code).

// A citation points at one numbered section ("footage-request-sop#2.2") or a
// glossary term ("glossary#Custody log"), plus a short verbatim quote from it.
export const Citation = z.object({
  ref: z.string().describe('Section ref like "doc-id#2.2", or "glossary#Term" for glossary terms'),
  quote: z.string().describe("A short verbatim quote (under 25 words) copied exactly from that section"),
});
export type Citation = z.infer<typeof Citation>;

// ---------- Coverage ----------
export const Coverage = z.object({
  summary: z.string().describe("One or two plain sentences on what the knowledge base can and cannot support"),
  verdict: z.enum(["covered", "partly", "not_covered"]),
  canBuild: z.boolean().describe("True for covered and partly; false for not_covered"),
  covered: z.array(
    z.object({
      topic: z.string(),
      refs: z.array(z.string()).describe("Section refs that cover this topic"),
    }),
  ),
  notCovered: z.array(
    z.object({
      topic: z.string(),
      reason: z.string().describe("Why it is not covered, e.g. no section mentions it"),
    }),
  ),
});
export type Coverage = z.infer<typeof Coverage>;

// ---------- Outline ----------
export const ActivityType = z.enum(["process_flow", "timeline", "scenario_chat", "sort", "flip_cards"]);
export type ActivityType = z.infer<typeof ActivityType>;

export const Outline = z.object({
  title: z.string(),
  audienceRole: z.string(),
  contentType: z.enum(["procedural", "judgment", "terminology"]),
  formatReason: z.string().describe("One sentence on why this format fits the content"),
  chapters: z.array(
    z.object({
      title: z.string(),
      goal: z.string(),
      refs: z.array(z.string()),
    }),
  ),
  activity: ActivityType,
  quizPlan: z.array(
    z.object({
      focus: z.string(),
      ref: z.string(),
    }),
  ),
});
export type Outline = z.infer<typeof Outline>;

// ---------- Training ----------
export const Slide = z.object({
  id: z.string().describe('Stable id like "s1"'),
  title: z.string(),
  bullets: z.array(z.string()),
  narration: z.string().describe("Two to four sentences a narrator would read for this slide"),
  citations: z.array(Citation),
});
export type Slide = z.infer<typeof Slide>;

const ProcessFlow = z.object({
  type: z.literal("process_flow"),
  title: z.string(),
  intro: z.string(),
  steps: z.array(z.object({ label: z.string(), detail: z.string(), citations: z.array(Citation) })),
});

const Timeline = z.object({
  type: z.literal("timeline"),
  title: z.string(),
  intro: z.string(),
  events: z.array(
    z.object({ when: z.string(), label: z.string(), detail: z.string(), citations: z.array(Citation) }),
  ),
});

const ScenarioChat = z.object({
  type: z.literal("scenario_chat"),
  title: z.string(),
  intro: z.string(),
  otherPerson: z.string().describe("Fictional first name and role of the person in the chat"),
  steps: z.array(
    z.object({
      message: z.string().describe("What the other person says"),
      choices: z.array(
        z.object({
          text: z.string().describe("A reply the learner could send"),
          best: z.boolean(),
          feedback: z.string(),
        }),
      ),
      citations: z.array(Citation),
    }),
  ),
});

const Sort = z.object({
  type: z.literal("sort"),
  title: z.string(),
  instruction: z.string(),
  items: z.array(z.object({ text: z.string(), citations: z.array(Citation) })).describe("Items in the CORRECT order"),
});

const FlipCards = z.object({
  type: z.literal("flip_cards"),
  title: z.string(),
  cards: z.array(z.object({ term: z.string(), definition: z.string(), citations: z.array(Citation) })),
});

export const Activity = z.discriminatedUnion("type", [ProcessFlow, Timeline, ScenarioChat, Sort, FlipCards]);
export type Activity = z.infer<typeof Activity>;

const ACTIVITY_SCHEMAS = {
  process_flow: ProcessFlow,
  timeline: Timeline,
  scenario_chat: ScenarioChat,
  sort: Sort,
  flip_cards: FlipCards,
} as const;

export const Question = z.object({
  id: z.string().describe('Stable id like "q1"'),
  question: z.string(),
  choices: z.array(z.string()),
  correctIndex: z.number().int(),
  explanation: z.string().describe("Why the correct answer is right, in the pack's tone"),
  sourceSlideId: z.string().describe("Id of the slide that teaches this"),
  citations: z.array(Citation),
});
export type Question = z.infer<typeof Question>;

const trainingShape = { title: z.string(), summary: z.string(), slides: z.array(Slide), quiz: z.array(Question) };

export const Training = z.object({ ...trainingShape, activity: Activity });
export type Training = z.infer<typeof Training>;

// The full five-way union is too large a grammar for structured outputs, and the
// outline already picked the activity, so generation uses a schema with just that one.
export function trainingSchemaFor(type: ActivityType) {
  return z.object({ ...trainingShape, activity: ACTIVITY_SCHEMAS[type] });
}

// ---------- Verification ----------
export const Verification = z.object({
  results: z.array(
    z.object({
      claimId: z.string(),
      supported: z.boolean(),
      issue: z.string().describe("Empty if supported; otherwise what the source does not support"),
    }),
  ),
});
export type Verification = z.infer<typeof Verification>;

// Flags attached to a generated training, from code checks and the verify pass.
export type Flag = {
  itemId: string; // "s2", "q3", "activity.2"
  source: "citation-check" | "never-say" | "verify";
  message: string;
};

export type GeneratedTraining = {
  training: Training;
  flags: Flag[];
  packName: string;
  request: string;
  createdAt: string;
  verifiedBy: string;
};

// ---------- Pack builder ----------
export const SectionBreaks = z.object({
  sections: z.array(
    z.object({
      number: z.string().describe('Section number like "1", "2", "2.1"'),
      title: z.string().describe("Short section title; reuse the document's own heading text when there is one"),
      anchor: z.string().describe("The first 6-12 words of the section, copied EXACTLY from the document"),
    }),
  ),
});
export type SectionBreaks = z.infer<typeof SectionBreaks>;

export const RuleSuggestions = z.object({
  displayName: z.string().describe("Short pack name, 2-4 words"),
  organization: z.string().describe("Organization name as written in the documents, or empty if none"),
  description: z.string().describe("One sentence on what these documents cover"),
  tone: z.string(),
  readingLevel: z.string(),
  audience: z.array(z.object({ role: z.string().describe("lowercase-hyphenated role name"), notes: z.string() })),
  glossary: z.array(
    z.object({ term: z.string(), definition: z.string().describe("Definition using the documents' own wording") }),
  ),
  guardrails: z.array(z.string()).describe("Extra rules the documents imply, e.g. required disclaimers or escalation language"),
  neverSay: z.array(z.string()).describe("Words or claims that would contradict or overstate the documents"),
  starterPrompts: z.array(z.string()).describe('Three requests like "Build a short training on ..." that the documents can support'),
});
export type RuleSuggestions = z.infer<typeof RuleSuggestions>;
