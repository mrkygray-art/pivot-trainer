import { promises as fs } from "fs";
import path from "path";
import type { Pack, PackConfig, Section } from "./pack-types";
import type { GeneratedTraining } from "./schemas";
import { glossarySections, parseSections } from "./sections";

const PACKS_DIR = path.join(process.cwd(), "packs");

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
  sections.push(...glossarySections(config.glossary));
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
