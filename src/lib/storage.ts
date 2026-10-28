// Browser-only persistence. No accounts: everything lives in localStorage.
import type { GeneratedTraining } from "./schemas";
import type { CustomPackData } from "./custom-pack";

export type SavedCertificate = {
  id: string;
  learner: string;
  course: string;
  packName: string;
  packDisplayName: string;
  organization: string;
  score: number;
  date: string; // ISO
  colors: { primary: string; accent: string };
};

const CERTS = "pivot-trainer:certificates";
const CUSTOM_PACKS = "pivot-trainer:custom-packs";
const DRAFT = "pivot-trainer:builder-draft";
const LAST = "pivot-trainer:last-training:";
const MISSED = "pivot-trainer:missed:";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or disabled: the demo still works, it just won't remember.
  }
}

export const storage = {
  certificates: () => read<SavedCertificate[]>(CERTS, []),
  saveCertificate: (c: SavedCertificate) => write(CERTS, [c, ...storage.certificates().filter((x) => x.id !== c.id)]),
  removeCertificate: (id: string) => write(CERTS, storage.certificates().filter((x) => x.id !== id)),

  lastTraining: (pack: string) => read<GeneratedTraining | null>(LAST + pack, null),
  saveLastTraining: (g: GeneratedTraining) => write(LAST + g.packName, g),

  // Packs made in the pack builder, and the builder's unsaved draft.
  customPacks: () => read<CustomPackData[]>(CUSTOM_PACKS, []),
  saveCustomPack: (p: CustomPackData) => write(CUSTOM_PACKS, [...storage.customPacks().filter((x) => x.name !== p.name), p]),
  removeCustomPack: (name: string) => write(CUSTOM_PACKS, storage.customPacks().filter((x) => x.name !== name)),
  draft: <T>() => read<T | null>(DRAFT, null),
  saveDraft: (d: unknown) => write(DRAFT, d),
  clearDraft: () => {
    try {
      localStorage.removeItem(DRAFT);
    } catch {}
  },

  // Missed questions per course, kept so they can be retested later.
  missed: (courseKey: string) => read<string[]>(MISSED + courseKey, []),
  saveMissed: (courseKey: string, ids: string[]) => write(MISSED + courseKey, ids),
};

export function courseKey(g: GeneratedTraining) {
  return `${g.packName}:${g.createdAt}`;
}
