// Proves the safety net works: plant errors in a real generated training and make
// sure the code checks and the verify pass both catch them.
// Usage: npx tsx scripts/tamper-test.mts <generated.json>
import { readFileSync } from "fs";
import { loadPack } from "../src/lib/packs";
import { runCodeChecks, buildClaims } from "../src/lib/checks";
import { callStructured } from "../src/lib/claude";
import { MODELS, EFFORT } from "../src/lib/config";
import { Verification, type GeneratedTraining } from "../src/lib/schemas";
import { VERIFY_SYSTEM, verifyPrompt } from "../src/lib/prompts";

const gen = JSON.parse(readFileSync(process.argv[2], "utf8")) as GeneratedTraining;
const t = structuredClone(gen.training);
const pack = await loadPack(gen.packName);

// 1. Paraphrased quote (code check should catch).
t.slides[0].citations[0].quote = "Videos may show people who never agreed to be shared.";
// 2. Never-say phrase (code check should catch).
t.slides[1].bullets.push("Following these steps means the release is always safe.");
// 3. Changed fact with a valid quote (only the verify pass can catch).
const q = t.quiz.find((x) => x.citations.some((c) => c.ref.endsWith("#3.3"))) ?? t.quiz[0];
q.explanation = q.explanation.replace(/1 business day/g, "5 business days");
q.choices[q.correctIndex] = q.choices[q.correctIndex].replace(/1 business day/g, "5 business days");

const codeFlags = runCodeChecks(t, pack);
console.log("CODE FLAGS:", codeFlags);

const { data } = await callStructured({
  model: MODELS.verify,
  effort: EFFORT.verify,
  system: [{ text: VERIFY_SYSTEM }],
  user: verifyPrompt(buildClaims(t, pack)),
  schema: Verification,
  maxTokens: 16000,
});
console.log("VERIFY FLAGS:", data.results.filter((r) => !r.supported));
console.log(`expected: slide s1 quote + ${t.slides[1].id} never-say (code), ${q.id} changed fact (verify)`);
