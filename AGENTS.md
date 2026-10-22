# Repository Agent Instructions

## Skill-first work

- Before working, inspect `.agents/skills/` and `skills-lock.json`. Select the installed Skills whose descriptions match the task. Read each selected `SKILL.md` and any references it directs you to use before planning or editing.
- Apply those Skills' actual workflows. Do not infer a Skill's behavior from its name, claim an unavailable Skill is installed, or load unrelated Skills.
- Use only Skills that currently exist in the repository and are listed in `skills-lock.json`. Do not cite, recreate, or rely on deleted Skills.
- Keep this file limited to durable repository-wide instructions. Do not copy Skill procedures into it or create a parallel project-specific architecture doctrine.
- When a repository instruction conflicts with an applicable installed Skill, remove the conflicting instruction instead of blending incompatible rules, unless the user's current explicit instruction requires otherwise. When two applicable Skills conflict, inspect their scope and references; use the more task-specific guidance and report any unresolved conflict.

## Scope and execution

- Follow the user's current request and its stated scope. When the user directly asks for implementation, implement it and verify it; do not stop at a proposal unless required information or access is genuinely missing.
- Inspect the current repository, dependencies, and call sites before making technical claims or changes. Do not rely on stale notes, filenames, or assumptions when the source can be checked.
- Make only changes needed for the requested task. Preserve unrelated user-authored content and data. A request to change application behavior authorizes the code changes needed for that behavior, not unrelated content edits.
- Treat database writes and schema changes as separate from Git operations. Perform them only within the user's explicit task scope, and use the relevant installed database Skill before acting.
- Do not add engineering notes or internal explanations to user-visible UI copy unless the user asks for that copy.

## Skill routing

Use these installed repository Skills when their task triggers apply:

- React or Next.js implementation, data fetching, bundle size, rendering, or performance: `.agents/skills/vercel-react-best-practices/SKILL.md`; load its relevant rule files.
- React component APIs, composition, compound components, or component architecture: `.agents/skills/vercel-composition-patterns/SKILL.md`.
- PostgreSQL or Supabase queries, schema, migrations, RLS, indexes, database functions, or database performance: `.agents/skills/supabase-postgres-best-practices/SKILL.md`; load its relevant references before database work.
- UI design, accessibility, metadata, motion, or browser-based interaction: select the matching installed Skill, such as `frontend-design`, `improve-ui`, `fixing-accessibility`, `fixing-metadata`, `fixing-motion-performance`, `agent-browser`, or `browser-use`.
- Code review: use `.agents/skills/code-review-expert/SKILL.md` and follow its review workflow. Keep review-only work separate from implementation unless the user asks for fixes.

## Verification and handoff

- Inspect the final diff and verify that unrelated files and content were not changed.
- Run checks appropriate to the change and report what actually passed. Do not treat a green CI run, installed package, or partial-page check as proof that the requested behavior works.
- State any unverified behavior and why it could not be checked. Report changed files, key differences, verification results, and remaining work; do not hand technical review or acceptance back to the user.
