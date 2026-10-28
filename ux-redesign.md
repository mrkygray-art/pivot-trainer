# UX Redesign: a path an HR person can follow without help

Companion to `claude-training.md`. Read that file first for the engine, grounding
rules, components, and decision log. This file only changes **what the user sees
and does**. The engine, pack format, grounding, verification, quiz remediation,
and certificate logic stay as they are.

A visual preview of this layout exists as a Claude design canvas (five screens:
Start, Step 1, Step 2, Step 3, Step 4). Treat it as the reference for layout,
copy, and spacing. Its example data is placeholder only.

---

## 0. Do this first: update claude-training.md

Per the LIVING FILE RULE, add these lines to the Decision Log and update any
section they contradict:

- 2026-10-28: UI is rebuilt for non-technical HR users. One path: Start, Step 1 Add documents, Step 2 Style and rules, Step 3 Describe it, Step 4 Learn and certificate.
- 2026-10-28: "Start with my documents" is the primary entry. The one pre-made pack becomes a labeled sample on the Start screen. Pack tabs are removed from the header.
- 2026-10-28: App header is constant ("Pivot Trainer" plus a "Demo version" tag). Pack branding appears only inside the generated lesson and certificate.
- 2026-10-28: Demo limits are shown before building: 5 slides, 1 interactive activity, 5 quiz questions.
- 2026-10-28: Jargon is removed from the UI (pack, knowledge base, guardrails, glossary, citations, coverage, remediation). See the vocabulary table below.
- 2026-10-28: Coverage check runs automatically when the user clicks "Build my training". It is no longer a separate button.
- 2026-10-28: Results are shown as mastery ("5 of 5 mastered"), not first-try percent. The certificate shows mastery.
- 2026-10-28: Pass rule: no certificate and no Step 4 until all 5 quiz questions are answered correctly. No skipping, no partial pass, unlimited retries.
- 2026-10-28: Keep one fully built default sample pack. Demo users can add to it (documents, key terms, words to avoid, style and rules) and build their quiz from it instead of starting from scratch.
- 2026-10-28: Nothing is stored between visits. No accounts, no server storage, no browser storage of packs, drafts, progress, or certificates. Every visit starts in the default state.
- 2026-10-28: Users who want to keep a demo download it as a JSON file and can open it again on a later visit.

---

## 1. Who this is for

An HR or training professional who knows policy and people, but not technology.
They should never need to know what a pack, a prompt, or a knowledge base is.
Every screen answers three questions in plain words: where am I, what do I do
here, what happens next.

## 2. Problems found in the current build

1. Two pre-made packs sit in the header next to "+ New pack". A first-time user
   cannot tell what is real, what is a sample, or where to begin.
2. The header brand changes with the pack (Cedarline, Harborline, Pivot Trainer),
   so the app looks like three different products.
3. Technical words: pack, sections, rules, audience, check coverage, knowledge base.
4. Nothing sets expectations. A user does not learn up front that the demo makes
   5 slides, 1 activity, and 5 questions.
5. The setup wizard (Documents, Sections, Rules, Review) is a technical checklist,
   and it lives apart from the rest of the journey.
6. The result screen leads with "20%" and a "Training complete" check at the same
   time. After a remediation loop, the learner has actually mastered every
   question, so the headline contradicts what happened.
7. "Import pack file", "Close (draft is kept)", and "What's in this pack?" show
   developer concepts to everyone.

## 3. Principles

- One path, one primary button per screen.
- Samples are clearly labeled and never compete with "start with my documents".
- Say what the demo does before the user invests time.
- Defaults everywhere. Step 2 is optional and Next is always enabled.
- Buttons say what happens next ("Next: Style and rules"), not "Continue".
- Explain why, not just what ("so nothing gets made up").
- Never use a word the user would have to look up.

## 4. Vocabulary (UI only; code names can stay)

| Old term | New UI wording |
|---|---|
| Pack / content pack | Your documents (never shown as "pack") |
| + New pack | Start with my documents |
| Knowledge base | Your documents |
| Sections | Topics ("Here is what we found in your documents") |
| Stage A / Step 1 Documents, Sections, Rules, Review | Step 1 Add documents, Step 2 Style and rules, Step 3 Describe it, Step 4 Learn and certificate |
| Style profile | How should it sound? |
| Guardrails | Rules the training follows |
| Glossary | Key terms |
| Never-say list | Words to avoid |
| Audience (dropdown) | Who is this training for? (radio cards) |
| Citations | Show where it came from |
| Check coverage | Runs automatically on "Build my training" |
| Remediation / re-queue | A second look |
| First-try percent | N of N mastered |
| Example (illustration only) | Sample |

## 5. The flow

```
Start -> Step 1 Add documents -> Step 2 Style and rules -> Step 3 Describe it
      -> (build, lesson, quiz) -> Step 4 Results and certificate
```

A four-item progress bar shows on every screen after Start. Finished steps show
a check mark. The current step is highlighted with a border and a tint, not only
color. Finished steps are clickable.

### Start
- Headline: "Turn your policies into a short, interactive training."
- Primary button: "Start with my documents". Next to it: "No account or sign-in needed."
  Below it, a small link: "Have a saved demo? Open it" (loads a downloaded JSON
  file, see section 11).
- Card "What this demo gives you": one short lesson (5 slides and 1 interactive
  activity), a 5-question quiz (a miss shows the exact part of the document, then
  asks again), a certificate (downloadable PDF).
- Amber note: "This is a demo. It builds one short lesson, not a full course.
  For this demo, please use documents you are comfortable sharing. Nothing is
  kept after you leave, so download your demo if you want to use it again."
- "How it works": four cards matching the four steps.
- "Just want to look around first?": one sample card (a fully built, made-up
  company) with an "Open sample" button. The sample loads its documents, style,
  and rules, then goes to Step 3. Users can add to it first (see section 10).
- Footer: independent prototype, sample companies are fictional.

### Step 1: Add your documents
- Plain intro: the training uses only these documents; if something is not in
  them, we say so.
- Upload files / Paste text switch. Dropzone with "Choose files" button. Keep the
  existing limits (Word, PDF, text, Markdown, 4 MB each, several files). Keep the
  scanned-PDF message and point to Paste text.
- "Your documents" list. Each shows a friendly status ("Read successfully" or
  "We could not read this one") and a Remove button.
- "Here is what we found in your documents": the existing section split shown as
  topic chips. Copy: "Does this match what you expect?" and "Not sure? Skip this,
  it is fine as is." An "Edit the topics" link opens the existing section editor.
- Buttons: Back, "Next: Style and rules".

### Step 2: Set your style and rules
Everything is optional and preselected. Next is always enabled.
- "How should it sound?": three radio cards (Warm and supportive, Direct and
  practical, Formal and precise). Maps to `style.tone`.
- "Rules the training follows": "Use only my documents" and "Show where it came
  from" are checked and disabled with an "(always on)" note. Two more are
  toggleable: "Say so when something is not covered" and "Remind learners to
  check with HR on tricky cases". Maps to `guardrails`.
- "Your words": Key terms (term plus meaning, "Add this term") maps to `glossary`.
  Words to avoid (chips plus "Add to the list") maps to `neverSay`.
- "Organization name" (shown on the certificate).
- Buttons: Back, "Next: Describe the training".

### Step 3: Describe the training you need
- Large text box, label "What should the training cover?", example placeholder.
- "Speak it" button (Web Speech API). Note: "Works best in Chrome or Edge. You can
  always type instead." If speech is unavailable, hide the button and keep the text box.
- "Not sure what to ask for? Try an idea from your documents:" three chips
  generated from the topics found in Step 1. Clicking one fills the text box.
- "Who is this training for?": radio cards built from the pack's audience list.
- Two cards: "What you will get" (5 slides, 1 activity, 5 questions, current tone,
  link to change style and rules) and "We check your documents first".
- Buttons: Back, "Build my training".

### Build and coverage check (automatic)
On "Build my training", run the coverage check first. Three outcomes:
1. Covered: say so, then build.
2. Partly covered: name what is covered and what is missing. Offer "Build the
   part we can" and "Add a document" (goes to Step 1).
3. Not covered: say plainly what is missing, offer "Add a document" and three
   idea chips. Never make anything up.
While building, show plain progress lines: Reading your documents, Writing the
slides, Checking every slide against your documents, Making the quiz. (The
checking line is the verification pass, described without jargon.)

### Lesson and quiz
Unchanged behavior: citations on every slide and question, remediation loop,
missed questions kept for retest during the visit. The pass rule in section 9
applies. Add a one-time prompt before slide 1 asking
"What name should appear on your certificate?" (see open decisions).

### Step 4: Results and certificate
This screen only opens after the learner has answered all 5 questions correctly
(see section 9).
- Heading: "You finished the training." Subtext: every question is now answered
  correctly; where a second look was needed, we showed the exact part of the
  document and asked again.
- Results card: "5 of 5 mastered" (N of N), then "X on the first try, Y after a
  second look". Per-question list with the topic name and a text chip ("First
  try" or "After review"). Never rely on color alone.
- Button "Practice the ones I needed review on" retests the missed questions.
- Certificate preview: organization name, "Certificate of Completion", learner
  name, training title, date, result ("N of N mastered"), certificate ID, and
  "Made with Pivot Trainer, an independent prototype."
- Buttons: "Download certificate (PDF)", "Save my demo" (JSON file, section 11),
  "Build another training".
- Note: "Nothing is kept after you leave. Download your certificate and your demo now."

## 6. Visual rules (match the preview)

- Constant app chrome. Pack style (tone, colors, brand) applies only to the
  generated lesson and certificate, never to the app header, buttons, or steps.
- Tokens: page #F5F6F8, card #FFFFFF, border #D9DEE5, text #16222E, body muted
  #3B4856, small muted #4A5866, primary #1B4FD6 (hover #123A9E), soft blue
  #E8EEFC, demo tag #FFF3DC on #7A4300, success #1B6B45 with chip #DDF1E5 on
  #124A2E, review chip #FFF3DC on #5E3600.
- Fonts: Source Serif 4 (headings), Inter (body). Base 17px at 1.55 line height.
  Minimum body text 16px, minimum small text 14px.
- Layout: one column, max width 960px for steps and 1120px for Start and Results.
  Cards with 16px radius and 1px borders. Primary buttons 52px tall, all touch
  targets at least 44px.
- Must work on a phone: cards wrap to one column, nothing scrolls sideways.

## 7. Accessibility

- Real `<label>` for every input, real radio and checkbox inputs, real buttons.
- Text contrast at least 4.5:1. State is never shown by color alone.
- Icon-only controls get `aria-label`. The mic button has a visible text label.
- Logical tab order, visible focus rings, progress bar uses `nav` with `aria-label`.

## 8. Demo limits

Keep in one config object and read it everywhere (Start, Step 3, generation
prompts, quiz builder):

```
DEMO_LIMITS = { slides: 5, activities: 1, questions: 5 }
```

Full and export modes from `claude-training.md` stay behind a developer flag and
are not shown in the HR UI.

## 9. Pass rule

- A learner does not pass until all 5 quiz questions are answered correctly.
  There is no partial pass, no "complete anyway", no skip, and no retry limit.
- A wrong answer shows why, links to the exact slide, then asks the question
  again. Shuffle the answer order on the re-ask so the learner cannot just
  remember a position.
- Show live progress during the quiz: "3 of 5 mastered".
- Step 4, the results, and the certificate unlock only when 5 of 5 are mastered.
- Record first-try versus after-review for each question. It is used only for
  the results list, never to decide pass or fail.
- Missed questions stay in the retest list for the rest of the visit only.

## 10. Sample pack and building on it

- Ship one fully built sample pack with its documents, topics, style, rules, key
  terms, words to avoid, audience list, and a ready quiz. It is always labeled
  "Sample" with a note that the company is fictional. Which pack this is: see
  open decisions (section 15).
- The sample files in the repo are read-only. "Open sample" loads a copy into the
  current visit's memory, then opens Step 3 with idea chips filled in. A user can
  generate a quiz right away, with no setup.
- Demo users can add to the sample before building:
  - Step 1: add more documents (upload or paste). Sample documents stay in the
    list, marked "Sample".
  - Step 2: add key terms and words to avoid, and change tone and rules.
  - The coverage check and citations run across all documents, sample and added.
    Each citation names the document it came from.
- Show a small banner during a sample session: "You are using a sample. Use my own
  documents instead" (goes to Step 1 with a clean slate).
- Optional "See a finished example" link on the sample card, using the existing
  pre-built example training.
- Remove the pack tabs from the header and the "What's in this pack?" disclosure.
  Replace the disclosure with a "Your documents" summary link on Step 3
  (document count and topic count).

## 11. Saving, downloading, and no memory

**Nothing is remembered between visits.**
- No accounts. No database or server storage of packs, documents, drafts, quiz
  progress, or certificates.
- No browser storage for any of it: no localStorage, sessionStorage, IndexedDB,
  or cookies holding pack or progress data.
- The generation routes are stateless. Do not log or persist document text.
- All working data lives in in-memory app state. Reloading the page or returning
  later brings the app back to its default state: the sample pack loaded, an empty
  text box, Step 1 selected.
- Warn before leaving when there is work to lose (a `beforeunload` prompt): "If
  you leave, your demo will be lost. Download it first."
- Remove the old "saved in this browser" certificate behavior and any draft autosave.

**Keeping a demo: download a JSON file.**
- "Save my demo" appears in the header menu (once something has been added or
  built) and on the Step 4 results screen. It downloads
  `pivot-trainer-demo-YYYYMMDD.json`.
- The file contains: `app`, `version`, `savedAt`, the pack (documents with their
  text, topics, style, rules, key terms, words to avoid, audience list), the
  organization name, and the generated training (slides, activity, quiz questions
  with citations).
- The file does not contain: the learner's name, quiz answers or progress, API
  keys, or anything about the user's device.
- Warn on download: "This file includes the text of your documents. Share it
  carefully."
- "Have a saved demo? Open it" appears on Start and Step 1. It loads the file into
  memory, and the user continues from there.
- Validate on open: check `app` and `version`, enforce a size limit, treat every
  field as untrusted text (never execute it), and show a plain message for a bad
  file: "That does not look like a Pivot Trainer demo file."
- The old "Import pack file" feature is replaced by this. The saved demo file can
  be reused as a starting pack.

## 12. Move out of the way

- "Import pack file" is replaced by "Have a saved demo? Open it" (section 11).
- "Close (draft is kept)" is removed. Nothing is saved between visits (section 11).
  Add a "Start over" link in the header menu that resets to the default state.
  Do not show draft language on screen.

## 13. Implementation order

1. Shared shell: design tokens, header, progress bar, button and card styles.
2. Start screen. Remove pack tabs and constant-brand the header.
3. Step 1 (reuse the current Documents and Sections logic, new wording).
4. Step 2 (reuse the current Rules logic, new wording, locked defaults).
5. Step 3 (move audience here, speech input, idea chips, automatic coverage check).
6. Build progress and the three coverage outcomes.
7. Pass rule gate, results, and certificate (mastery wording, per-question list, retest button).
8. Default sample pack, add-to-sample editing, and sample banner.
9. Save my demo (JSON download) and open a saved demo. Remove all cross-visit storage.
10. Copy pass using the vocabulary table. Search the UI for banned words.
11. Update `claude-training.md` (section 0 above).

## 14. Acceptance checklist

- A non-technical HR person gets from Start to a downloaded certificate with no help.
- No screen shows: pack, knowledge base, guardrails, glossary, citation, coverage,
  remediation, JSON, prompt.
- Every screen shows where the user is in the four steps.
- Demo limits (5 slides, 1 activity, 5 questions) are visible before building.
- Samples are labeled and never appear as the main action.
- The app header looks the same in every state; only the lesson and certificate change style.
- Step 2 can be skipped with defaults. Next is never disabled there.
- A topic the documents do not cover produces a plain "not covered" message, not made-up content.
- Results lead with mastery. The certificate shows mastery.
- All screens work at phone width and with keyboard only.
- No Step 4 and no certificate until all 5 questions are answered correctly.
- Reloading or returning later brings back the default state. Nothing from a
  previous visit remains (check localStorage, sessionStorage, IndexedDB, cookies,
  and any server storage or logs).
- A downloaded demo file reopens with the same documents, style, rules, generated
  training, and quiz.
- A user can open the sample, add their own document or term, and build a quiz
  without starting from scratch.

## 15. Open decisions (ask the user, then log the answer)

1. Where to ask for the learner's name: before slide 1 (recommended) or on Step 3.
2. Whether the certificate also shows the first-try count or only mastery.
3. Keep the pre-built example trainings as "See a finished example", or remove them.
4. Whether the certificate border color should follow a brand color set in Step 2.
5. Which pack is the one default sample: HR Anti-Retaliation (recommended for an
   HR audience) or Security SOP. The other can ship as a downloadable demo file
   that users open with "Have a saved demo? Open it".
6. Whether the certificate PDF is generated fully in the browser (recommended, so
   nothing touches a server).
