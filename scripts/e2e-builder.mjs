// Drives Stage A in the browser: upload documents, review sections, suggest rules,
// save the pack, then build a real training from it (coverage -> outline -> generate).
// Usage: node scripts/e2e-builder.mjs <outDir> <file1> [file2 ...]
import { chromium } from "playwright-core";
import { mkdirSync } from "fs";
import path from "path";

const [outDir, ...files] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3210";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = async (name) => {
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
};
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);

await page.goto(base);
await page.getByRole("button", { name: "+ New pack" }).click();
await page.getByRole("heading", { name: "New content pack" }).waitFor();

// Step 1: documents
await page.getByLabel("Choose document files").setInputFiles(files);
await page.getByText(`Documents in this pack (${files.length})`).waitFor({ timeout: 60000 });
await shot("01-documents");
log("documents added");

// Step 2: sections (runs automatically)
await page.getByRole("button", { name: "Next: Sections →" }).click();
await page.getByRole("button", { name: "Next: Rules →" }).waitFor();
await page.waitForFunction(() => !document.body.innerText.includes("Creating sections…"), null, { timeout: 120000 });
await shot("02-sections");
log("sections done: " + (await page.locator("text=/^✓ /").allTextContents()).join(" | "));

// Rename the first section, then merge the last section into the one above.
const firstTitle = page.getByLabel(/^Title of section/).first();
await firstTitle.fill("Purpose of this guideline");
await firstTitle.blur();
await page.getByRole("button", { name: /^Merge into §/ }).last().click();
await shot("03-sections-edited");

// Step 3: rules
await page.getByRole("button", { name: "Next: Rules →" }).click();
await page.getByRole("button", { name: "✨ Suggest from my documents" }).click();
await page.getByText("Suggestions added below").waitFor({ timeout: 120000 });
log("rules suggested");
await page.getByRole("textbox", { name: /^Pack name/ }).fill("Kitchen Allergens");
await page.getByRole("textbox", { name: /^Organization/ }).fill("Brightfork Kitchens (fictional)");
await shot("04-rules");

// Step 4: review and save
await page.getByRole("button", { name: "Next: Review →" }).click();
await page.getByText("Ready to save").waitFor();
await shot("05-review");
await page.getByRole("button", { name: "Save pack" }).click();
await page.getByRole("button", { name: "Kitchen Allergens", exact: true }).waitFor();
await page.getByRole("heading", { name: "What training do you need?" }).waitFor();
await shot("06-saved-pack-home");
log("pack saved");

// Stage B: build a training from the new pack.
const starter = page.locator("button", { hasText: /^Build a short training on/ }).first();
await starter.click();
await page.getByRole("button", { name: "Check coverage →" }).click();
await page.getByRole("button", { name: "Draft the outline →" }).waitFor({ timeout: 90000 });
await shot("07-coverage");
log("coverage done");
await page.getByRole("button", { name: "Draft the outline →" }).click();
await page.getByRole("button", { name: "Approve and generate →" }).waitFor({ timeout: 90000 });
await shot("08-outline");
log("outline done");
await page.getByRole("button", { name: "Approve and generate →" }).click();
await page.getByRole("heading", { name: "Verification report" }).waitFor({ timeout: 240000 });
await shot("09-ready");
log("generated: " + (await page.locator("main p.font-semibold").allTextContents()).join(" | "));

// Reload: the pack should still be there (saved in the browser).
await page.reload();
await page.getByRole("button", { name: "Kitchen Allergens", exact: true }).waitFor();
log("pack persists after reload");

console.log(errors.length ? `BROWSER ERRORS:\n${errors.join("\n")}` : "no browser errors");
await browser.close();
