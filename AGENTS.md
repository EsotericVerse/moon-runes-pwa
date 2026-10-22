# Agent Instructions

## Operating rules

- Follow the user's current request and scope. When implementation is directly requested, carry it through and verify it; do not replace the requested work with a proposal unless essential information or access is missing.
- Before acting, inspect the relevant source, call sites, dependencies, and current state. Do not treat old notes or assumptions as evidence when the repository can be checked.
- At the start of each task, inspect both this repository's available skills and the skills exposed by the current agent runtime. These are additive inventories, not competing lists.
- Select every skill whose trigger applies, including skills available through installed plugins or the current runtime even when they are not stored in this repository. Read each selected skill's instructions and required references before acting. Do not use this file's local routing table as an allowlist or as a reason to reject an otherwise applicable skill.
- Apply complementary skills together when their scopes overlap. A router skill may constrain the skills in its own workflow; that constraint does not suppress unrelated applicable skills. Follow documented prerequisites and scope boundaries, and resolve conflicts from the user's current instruction and each skill's actual guidance.
- Do not invoke unrelated skills or claim a skill is available when it is not exposed in the current runtime or repository. If a selected skill delegates to another skill or tool, follow that workflow.
- The user's current instruction takes precedence over repository guidance. Remove stale or contradictory repository rules rather than combining incompatible instructions. Surface only conflicts that cannot be resolved from the user's instruction and applicable skill guidance.
- Keep this file to durable repository-wide rules and routing. Keep detailed procedures in their skill files.
- The table below indexes only skills stored in this repository. When a skill is added, removed, or updated under `.agents/skills/`, reconcile the table in the same change. Discover environment-provided skills dynamically for each task; do not treat their absence from this table as evidence that they are missing.

## Repository skill routing

| Repository skill | Use it for |
|---|---|
| `.agents/skills/brainstorming/SKILL.md` | New features, behavior changes, components, or other creative/planning work. Use repository context and decisions already given; ask only for decisions that remain genuinely unclear. Once direction is clear and implementation is authorized, proceed. |
| `.agents/skills/vercel-react-best-practices/SKILL.md` | React or Next.js implementation, review, refactoring, data fetching, rendering, and performance. Read relevant rule files as directed. |
| `.agents/skills/vercel-composition-patterns/SKILL.md` | React component API design, composition, reusable components, compound components, or boolean-prop proliferation. |
| `.agents/skills/supabase-postgres-best-practices/SKILL.md` | Any Postgres/Supabase database query, schema, migration, index, RLS, function, or performance work. Load before database changes and follow its reference guidance. |
| `.agents/skills/ui-skills-root/SKILL.md` | UI work. Use its documented selector to choose a small set of relevant UI skills and follow its limit for that UI workflow. |
| `.agents/skills/frontend-design/SKILL.md` | Creating or substantially reshaping a user interface with a deliberate visual direction. |
| `.agents/skills/ui-ux-pro-max/SKILL.md` | UI/UX decisions on layout, forms, color, typography, interaction, and UX review. Query its local data with `python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>`; read-only, offline. |
| `.agents/skills/baseline-ui/SKILL.md` | Quick UI polish for spacing, hierarchy, typography, and small layout issues. |
| `.agents/skills/fixing-accessibility/SKILL.md` | Implementing or fixing accessibility, including keyboard access, focus, ARIA, forms, contrast, and WCAG issues. |
| `.agents/skills/fixing-metadata/SKILL.md` | Page metadata, social previews, canonical URLs, structured data, favicons, and robots directives. |
| `.agents/skills/fixing-motion-performance/SKILL.md` | Animation jank and motion performance, including layout thrashing and compositor-related issues. |
| `.agents/skills/improve-ui/SKILL.md` | Read-only audit of an existing product UI and a self-contained implementation plan. Never use it to edit product source. |
| `.agents/skills/web-design-guidelines/SKILL.md` | Read-only review against Web Interface Guidelines. Fetch the current guidelines as the skill directs. |
| `.agents/skills/create-design-md/SKILL.md` | Creating or updating `DESIGN.md` from repository or website evidence; follow its scope restrictions on product source. |
| `.agents/skills/component-canvas/SKILL.md` | Building an interactive canvas to inspect existing UI components and variants. |
| `.agents/skills/create-canvas/SKILL.md` | Building a freeform interactive canvas for exploring, comparing, or iterating on ideas. |
| `.agents/skills/sleek-design-mobile-apps/SKILL.md` | Designing mobile screens with Sleek or implementing Sleek designs in React Native or HTML. Read the applicable design/implementation guide; do not expose required secrets. |
| `.agents/skills/vercel-react-native-skills/SKILL.md` | React Native or Expo implementation, native modules, animation, and mobile performance. |
| `.agents/skills/agent-browser/SKILL.md` | Browser interaction, web-app testing, screenshots, and browser task automation. Prefer this for general browser automation; follow its documented CLI setup before use. |
| `.agents/skills/browser-use/SKILL.md` | Direct CDP or attached-session browser work, including logged-in sessions, Playwright/Puppeteer, or hosted browser workflows. Use when that specific control path is needed; follow its session-safety instructions. |
| `.agents/skills/remotion-best-practices/SKILL.md` | Any Remotion video or animation work. Treat it as the Remotion workflow router and follow its delegated instructions. |
| `.agents/skills/seo-audit/SKILL.md` | Auditing, diagnosing, or reviewing site SEO. Use metadata-fixing for a scoped metadata implementation task. |
| `.agents/skills/code-review-expert/SKILL.md` | Reviewing current code changes. Follow its review workflow; implement findings when the user has asked for fixes. |
| `.agents/skills/find-skills/SKILL.md` | Discovering or installing a skill when the user asks to find or extend available skills. |
| `.agents/skills/skill-creator/SKILL.md` | Creating, editing, or evaluating a skill when the user asks for skill work. |
| `.agents/skills/grill-me/SKILL.md` | Stress-test a plan or design through a relentless one-question-at-a-time interview before building. |
| `.agents/skills/grilling/SKILL.md` | Grill the user on a plan, decision, or idea when they ask to stress-test it or use a "grill" trigger phrase. |
| `.agents/skills/grill-with-docs/SKILL.md` | Same interview as grill-me, and records ADRs and a glossary as decisions are made. |
| `.agents/skills/improve-codebase-architecture/SKILL.md` | Scan the codebase for deepening/refactoring opportunities, present an HTML report, then grill through the chosen one. |
| `.agents/skills/tdd/SKILL.md` | Test-first development (red-green-refactor) for features and bug fixes, including integration tests. |
| `.agents/skills/setup-matt-pocock-skills/SKILL.md` | One-time repo setup for the engineering skills (issue tracker, triage labels, domain docs). Run only when the user asks. |
| `.agents/skills/triage/SKILL.md` | Move issues and external PRs through triage states, categorise, verify, and write agent-ready briefs. |
| `.agents/skills/prototype/SKILL.md` | Build a throwaway prototype to answer a design question (state model, logic, or UI direction). |
| `.agents/skills/hyperframes/SKILL.md` | Authoring HyperFrames videos (HTML-based video compositions). Start here for video work. |
| `.agents/skills/hyperframes-cli/SKILL.md` | HyperFrames CLI jobs: scaffold, check, preview, render locally or in the cloud, publish. Needs Node.js 22+ and FFmpeg. |
| `.agents/skills/hyperframes-registry/SKILL.md` | HyperFrames component/block registry for video compositions. |
| `.agents/skills/media-use/SKILL.md` | Get or make media for a HyperFrames video: music, sfx, images, voiceover, transcripts, colour grades. HeyGen features need the user's own API key; never expose it. |
| `.agents/skills/handoff/SKILL.md` | Compact the current conversation into a handoff document for another agent. |

## Completion

- Inspect the final diff and verify that unrelated files were not changed.
- Run checks appropriate to the task and report the actual results. State what remains unverified and why.
- In the handoff, summarize the changed files, the meaningful differences, and verification performed.
