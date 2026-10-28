// One place to swap models and effort. Generation needs judgment (Opus);
// verification is a narrower check (Sonnet), and a different model gives some independence.
export const MODELS = {
  generate: "claude-opus-5-5",
  verify: "claude-sonnet-5-5",
} as const;

export const EFFORT = {
  coverage: "low",
  outline: "low",
  generate: "medium",
  verify: "low",
  sections: "low",
  suggest: "low",
} as const;

// What one demo training contains. Read everywhere: Start screen, Step 3, prompts, quiz.
export const DEMO_LIMITS = { slides: 5, activities: 1, questions: 5 } as const;
