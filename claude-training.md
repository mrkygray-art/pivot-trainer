# Training Pivot Demo (claude-training.md)

A prototype that generates short, interactive, source-grounded trainings from a
company's own SOPs and policies. One engine, swappable **content packs**: the same
app can produce a security SOP training, then pivot to an HR retaliation training.

This is an independent prototype. It is not affiliated with any training vendor.

What the user sees and does is specified in `ux-redesign.md` (layout, wording,
flow, visual tokens). This file covers the engine, rules, and decisions.

---

## LIVING FILE RULE (read this first)

This file is the project's memory. **Whenever we make a decision that future
sessions should remember, update this file in the same turn.**

How to do it (keep it easy):

1. Add one dated line to the **Decision Log** at the bottom: `YYYY-MM-DD: decision (why, if not obvious)`.
2. If the decision changes a rule, a pack field, a component, or the build order, edit that section too so the file never contradicts itself.
3. Tell the user in one short line what you changed in this file.
4. If the user says "decision:", "remember this", "lock that in", or "add that to the file", always update.
5. Do not log guesses, brainstorms, or options we have not chosen. Only log chosen decisions.
6. If a new decision conflicts with an old one, replace the old text and log the change, noting what it replaced.

---

## Stack

- Next.js (App Router, TypeScript), Tailwind
- Repo: `pivot-trainer`, private to start. Flip public only after checking: no keys in git history, only fictional docs, "independent prototype" label in the README. No vendor names in the repo name or README.
- Claude API, called **server-side only**
  - Generate (coverage, outline, slides, scenarios, quiz): `claude-opus-5-5`
  - Verify pass: `claude-sonnet-5-5` (move to Opus if testing shows it misses unsupported claims)
  - Both model names live in one config file so they can be swapped
- Voice input: Web Speech API in v1 (Chrome/Edge); the text box always stays as the fallback. AssemblyAI later for cross-browser support.
- Narration: ElevenLabs is out of v1. Every slide's JSON carries a `narration` text field now (also feeds the Video Package export), so voice can be added later without a rewrite.
- Client-side PDF certificate
- No login, no permissions, no enterprise features (keep it simple)
- Storage: none. All working data lives in in-memory app state for the current visit; nothing is kept in a database, server storage, logs, or browser storage. Users keep a demo by downloading it as a JSON file.

---

## Non-negotiable rules

1. **Grounding.** All generated content comes from the active pack's knowledge base.
   Every slide and quiz question carries a citation (document + section).
   If the documents do not cover a topic, say so plainly. Never invent policy.
2. **Verify.** Run a second pass that checks each claim against the source before
   the user sees it. Flag anything unsupported. Two layers: code checks (cited
   section exists, quote is verbatim, quiz answer valid, never-say list) and a
   second-model pass. Flags appear in a verification report and stay marked on the item.
3. **Structured output.** The AI returns JSON that matches the schemas. The UI
   renders it through fixed components. Never generate arbitrary UI code at runtime.
4. **Keys stay server-side.** Never expose API keys to the browser.
5. **Original content only.** All sample documents are fictional and written by us.
   No real company names, branding, or copied course material.
6. **Everything is driven by the pack.** Do not hardcode topics, tone, terms, or
   examples in the engine. If something is specific to security or HR, it belongs
   in a pack, not in the code.

---

## How the demo works (the easy workflow)

Built for a non-technical HR user: one path, plain words, one main button per
screen. Full screen-by-screen spec: `ux-redesign.md`.

**Start.** "Start with my documents" is the main action. One sample (a fully built,
made-up company) is offered as "Just want to look around first?". A saved demo
file can be opened here. The demo limits (5 slides, 1 interactive activity,
5 quiz questions) are stated before anything is built.

1. **Step 1: Add documents.** Upload Word, PDF, text, or markdown, or paste text.
   The documents are split into topics (numbered, citable sections; wording never
   changed). The user can check the topics or skip.
2. **Step 2: Style and rules.** Optional, with defaults: how it should sound, rules
   the training follows (two always on), key terms, words to avoid, organization name.
3. **Step 3: Describe it.** Type or speak what the training should cover, pick who
   it is for, then "Build my training". The coverage check runs automatically:
   covered (build), partly covered (build the part we can, or add a document), or
   not covered (say so plainly; never make anything up).
4. **Lesson and quiz.** Slides and one activity, each showing where it came from.
   A missed question shows why, links to the exact slide, and asks again with the
   answers shuffled. Live progress: "3 of 5 mastered".
5. **Step 4: Results and certificate.** Opens only when all 5 questions are
   answered correctly. Shows "5 of 5 mastered", first try vs. after a second look,
   a retest option, the certificate PDF, and "Save my demo".

Nothing is remembered between visits. Reloading or returning starts fresh.

---

## Content packs

A pack is a folder. Swapping packs swaps everything below at once.

```
/packs/<pack-name>/
  pack.json        style profile, guardrails, audience, glossary, never-say list
  docs/*.md        the knowledge base (SOPs, policies)
  samples/         quick example trainings (illustration only, see below)
```

### What a pack controls

| Part | What it is |
|---|---|
| **Knowledge base** | The SOPs and policies. The only source of truth for content. |
| **Style profile** | Tone, voice, reading level, sentence length, brand colors, logo, visual look, personal preferences of the user (for example "short steps, no jargon"). |
| **Guardrails** | Rules the AI must follow: grounding, required disclaimers, escalation language, topics that must not be covered. |
| **Audience** | Who the training is for, and how versions differ by role (for example field tech vs. manager). |
| **Glossary** | Terms and their approved definitions. The AI uses these exact terms. |
| **Never-say list** | Words, phrases, and claims the AI must not use. Checked on output. |

### pack.json shape

```json
{
  "name": "security-sop",
  "displayName": "Security SOP",
  "organization": "Harborline Security Services (fictional)",
  "description": "one line shown on the start screen",
  "style": {
    "tone": "direct, practical, field-ready",
    "readingLevel": "plain, 8th grade",
    "sentenceLength": "short",
    "colors": { "primary": "#0B5FFF", "accent": "#FF6B2C", "background": "#F7F8FA" },
    "logoText": "HARBORLINE",
    "preferences": ["short steps", "use numbered procedures", "no filler"],
    "look": { "font": "sans", "corners": "sharp" }
  },
  "guardrails": [
    "Answer only from the knowledge base.",
    "Cite document and section for every slide and question.",
    "If not covered, say it is not covered."
  ],
  "audience": [
    { "role": "field-tech", "notes": "hands-on, needs procedures" },
    { "role": "project-manager", "notes": "needs approvals and records" }
  ],
  "glossary": [
    { "term": "Credential", "definition": "approved definition from the SOP" }
  ],
  "neverSay": ["guaranteed", "always safe"],
  "starterPrompts": ["Build a short training on handling a customer footage request"]
}
```

Docs use numbered headings (`## 2`, `### 2.1`). Each one becomes a citable
section with a ref like `footage-request-sop#2.1`; glossary terms are `glossary#Term`.

### Samples are examples only

The quick training samples in `/samples` exist to show what good output looks
like, and give the live demo a ready-made training that doesn't depend on API speed.
They are shown in the UI as "Example (illustration only)" and are never sent to the AI.
**They are not templates and must not be copied.** Real output is built
fresh from whatever knowledge base is loaded. If the knowledge base changes, the
training changes: topics, terms, tone, scenarios, and quiz questions all follow it.

Starter sample ideas (fictional):

- **Security SOP pack:** "Handling a customer footage request" (request, approval, export, log). Procedural, so it favors process flow and sequence activities.
- **HR retaliation pack:** "Responding when an employee raises a concern." Judgment-based, so it favors scenario chat and a timeline.

---

## Adaptive format (the pivot)

The AI picks the format that fits the content type, not just the words:

- **Procedural content** (steps, approvals, records): animated process flow, sort/sequence activity.
- **Judgment content** (how to respond to people or situations, even if the source lists steps): branching scenario chat, animated timeline.
- **Terminology**: flip cards from the glossary.

---

## Components (fixed, AI fills the JSON)

1. `ContentSlide`
2. `ProcessFlow` (animated, steps light up in order)
3. `Timeline` (animated, events appear in sequence)
4. `ScenarioChat` (messenger style, with answer choices)
5. `SortActivity` (drag and drop, ordering)
6. `FlipCards` (glossary terms)
7. `Quiz` (multiple choice with remediation)
8. `Certificate` (PDF)

Video is **out of scope** for the demo. Animation and interactivity replace it.

---

## Length modes

| Mode | Output |
|---|---|
| **Demo** (default) | 5 slides, 1 interactive activity, 5 quiz questions, certificate (`DEMO_LIMITS` in one config object) |
| **Full** | Multi-chapter course with chapter quizzes and a final quiz |
| **Export: Training Guide** | Written guide with full content and citations |
| **Export: Video Package** | Per-scene script, storyboard, and narration text for a video team |

The demo stays short on purpose. Full builds, guides, and video packages are the
growth path using the same engine; they stay behind a developer flag and are not
shown in the HR UI.

---

## Quiz and remediation rules

- Every question has a source citation and an explanation.
- On a miss: show why, link to the exact source slide, re-queue the question.
- Keep missed questions in a review list so they can be retested during the visit.
- Pass rule: all 5 questions must be answered correctly. No partial pass, no skip,
  no retry limit. Step 4, results, and the certificate unlock only at 5 of 5.
- Shuffle the answer order when a missed question is asked again.
- Results show mastery ("5 of 5 mastered"). First try vs. after review is recorded
  per question for the results list only, never to decide pass or fail.

---

## Build order

1. Pack structure and pack switcher
1b. Pack builder (Stage A: add documents, sections, rules, review and save)
2. Coverage check and outline with citations
3. Slides and quiz JSON generation
4. Player with remediation loop
5. Certificate
6. Voice input, style profile applied, verification pass
7. Animated and interactive components
8. Exports (guide, video package)

---

## Demo script (about 3 minutes)

1. Start with my documents: upload an SOP, see the topics found, skip Step 2.
2. Describe a training and build it. Show "where it came from" on a slide. Ask
   for something the documents do not cover and show the plain "not covered" answer.
3. Open the sample to show the same engine with a different tone, look, and format.
4. Miss a question on purpose and show the second look at the source.
5. Reach 5 of 5 mastered and download the certificate.

---

## Commands

```
npm run dev
npm run build
npm run lint
```

---

## Decision Log

Newest at the bottom. One line each. Only chosen decisions.

- 2026-10-27: Built as a simplified demo: no login, permissions, or enterprise features.
- 2026-10-27: Input is a text box or microphone describing the training wanted.
- 2026-10-27: Knowledge base grounding is mandatory; AI must stay within the SOPs and policies.
- 2026-10-27: Packs control knowledge base, style profile, guardrails, audience, glossary, and never-say list.
- 2026-10-27: Demo must pivot between packs (security SOP and HR retaliation) with different tone, look, and format. (Pack tabs replaced on 2026-10-28: the pivot is now the user's documents vs. the sample.)
- 2026-10-27: Video excluded from the demo; keep slides, animation, and interactive activities.
- 2026-10-27: Demo trainings stay short; full courses, guides, and video packages are the growth path.
- 2026-10-27: Wrong quiz answers return the learner to the missed source and re-queue the question.
- 2026-10-27: Completion produces a downloadable PDF certificate.
- 2026-10-27: This file (claude-training.md) is the living project memory and is updated whenever a decision is made.
- 2026-10-27: Name and repo: `pivot-trainer`, private to start; go public only after a key/history check, fictional-docs check, and "independent prototype" label in the README. No vendor names in the name or README (the engine isn't tied to one topic or vendor).
- 2026-10-27: Models: Opus 5.5 generates, Sonnet 5.5 runs the verify pass (faster, cheaper, and independent of the generator); both set in one config file; move verify to Opus if Sonnet misses unsupported claims.
- 2026-10-27: Voice: Web Speech API in v1 with the text box as the fallback; AssemblyAI later. (Replaces "browser speech-to-text or AssemblyAI" in Stack.)
- 2026-10-27: ElevenLabs narration left out of v1, but every slide gets a `narration` text field now so voice and the Video Package export plug in later. (Replaces "Optional: ElevenLabs narration" in Stack.)
- 2026-10-28: Citations are section refs plus a short verbatim quote, checked in code. (Claude's built-in Citations feature can't be combined with structured outputs.)
- 2026-10-28: Generation sends a schema with only the activity type the outline chose. (The five-way union was too large a grammar for structured outputs.)
- 2026-10-28: Slides, activity items, and quiz questions can each cite several sections. (Single citations caused real "unsupported" flags when an item combined sections.)
- 2026-10-28: pack.json `style.look` (font: sans/serif, corners: sharp/soft) drives the visual look, alongside colors and logoText.
- 2026-10-28: Each pack ships pre-generated example trainings in `samples/` for a reliable live demo; never sent to the AI.
- 2026-10-28: All Claude calls use the server-side refusal fallback (`fallbacks: "default"`).
- 2026-10-28: v1 flags unsupported items (report + marker) rather than auto-regenerating them.
- 2026-10-28: Spec file moved from Downloads into the repo root.
- 2026-10-28: Added Stage A, "Set up the knowledge base," before training design: add documents, check sections, set rules, review and save. (User asked for a clearer way to enter SOPs, rules, and guidelines first.)
- 2026-10-28: Packs created in the app are saved in the browser only (no accounts or database), with export/import as a file. The server validates and rebuilds sections from the sent pack on every request. (Browser storage replaced later on 2026-10-28 by "nothing stored between visits"; export/import replaced by the demo JSON file.)
- 2026-10-28: v1 document inputs: paste text, Word (.docx), PDF (text-based; scanned PDFs not supported), and text/markdown files. Extraction runs server-side.
- 2026-10-28: Sectioning: keep numbered headings; auto-number unnumbered headings; otherwise Claude suggests breaks by quoting where each section starts, the code splits the original text there, and the user approves. Document wording is never rewritten.
- 2026-10-28: UI is rebuilt for non-technical HR users. One path: Start, Step 1 Add documents, Step 2 Style and rules, Step 3 Describe it, Step 4 Learn and certificate. (Spec: ux-redesign.md, moved into the repo root.)
- 2026-10-28: "Start with my documents" is the primary entry. The one pre-made pack becomes a labeled sample on the Start screen. Pack tabs are removed from the header.
- 2026-10-28: App header is constant ("Pivot Trainer" plus a "Demo version" tag). Pack branding appears only inside the generated lesson and certificate.
- 2026-10-28: Demo limits are shown before building: 5 slides, 1 interactive activity, 5 quiz questions. (Replaces "3 to 5 slides" in Length modes.)
- 2026-10-28: Jargon is removed from the UI (pack, knowledge base, guardrails, glossary, citations, coverage, remediation). See the vocabulary table in ux-redesign.md.
- 2026-10-28: Coverage check runs automatically when the user clicks "Build my training". It is no longer a separate button.
- 2026-10-28: Results are shown as mastery ("5 of 5 mastered"), not first-try percent. The certificate shows mastery. (Replaces "Score = percent answered correctly on the first try.")
- 2026-10-28: Pass rule: no certificate and no Step 4 until all 5 quiz questions are answered correctly. No skipping, no partial pass, unlimited retries.
- 2026-10-28: Keep one fully built default sample pack. Demo users can add to it (documents, key terms, words to avoid, style and rules) and build their quiz from it instead of starting from scratch.
- 2026-10-28: Nothing is stored between visits. No accounts, no server storage, no browser storage of packs, drafts, progress, or certificates. Every visit starts in the default state. (Replaces browser-saved packs, drafts, and certificates.)
- 2026-10-28: Users who want to keep a demo download it as a JSON file and can open it again on a later visit. (Replaces "Import pack file" / pack export.)
- 2026-10-28: The learner's name is asked once, right before slide 1.
- 2026-10-28: The certificate shows mastery only ("5 of 5 mastered"); first try vs. review stays on the results screen.
- 2026-10-28: Keep the pre-built example training as "See a finished example" on the sample card.
- 2026-10-28: Step 2 has an optional brand color; it styles the lesson and the certificate border. Defaults to the app blue.
- 2026-10-28: HR Anti-Retaliation is the default sample. Security SOP ships as a demo file that opens through the same "saved demo" path.
- 2026-10-28: The certificate PDF is generated fully in the browser.
- 2026-10-28: Going live: per-visitor rate limits in the API routes, plus a separate Anthropic API key with a monthly spend limit for production (the hard cap). Deploy on Vercel (team "power-quote"); repo goes public once live.
- 2026-10-28: Public updates after launch: project README, GitHub profile README, portfolio card + case study in the "Load more" group, side nav entry, How I build tech, Ask Ky section, a captioned screenshot-loop demo, and one resume bullet.
