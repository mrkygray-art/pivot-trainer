// Walks the ux-redesign.md acceptance checklist in a real browser (Edge):
//   A. finished example -> lesson -> pass rule + shuffle -> results -> certificate + saved demo
//   B. reload: nothing kept (localStorage, sessionStorage, IndexedDB, cookies)
//   C. open the saved demo file again
//   D. my own document -> not-covered path -> idea -> real build (Claude)
//   E. sample + one added document -> real build
//   F. phone width; banned words checked on every screen
// Usage: node scripts/e2e-flow.mjs <outDir> <my-doc.docx> <extra-doc.txt> [--skip-builds]
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync } from "fs";
import path from "path";

const args = process.argv.slice(2);
const skipBuilds = args.includes("--skip-builds");
const [outDir, myDoc, extraDoc] = args.filter((a) => !a.startsWith("--"));
const base = process.env.BASE_URL ?? "http://localhost:3210";
mkdirSync(outDir, { recursive: true });

const BANNED = ["pack", "knowledge base", "guardrail", "guardrails", "glossary", "citation", "citations", "coverage", "remediation", "json", "prompt"];
const problems = [];
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
page.on("console", (m) => m.type() === "error" && problems.push(`console error: ${m.text().slice(0, 200)}`));
page.on("dialog", (d) => d.accept()); // confirm() prompts: save warning, beforeunload

async function check(name) {
  await page.waitForTimeout(700);
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const w of BANNED) {
    if (new RegExp(`\\b${w}\\b`).test(text)) problems.push(`"${w}" shown on screen: ${name}`);
  }
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

// The answer currently marked correct in the training data, as shown on screen.
async function answerQuiz(training, { missFirst }) {
  const orders = {};
  let missed = false;
  for (let guard = 0; guard < 30; guard++) {
    if (await page.getByRole("heading", { name: "You finished the training." }).isVisible()) return orders;
    const heading = (await page.locator("article h2").first().textContent())?.trim();
    const q = training.quiz.find((x) => x.question === heading);
    if (!q) throw new Error(`Unknown question: ${heading}`);
    const shown = await page.locator("fieldset label").allTextContents();
    (orders[q.id] ??= []).push(shown.map((s) => s.replace(/\s*\((correct|not this one)\)$/, "").trim()));
    const wrong = missFirst && !missed;
    const choice = wrong ? q.choices[(q.correctIndex + 1) % q.choices.length] : q.choices[q.correctIndex];
    await page.getByRole("radio", { name: choice, exact: true }).check();
    await page.getByRole("button", { name: "Check my answer" }).click();
    if (wrong) {
      missed = true;
      await check("A06-quiz-miss");
      await page.getByRole("button", { name: /^Take a second look at slide/ }).click();
      await page.getByText("at the slide behind the question you missed").waitFor();
      await check("A07-second-look");
      await page.getByRole("button", { name: "Back to the quiz →" }).click();
      continue;
    }
    await page.getByRole("button", { name: "Next →" }).click();
  }
  throw new Error("Quiz did not finish");
}

async function playLesson(training, missFirst) {
  for (let i = 0; i < training.slides.length; i++) {
    await page.getByRole("heading", { name: training.slides[i].title }).waitFor();
    if (i === 0) {
      await check("A03-slide1");
      await page.locator("button.pk-chip").first().click();
      await page.getByRole("dialog", { name: "Where this came from" }).waitFor();
      await check("A04-where-it-came-from");
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  const a = training.activity;
  await page.getByRole("heading", { name: a.title }).waitFor();
  if (a.type === "scenario_chat") {
    for (const step of a.steps) {
      await page.getByText("How do you reply?").waitFor();
      await page.getByRole("button", { name: step.choices.find((c) => c.best).text, exact: true }).click();
      await page.waitForTimeout(1300);
    }
  } else if (a.type === "flip_cards") {
    for (const c of a.cards) await page.getByRole("button", { name: c.term }).click();
  } else if (a.type === "sort") {
    for (let target = 0; target < a.items.length; target++) {
      const rows = page.locator("ol li");
      const from = (await rows.allTextContents()).findIndex((x) => x.includes(a.items[target].text));
      if (from === target) continue;
      await rows.nth(from).focus();
      await page.keyboard.press("Space");
      for (let k = 0; k < from - target; k++) {
        await page.waitForTimeout(150);
        await page.keyboard.press("ArrowUp");
      }
      await page.waitForTimeout(150);
      await page.keyboard.press("Space");
      await page.waitForTimeout(300);
    }
    await page.getByRole("button", { name: "Check order" }).click();
  } else {
    await page.waitForTimeout(1200 * (a.steps ?? a.events).length + 800);
  }
  await check("A05-activity");
  await page.getByRole("button", { name: "Start the quiz →" }).click();
  return answerQuiz(training, { missFirst });
}

// ---------- A. Finished example through to results ----------
await page.goto(base);
await page.getByRole("heading", { name: "Turn your policies into a short, interactive training." }).waitFor();
await page.getByRole("button", { name: "Open sample" }).waitFor();
await check("A01-start");
const samples = await (await fetch(`${base}/api/samples`)).json();
const example = samples.sample.training.training;

await page.getByRole("button", { name: "See a finished example" }).click();
await page.getByLabel("What name should appear on your certificate?").fill("Jordan Rivera");
await check("A02-ready");
await page.getByRole("button", { name: "Start the lesson →" }).click();
const orders = await playLesson(example, true);
const reasked = Object.values(orders).find((o) => o.length > 1);
const original = reasked && example.quiz.find((q) => orders[q.id] === reasked).choices;
log(`re-asked question shown in order: ${reasked ? (JSON.stringify(reasked[1]) === JSON.stringify(original) ? "SAME as original (shuffle can match by chance)" : "shuffled") : "none"}`);

await page.getByRole("heading", { name: "You finished the training." }).waitFor();
const total = example.quiz.length;
await page.getByText(`${total} of ${total} mastered`).first().waitFor();
await page.getByText(`${total - 1} on the first try, 1 after a second look`).waitFor();
await check("A08-results");
log("results show mastery");

const [certDl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download certificate (PDF)" }).click()]);
await certDl.saveAs(path.join(outDir, "certificate.pdf"));
const [demoDl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Save my demo" }).click()]);
const demoPath = path.join(outDir, await demoDl.suggestedFilename());
await demoDl.saveAs(demoPath);
const demoText = readFileSync(demoPath, "utf8");
if (demoText.includes("Jordan Rivera")) problems.push("saved demo contains the learner's name");
log(`saved ${path.basename(demoPath)} (${demoText.length} bytes); learner name excluded: ${!demoText.includes("Jordan Rivera")}`);

await page.getByRole("button", { name: "Practice the ones I needed review on" }).click();
await answerQuiz(example, { missFirst: false });
await page.getByText("Practice done.").waitFor();
log("practice works");

// ---------- B. Reload: nothing kept ----------
await page.reload();
await page.getByRole("heading", { name: "Turn your policies into a short, interactive training." }).waitFor();
const stored = await page.evaluate(async () => ({
  local: localStorage.length,
  session: sessionStorage.length,
  cookies: document.cookie,
  idb: indexedDB.databases ? (await indexedDB.databases()).length : 0,
}));
if (stored.local || stored.session || stored.cookies || stored.idb) problems.push(`something persisted: ${JSON.stringify(stored)}`);
log(`after reload: ${JSON.stringify(stored)}`);

// ---------- C. Open the saved demo again ----------
await page.getByLabel("Open a saved demo file").setInputFiles(demoPath);
await page.getByText("Your saved training is ready").waitFor();
await check("C01-saved-demo-opened");
log("saved demo reopened with its training");
await page.getByLabel("Open a saved demo file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"hello":1}') });
await page.getByText("That does not look like a Pivot Trainer demo file.").waitFor();
log("bad file rejected with a plain message");

// ---------- D. My own document ----------
await page.getByRole("button", { name: "Menu" }).click();
await page.getByRole("button", { name: "Start over" }).click();
await page.getByRole("button", { name: "Start with my documents" }).click();
await page.getByLabel("Choose document files").setInputFiles(myDoc);
await page.getByText("Read successfully").waitFor({ timeout: 90000 });
await check("D01-step1");
await page.getByRole("button", { name: "Next: Style and rules →" }).click();
await page.getByRole("heading", { name: "Set your style and rules" }).waitFor();
if (await page.getByRole("button", { name: "Next: Describe the training →" }).isDisabled()) problems.push("Step 2 Next is disabled");
await page.getByLabel("Word or phrase to avoid").fill("100% safe");
await page.getByRole("button", { name: "Add to the list" }).click();
await check("D02-step2");
await page.getByRole("button", { name: "Next: Describe the training →" }).click();
await page.getByRole("heading", { name: "Describe the training you need" }).waitFor();
await page.waitForTimeout(6000); // ideas and roles from the documents arrive in the background
await check("D03-step3");
await page.getByLabel("What should the training cover?").fill("A short training on drone patrol procedures");
await page.getByRole("button", { name: "Build my training →" }).click();
await page.getByRole("heading", { name: /don't cover this yet|cover part of this/ }).waitFor({ timeout: 90000 });
await check("D04-not-covered");
log("not-covered path shown");

if (!skipBuilds) {
  await page.locator("button.pk-chip").first().click();
  await page.getByRole("heading", { name: "Describe the training you need" }).waitFor();
  await page.getByRole("button", { name: "Build my training →" }).click();
  await page.getByRole("heading", { name: /Building your training|Your documents cover part of this/ }).waitFor();
  await check("D05-building");
  if (await page.getByRole("button", { name: "Build the part we can" }).isVisible()) await page.getByRole("button", { name: "Build the part we can" }).click();
  await page.getByLabel("What name should appear on your certificate?").waitFor({ timeout: 300000 });
  await check("D06-ready-own-docs");
  log("built a training from my own document");
}

// ---------- E. Sample + one added document ----------
await page.getByRole("button", { name: "Menu" }).click();
await page.getByRole("button", { name: "Start over" }).click();
await page.getByRole("button", { name: "Open sample" }).click();
await page.getByText("You are using a sample.").waitFor();
await page.getByRole("navigation", { name: "Your progress" }).getByRole("button", { name: /Add documents/ }).click();
await page.getByLabel("Choose document files").setInputFiles(extraDoc);
await page.getByText("Read successfully").first().waitFor({ timeout: 90000 });
await page.waitForFunction(() => !document.body.innerText.includes("Finding the topics"), null, { timeout: 90000 });
await check("E01-sample-plus-doc");
await page.getByRole("button", { name: "Next: Style and rules →" }).click();
await page.getByRole("button", { name: "Next: Describe the training →" }).click();
if (!skipBuilds) {
  await page.getByLabel("What should the training cover?").fill("Responding when an employee raises a concern");
  await page.getByRole("button", { name: "Build my training →" }).click();
  await page.waitForFunction(() => /What name should appear|cover part of this|don't cover this yet/.test(document.body.innerText), null, { timeout: 300000 });
  if (await page.getByRole("button", { name: "Build the part we can" }).isVisible()) {
    await page.getByRole("button", { name: "Build the part we can" }).click();
    await page.getByLabel("What name should appear on your certificate?").waitFor({ timeout: 300000 });
  }
  await check("E02-ready-sample-plus-doc");
  log("built a training from the sample plus an added document");
}

// ---------- F. Phone width ----------
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Menu" }).click();
await page.getByRole("button", { name: "Start over" }).click();
await check("F01-phone-start");
const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (sideways) problems.push("page scrolls sideways at phone width");
await page.getByRole("button", { name: "Open sample" }).click();
await check("F02-phone-step3");
if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) problems.push("Step 3 scrolls sideways at phone width");

console.log(problems.length ? `PROBLEMS:\n- ${problems.join("\n- ")}` : "no problems found");
await browser.close();
