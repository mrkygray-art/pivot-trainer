# Training Pivot Demo (claude-training.md)

A prototype that generates short, interactive, source-grounded trainings from a
company's own SOPs and policies. One engine, swappable **content packs**: the same
app can produce a security SOP training, then pivot to an HR retaliation training.

This is an independent prototype. It is not affiliated with any training vendor.

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
- Storage: browser state or a simple table. No user accounts.

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

**Stage A: Set up the knowledge base** (before any training is designed)

A1. **Add documents.** Paste text or upload Word, PDF, text, or markdown. Tag each as SOP, Policy, or Guideline.
A2. **Check sections.** Documents are split into numbered, citable sections. Existing numbered headings are kept; unnumbered headings are numbered automatically; with no headings, Claude suggests section breaks. The wording is never changed (code verifies it). The user can rename and merge sections before continuing.
A3. **Set the rules.** Guardrails, never-say list, glossary, audience roles, and style (tone, reading level, colors, font). "Suggest from my documents" drafts these for the user to edit; nothing is used until approved.
A4. **Review and save** the pack. It joins the pack switcher.

**Stage B: Build a training**

1. **Pick a pack** (a built-in pack or one you created in Stage A).
2. **Ask** by typing or speaking: "Build a short training on ..."
3. **Check coverage.** The system tells you what the knowledge base covers and
   what it does not, before generating.
4. **Approve the outline** (chapters and quiz plan).
5. **Generate** slides, quiz, and interactive/animated activities.
6. **Learn.** Learner works through slides and quizzes.
7. **Remediate.** A wrong answer explains why, links back to the exact source
   slide, and re-queues the question until it is answered correctly.
8. **Certificate.** Learner enters their name at the start. At completion they can
   download a PDF certificate (name, course, date, score, ID) or save it for later.

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
| **Demo** (default) | 3 to 5 slides, one chapter quiz, one animation, certificate |
| **Full** | Multi-chapter course with chapter quizzes and a final quiz |
| **Export: Training Guide** | Written guide with full content and citations |
| **Export: Video Package** | Per-scene script, storyboard, and narration text for a video team |

The demo stays short on purpose. Full builds, guides, and video packages are the
growth path using the same engine.

---

## Quiz and remediation rules

- Every question has a source citation and an explanation.
- On a miss: show why, link to the exact source slide, re-queue the question.
- Keep missed questions in a review list so they can be retested later.
- Do not mark the course complete until required questions are answered correctly.
- In the demo every question is required. Score = percent answered correctly on the first try.

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

1. Open the Security pack. Ask for a short footage-request training.
2. Show the citations. Ask about something the SOP does not cover and show the
   system say it is not covered.
3. Switch to the HR retaliation pack. Same box, new tone, look, and format.
4. Miss a question on purpose and show the loop back to the source.
5. Finish and download the certificate.

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
- 2026-10-27: Demo must pivot between packs (security SOP and HR retaliation) with different tone, look, and format.
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
- 2026-10-28: Packs created in the app are saved in the browser only (no accounts or database), with export/import as a file. The server validates and rebuilds sections from the sent pack on every request.
- 2026-10-28: v1 document inputs: paste text, Word (.docx), PDF (text-based; scanned PDFs not supported), and text/markdown files. Extraction runs server-side.
- 2026-10-28: Sectioning: keep numbered headings; auto-number unnumbered headings; otherwise Claude suggests breaks by quoting where each section starts, the code splits the original text there, and the user approves. Document wording is never rewritten.
