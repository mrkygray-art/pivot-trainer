// Drives the AI steps in the browser: a not-covered request, then coverage and
// outline for a covered one (stops before generation to keep it quick and cheap).
// Usage: node scripts/e2e-ask.mjs <outDir>
import { chromium } from "playwright-core";
import { mkdirSync } from "fs";
import path from "path";

const [outDir] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3210";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = async (name) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
};

await page.goto(base);
await page.getByRole("button", { name: "Security SOP", exact: true }).click();

// Not covered
await page.getByLabel("Describe it, or press the mic and say it").fill("Build a short training on drone patrol procedures");
await page.getByRole("button", { name: "Check coverage →" }).click();
await page.getByText("Not covered", { exact: false }).first().waitFor({ timeout: 60000 });
await shot("01-not-covered");
console.log("draft outline button visible on not-covered:", await page.getByRole("button", { name: "Draft the outline →" }).isVisible());
await page.getByRole("button", { name: "← Try another request" }).click();

// Covered -> outline
await page.getByRole("button", { name: "Build a short training on handling site credentials" }).click();
await page.getByRole("button", { name: "Check coverage →" }).click();
await page.getByRole("button", { name: "Draft the outline →" }).waitFor({ timeout: 60000 });
await shot("02-coverage");
await page.getByRole("button", { name: "Draft the outline →" }).click();
await page.getByRole("button", { name: "Approve and generate →" }).waitFor({ timeout: 60000 });
await shot("03-outline");

console.log(errors.length ? `BROWSER ERRORS:\n${errors.join("\n")}` : "no browser errors");
await browser.close();
