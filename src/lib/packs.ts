import { promises as fs } from "fs";
import path from "path";
import type { Pack, PackConfig, Section } from "./pack-types";
import type { GeneratedTraining } from "./schemas";

const PACKS_DIR = path.join(process.cwd(), "packs");

// Splits a markdown doc into numbered sections. A heading like "## 2 Receiving"
// or "### 2.2 Log the request first" starts a section; text runs to the next heading.
export function parseSections(docId: string, markdown: string): { title: string; sections: Section[] } {
  const lines = markdown.split(/\r?\n/);
  const docTitle = (lines.find((l) => l.startsWith("# ")) ?? `# ${docId}`).slice(2).trim();
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const m = line.match(/^#{2,4}\s+(\d+(?:\.\d+)*)\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      current = { ref: `${docId}#${m[1]}`, docId, docTitle, number: m[1], title: m[2].trim(), text: "" };
    } else if (current && !line.startsWith("# ")) {
      current.text += line + "\n";
    }
  }
  if (current) sections.push(current);
  for (const s of sections) s.text = s.text.trim();
  return { title: docTitle, sections };
}

export async function listPackNames(): Promise<string[]> {
  const entries = await fs.readdir(PACKS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

export async function loadPack(name: string): Promise<Pack> {
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Invalid pack name: ${name}`);
  const dir = path.join(PACKS_DIR, name);
  const config = JSON.parse(await fs.readFile(path.join(dir, "pack.json"), "utf8")) as PackConfig;

  const docFiles = (await fs.readdir(path.join(dir, "docs"))).filter((f) => f.endsWith(".md")).sort();
  const docs: Pack["docs"] = [];
  const sections: Section[] = [];
  for (const file of docFiles) {
    const id = file.replace(/\.md$/, "");
    const parsed = parseSections(id, await fs.readFile(path.join(dir, "docs", file), "utf8"));
    docs.push({ id, title: parsed.title });
    sections.push(...parsed.sections);
  }
  for (const g of config.glossary) {
    sections.push({
      ref: `glossary#${g.term}`,
      docId: "glossary",
      docTitle: "Glossary",
      number: "",
      title: g.term,
      text: g.definition,
    });
  }
  return { ...config, docs, sections, samples: await loadSamples(dir) };
}

export async function loadAllPacks(): Promise<Pack[]> {
  return Promise.all((await listPackNames()).map(loadPack));
}

async function loadSamples(dir: string): Promise<GeneratedTraining[]> {
  const samplesDir = path.join(dir, "samples");
  let files: string[];
  try {
    files = (await fs.readdir(samplesDir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(path.join(samplesDir, f), "utf8"))));
}
