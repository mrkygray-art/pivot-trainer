@AGENTS.md

# Pivot Trainer

Read `claude-training.md` first. It is the project's living spec and decision log:
update its Decision Log in the same turn whenever a decision is made.

Key paths:
- `packs/<name>/` content packs (pack.json, docs/*.md with numbered sections, samples/)
- `src/lib/` engine: schemas (Zod), prompts, Claude calls, code checks, pack loader
- `src/app/api/` coverage, outline, generate (generate + code checks + verify)
- `src/components/` fixed UI components; the AI only fills JSON
- `src/components/flow/` the HR-facing flow (Start, Steps 1-4); working data is in-memory only, never browser storage
- `ux-redesign.md` is the UI spec (screens, wording, tokens); `claude-training.md` is the engine spec + decision log

Scripts (dev server on :3210): `node scripts/smoke.mjs`, `npx tsx scripts/tamper-test.mts`, `node scripts/e2e-flow.mjs` (acceptance checklist from ux-redesign.md).
