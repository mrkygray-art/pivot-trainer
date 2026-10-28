# Pivot Trainer

Short, interactive trainings generated from an organization's own SOPs and policies, with a citation on every slide and question.

One engine, swappable **content packs**. The same app builds a field-procedure training for a security company, then pivots to an anti-retaliation training for people managers, with a different tone, look, and activity format, without changing any code.

> **Independent prototype.** Not affiliated with any training vendor. Every organization, document, and person in the sample packs is fictional.

## What it does

1. **Pick a pack** and describe the training you want (type it or say it).
2. **Coverage check.** Before generating anything, it tells you what the documents cover and what they don't. Ask about something that isn't in the documents and it says so instead of making it up.
3. **Approve the outline.** Chapters, the activity format, and the quiz plan, each tied to document sections.
4. **Generate.** Slides, one interactive activity, and a quiz, all as structured JSON rendered by fixed components.
5. **Learn.** A wrong answer explains why, links back to the source slide, and the question comes back until it's answered correctly.
6. **Certificate.** A PDF with name, course, date, score, and ID, generated in the browser and saved for later.

## How grounding works

- Pack documents are split into **numbered sections** (`footage-request-sop#3.2`). Every slide, activity item, and quiz question must cite sections and include a short **verbatim quote**.
- **Code checks** (no AI) confirm each cited section exists, each quote appears word-for-word, quiz answers are valid, and nothing on the pack's never-say list appears.
- A **second model verifies** each claim against the full text of what it cites, and flags anything the source doesn't support.
- Flagged items are listed in a verification report and stay marked in the training.

`scripts/tamper-test.mts` plants a paraphrased quote, a never-say phrase, and a changed time limit in a real training, and confirms all three are caught.

## Adaptive format

The outline step picks a format from what the learner needs to do:

| Content | Activity |
|---|---|
| Procedural (steps, approvals, records) | Animated process flow, or put-in-order |
| Judgment (how to respond to people) | Scenario chat, or animated timeline |
| Terminology | Flip cards from the pack glossary |

## Content packs

```
packs/<name>/
  pack.json   style (tone, reading level, colors, font, corners), guardrails,
              audience roles, glossary, never-say list, starter prompts
  docs/*.md   the knowledge base; "## 2" / "### 2.1" headings become citable sections
  samples/    example trainings for illustration and a reliable live demo
```

Nothing about security or HR is hardcoded in the engine. To add a pack, add a folder.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Claude API, server-side only, using structured outputs with Zod schemas
  - Generation: Claude Opus 5.5 · Verification: Claude Sonnet 5.5 (set in `src/lib/config.ts`)
- Motion (animation), dnd-kit (drag and drop), pdf-lib (certificate)
- Web Speech API for voice input (Chrome and Edge; the text box is always available)
- No accounts or database: certificates and recent trainings live in the browser

## Run it

```bash
npm install
export ANTHROPIC_API_KEY=...   # server-side only
npm run dev
```

Other commands: `npm run build`, `npm run lint`.

Test scripts (run against a dev server on port 3210, or set `BASE_URL`):

```bash
node scripts/smoke.mjs security-sop "Build a short training on handling a customer footage request" out.json
npx tsx scripts/tamper-test.mts out.json
node scripts/e2e.mjs security-sop packs/security-sop/samples/footage-request.json shots/
```

## Roadmap

Full multi-chapter courses, a written Training Guide export, and a Video Package export (per-scene script and narration; every slide already carries a `narration` field). Optional narration and cross-browser voice input.
