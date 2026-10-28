@AGENTS.md

# Pivot Trainer

Read `claude-training.md` first. It is the project's living spec and decision log:
update its Decision Log in the same turn whenever a decision is made.

Key paths:
- `packs/<name>/` content packs (pack.json, docs/*.md with numbered sections, samples/)
- `src/lib/` engine: schemas (Zod), prompts, Claude calls, code checks, pack loader
- `src/app/api/` coverage, outline, generate (generate + code checks + verify)
- `src/components/` fixed UI components; the AI only fills JSON

Scripts (dev server on :3210): `node scripts/smoke.mjs`, `npx tsx scripts/tamper-test.mts`, `node scripts/e2e.mjs`.
