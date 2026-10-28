import type { ActivityType } from "@/lib/schemas";

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  process_flow: "Animated step-by-step flow",
  timeline: "Animated timeline",
  scenario_chat: "Practice conversation",
  sort: "Put the steps in order",
  flip_cards: "Flip cards",
};
