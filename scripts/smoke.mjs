// End-to-end smoke test against a running dev server.
// Usage: node scripts/smoke.mjs <pack> "<request>" [out.json]
const [pack, request, out] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3210";

async function post(path, body) {
  const t = Date.now();
  const res = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  console.log(`${path} -> ${res.status} in ${((Date.now() - t) / 1000).toFixed(1)}s`);
  if (!res.ok) throw new Error(json.error);
  return json;
}

const { coverage } = await post("/api/coverage", { pack, request });
console.log(JSON.stringify(coverage, null, 2));
if (!coverage.canBuild) process.exit(0);

const { outline } = await post("/api/outline", { pack, request, coverage });
console.log(JSON.stringify(outline, null, 2));

const result = await post("/api/generate", { pack, request, outline });
console.log(`slides=${result.training.slides.length} activity=${result.training.activity.type} quiz=${result.training.quiz.length}`);
console.log("flags:", JSON.stringify(result.flags, null, 2));
if (out) {
  const fs = await import("fs");
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log("saved", out);
}
