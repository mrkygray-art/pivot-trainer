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
} as const;

export const DEMO_LIMITS = {
  minSlides: 3,
  maxSlides: 5,
  minQuestions: 3,
  maxQuestions: 5,
};
