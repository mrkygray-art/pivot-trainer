import { collectCitations } from "@/lib/checks";
import type { Flag, Training } from "@/lib/schemas";

export function collectCitationCount(t: Training) {
  return collectCitations(t).length;
}

// Flags for one item. Activity flags ("activity", "activity.3") all surface on the activity.
export function flagsFor(flags: Flag[], itemId: string) {
  if (itemId === "activity") return flags.filter((f) => f.itemId === "activity" || f.itemId.startsWith("activity."));
  return flags.filter((f) => f.itemId === itemId);
}
