// "Save my demo" files: the user's documents, style and rules, and the generated
// training. Never the learner's name, answers, or progress. Opening one treats
// every field as untrusted: it is schema-checked and only ever rendered as text.
import { z } from "zod";
import { CustomPackData } from "./custom-pack";
import { Training, type GeneratedTraining } from "./schemas";

export const DEMO_APP = "pivot-trainer";
export const DEMO_VERSION = 1;
export const MAX_DEMO_FILE_BYTES = 2 * 1024 * 1024;

const Flag = z.object({
  itemId: z.string().max(40),
  source: z.enum(["citation-check", "never-say", "verify"]),
  message: z.string().max(600),
});

const SavedTraining = z.object({
  training: Training,
  flags: z.array(Flag).max(100),
  packName: z.string().max(100),
  request: z.string().max(500),
  createdAt: z.string().max(40),
  verifiedBy: z.string().max(60),
});

export const DemoFile = z.object({
  app: z.literal(DEMO_APP),
  version: z.literal(DEMO_VERSION),
  savedAt: z.string().max(40),
  isSample: z.boolean().optional(),
  pack: CustomPackData,
  training: SavedTraining.nullable(),
});
export type DemoFile = z.infer<typeof DemoFile>;

export function buildDemoFile(pack: CustomPackData, training: GeneratedTraining | null, isSample = false): DemoFile {
  return { app: DEMO_APP, version: DEMO_VERSION, savedAt: new Date().toISOString(), isSample, pack, training };
}

export const BAD_FILE_MESSAGE = "That does not look like a Pivot Trainer demo file.";

export function parseDemoFile(raw: string): { ok: true; demo: DemoFile } | { ok: false; message: string } {
  if (raw.length > MAX_DEMO_FILE_BYTES) return { ok: false, message: "That file is too large to be a Pivot Trainer demo file." };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, message: BAD_FILE_MESSAGE };
  }
  const head = z.object({ app: z.string(), version: z.number() }).safeParse(json);
  if (!head.success || head.data.app !== DEMO_APP) return { ok: false, message: BAD_FILE_MESSAGE };
  if (head.data.version !== DEMO_VERSION) return { ok: false, message: "This demo file was made by a different version of Pivot Trainer." };
  const parsed = DemoFile.safeParse(json);
  return parsed.success ? { ok: true, demo: parsed.data } : { ok: false, message: BAD_FILE_MESSAGE };
}

export function demoFileName() {
  const d = new Date();
  return `pivot-trainer-demo-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.json`;
}
