// Clicks through the learner flow on a pack's example training (no API calls):
// slides -> activity -> quiz with a deliberate miss -> remediation -> certificate.
// Usage: node scripts/e2e.mjs <pack> <sample.json> <outDir>
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "fs";
import path from "path";

const [packName, samplePath, outDir] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3210";
const sample = JSON.parse(readFileSync(samplePath, "utf8"));
const t = sample.training;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
// Let entrance animations finish before capturing.
const shot = async (name) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
};

await page.goto(base);
await page.getByRole("heading", { name: "What training do you need?" }).waitFor();
const packTab = page.getByRole("navigation", { name: "Content pack" }).getByRole("button");
const tabs = await packTab.allTextContents();
const display = JSON.parse(readFileSync(`packs/${packName}/pack.json`, "utf8")).displayName;
await page.getByRole("button", { name: display, exact: true }).click();
await shot("01-home");
console.log("pack tabs:", tabs.join(" | "));

await page.getByRole("button", { name: new RegExp(t.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
await shot("02-ready");
await page.getByLabel("Your name (for the certificate)").fill("Jordan Rivera");
await page.getByRole("button", { name: "Start training →" }).click();

for (let i = 0; i < t.slides.length; i++) {
  await page.getByRole("heading", { name: t.slides[i].title }).waitFor();
  if (i === 0) {
    await shot("03-slide1");
    // Open a citation to check the source drawer.
    await page.locator("button.pk-chip").first().click();
    await page.getByRole("dialog", { name: "Source" }).waitFor();
    await shot("04-source-drawer");
    await page.getByRole("button", { name: "Close source" }).click();
  }
  await page.getByRole("button", { name: /^Next/ }).click();
}

// Activity
await page.getByRole("heading", { name: t.activity.title }).waitFor();
const a = t.activity;
if (a.type === "scenario_chat") {
  for (const [si, step] of a.steps.entries()) {
    await page.getByText("How do you reply?").waitFor();
    if (si === 0) {
      const wrong = step.choices.find((c) => !c.best);
      await page.getByRole("button", { name: wrong.text, exact: true }).click();
      await page.waitForTimeout(400);
      await shot("05-activity-coaching");
    }
    await page.getByRole("button", { name: step.choices.find((c) => c.best).text, exact: true }).click();
    await page.waitForTimeout(1200);
  }
} else if (a.type === "process_flow" || a.type === "timeline") {
  await page.waitForTimeout(1200 * (a.steps ?? a.events).length + 800);
} else if (a.type === "flip_cards") {
  for (const c of a.cards) await page.getByRole("button", { name: c.term }).click();
} else if (a.type === "sort") {
  // Keyboard drag (Space to lift, arrows to move, Space to drop): fill positions top to bottom.
  await page.getByRole("button", { name: "Check order" }).click();
  await shot("05-activity-sort-wrong");
  for (let target = 0; target < a.items.length; target++) {
    const rows = page.locator("ol li");
    const texts = await rows.allTextContents();
    const from = texts.findIndex((x) => x.includes(a.items[target].text));
    if (from === target) continue;
    await rows.nth(from).focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
    for (let k = 0; k < from - target; k++) {
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(200);
    }
    await page.keyboard.press("Space");
    await page.waitForTimeout(400);
  }
  console.log("order after keyboard moves:", (await page.locator("ol li").allTextContents()).map((x) => x.slice(4, 40)));
  await page.getByRole("button", { name: "Check order" }).click();
  await page.getByText("That's the right order.").waitFor({ timeout: 5000 });
}
await shot("05-activity");
await page.getByRole("button", { name: "Start the quiz →" }).click();

// Quiz: miss the first question on purpose, review the slide, then answer everything correctly.
let missedOnce = false;
for (let guard = 0; guard < 20; guard++) {
  if (await page.getByRole("heading", { name: "Training complete" }).isVisible()) break;
  const heading = await page.locator("article h2").first().textContent();
  const q = t.quiz.find((x) => x.question === heading);
  if (!q) throw new Error(`Unknown question on screen: ${heading}`);
  const pick = !missedOnce ? (q.correctIndex + 1) % q.choices.length : q.correctIndex;
  await page.getByRole("radio", { name: q.choices[pick], exact: true }).check();
  await page.getByRole("button", { name: "Check answer" }).click();
  if (!missedOnce) {
    missedOnce = true;
    await shot("06-quiz-miss");
    await page.getByRole("button", { name: /^Review slide/ }).click();
    await page.getByText("Reviewing the source").waitFor();
    await shot("07-remediation-slide");
    await page.getByRole("button", { name: "Back to the quiz →" }).click();
    continue;
  }
  await page.getByRole("button", { name: "Next →" }).click();
}

await page.getByRole("heading", { name: "Training complete" }).waitFor();
await shot("08-complete");
const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download certificate (PDF)" }).click()]);
const pdfPath = path.join(outDir, "certificate.pdf");
await download.saveAs(pdfPath);
console.log("certificate saved:", pdfPath);

await page.getByRole("button", { name: "Back to start" }).click();
await page.getByText("Saved certificates").waitFor();
await shot("09-home-saved-cert");

// Phone width check on the home screen.
await page.setViewportSize({ width: 390, height: 844 });
await shot("10-phone-home");

console.log(errors.length ? `BROWSER ERRORS:\n${errors.join("\n")}` : "no browser errors");
await browser.close();
