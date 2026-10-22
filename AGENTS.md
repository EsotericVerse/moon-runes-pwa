# Agent Instructions

## Priority order

Security ≫ Portable > Loading = UI > Code. Security is first by a wide margin, ahead of every other priority including "prefer mature/portable modules" below. This order is a default weighting, not an all-or-nothing override: a lower tier does not have to be sacrificed whole to satisfy a higher one. Look for the middle-ground option that keeps both reasonably intact first. When a real tradeoff remains (no option keeps all tiers intact) and more than one resolution is defensible, that is the user's call, not an automatic pick by rank — surface the tradeoff and the options instead of silently sacrificing the lower tier. Rank order breaks ties and triages where to spend effort first; it does not replace judgment or the user's decision on a genuine tradeoff.

1. **Security.** Vet any third-party skill, package, or MCP server (license, source reputation, available security audits, what its scripts actually do) before installing it, even when it would otherwise help portability — an unvetted dependency is refused regardless of convenience. Database, credentials, auth, and permission-boundary code keep necessary manual checks even if that means more hand-written code, never fewer checks for the sake of using less code.
2. **Portable.** Prefer mature, portable, widely-used modules/SDKs/packages over new hand-written code tied to this one codebase; the user does not want to see bespoke implementations when an established one exists. Before writing new code, check for an existing library, already-installed dependency, or existing in-repo implementation that does the job. One shared implementation per capability — do not fork the same logic into multiple files or add parallel implementations "for performance" or "to look cleaner." Only write new code when no suitable existing option exists, and say why.
   - This is the same principle as the skill-selection rule under Operating rules (inspect and select existing skills before acting): prefer an existing, maintained solution — a package, a skill, a tool, a config, a workflow — over building a bespoke one, whatever is being built. Apply it by default, everywhere this kind of choice comes up, not only to application code.
3. **Loading = UI** (equal priority, traded off against each other as the specific case requires, not against each other's fixed ranking). "Loading" means load/runtime performance (bundle size, waterfalls, rendering cost), not code elegance. The bar is plain and working, not polished: fix real, noticeable waterfalls, bundle bloat, or jank; don't chase micro-optimizations (e.g. collapsing a few extra queries into one clever batched call) that add complexity for a gain the user won't feel. A handful of extra queries is fine when the plain/portable way of doing something produces them — that's not a Loading-tier problem worth solving. This cuts both ways: avoid concentrating work into one heavy, complex call just to look efficient — several plain, spread-out calls are preferable to one clever consolidated one, as long as nothing in that path is actually slow or janky for the user.
   - **Loading balance**: this is the name for the middle-ground point between Loading and UI specifically (the general "look for middle ground" rule above, applied to this one pair). Neither extreme is correct — not maxing out performance at UI's expense, not maxing out UI at performance's expense. Find the point that keeps both reasonably intact; only escalate to the user when a genuine tradeoff remains with no clean balance point.
4. **Code.** Lowest priority — never trade away 1–3 to make code shorter, more elegant, or more "modular" looking. The user does not want proactive code review for style/structure; only act on security findings (tier 1) or when the user explicitly asks for a review. This tier is deliberately small in practice: applying tier 2 (prefer mature modules over hand-written code) means little hand-written code exists to review or refactor in the first place. Don't go looking for refactors in code that only exists because no suitable module covered it — that code is already minimal by construction. When new code is unavoidable, write the plain, obvious version; don't write a clever/optimized-looking version to satisfy this tier — correctness and it-works come first, nothing here is about how the code reads.

### Which skill handles which priority

- **Security:**
  - New third-party skill/package/MCP server → `.agents/skills/find-skills/SKILL.md` Step 4 (install count ≥1K, source reputation, GitHub stars ≥100) before installing; a skill failing this check is refused even if it would help portability.
  - Code touching auth, input/output boundaries, or secrets → read only `.agents/skills/code-review-expert/references/security-checklist.md` as a checklist (XSS, injection, SSRF, path traversal, AuthN/AuthZ, token handling) — do not run that skill's full review workflow; the user does not want code review.
  - Any Postgres/Supabase change (schema, RLS, functions, migrations) → `.agents/skills/supabase-postgres-best-practices/SKILL.md`, Security & RLS is priority 3 of 8, CRITICAL.
  - Supabase Auth, Edge Functions, Realtime, Storage, the Supabase CLI/MCP, or `supabase-js`/`@supabase/ssr` client code → `.agents/skills/supabase/SKILL.md`. Fetch `https://supabase.com/changelog.md` first per its Core Principles; this project's Supabase config can change out from under training data.
  - Building/reviewing our own MCP integrations → `.agents/skills/mcp-builder/SKILL.md`.
- **Portable:**
  - Before writing new code, scan for an existing module/pattern instead → `.agents/skills/improve-codebase-architecture/SKILL.md` (reuse/consolidation, not cosmetic refactors).
- **Loading = UI:**
  - React/Next.js code → `.agents/skills/vercel-react-best-practices/SKILL.md` (70 rules, priority 1–2 are waterfalls and bundle size).
  - Component API/composition → `.agents/skills/vercel-composition-patterns/SKILL.md`.
  - Visual/interaction design decisions → `.agents/skills/ui-ux-pro-max/SKILL.md`.
  - Verify a change actually works/renders correctly, not just compiles → `.agents/skills/webapp-testing/SKILL.md` (Playwright: real page, screenshot, console/network logs).
- **Code:** lowest priority; do not open `improve-codebase-architecture` or `code-review-expert` proactively for style or structure — only on explicit request, or for the security checklist use above.

## Git workflow

- No branches, no PRs. Commit directly to `main`.
- Still use version control as a safety net: commit real, working increments as you go (not one giant commit at the end) so a mistake can be reverted without losing unrelated work. Don't batch unrelated changes into one commit.
- `git pull --rebase` before every push; never force-push over someone else's commits.

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
- **Skill discovery:** When a specialized or recurring task need is not covered by the currently available repository or runtime skills, use `.agents/skills/find-skills/SKILL.md` to check the skills.sh leaderboard and run a targeted search before creating a custom workflow. Apply Security-tier vetting: verify the license, source reputation, available security audits, and executable scripts, and require at least 1K installs and at least 100 repository stars. Automatically install a candidate only when it fills the gap and passes vetting. For repository-installed skills, add the routing-table entry in the same change and run a coherence check. Keep runtime-only skills dynamic rather than adding them to the repository table. If no candidate qualifies, continue with the best available tools and state why no skill was added.
- **Auto-learning:** add a new skill whenever a real, recurring need for it shows up — don't wait to be asked for that exact skill by name. Two conditions, both required: (1) it passes the Security-tier vetting (`find-skills` Step 4: install count, source reputation, audits, read what its scripts do) before it's installed; (2) after installing, do a coherence pass — its guidance must not contradict this file or another installed skill's guidance. Resolve any conflict found with the Priority order above, the same way as any other tradeoff: look for a middle ground first (e.g. scope the new skill narrower so it doesn't overlap the conflicting rule); if a real conflict remains, the higher tier wins by rank (so a skill conflicting with Security loses to Security); if the conflict is within the same tier or ranking it isn't obviously correct, that's a genuine tradeoff — surface it to the user rather than deciding unilaterally. Never leave two contradictory instructions live in the repo.

## Repository skill routing

| Repository skill | Use it for |
|---|---|
| `.agents/skills/brainstorming/SKILL.md` | New features, behavior changes, components, or other creative/planning work. Use repository context and decisions already given; ask only for decisions that remain genuinely unclear. Once direction is clear and implementation is authorized, proceed. |
| `.agents/skills/vercel-react-best-practices/SKILL.md` | React or Next.js implementation, review, refactoring, data fetching, rendering, and performance. Read relevant rule files as directed. |
| `.agents/skills/vercel-composition-patterns/SKILL.md` | React component API design, composition, reusable components, compound components, or boolean-prop proliferation. |
| `.agents/skills/supabase-postgres-best-practices/SKILL.md` | Any Postgres/Supabase database query, schema, migration, index, RLS, function, or performance work. Load before database changes and follow its reference guidance. |
| `.agents/skills/supabase/SKILL.md` | Supabase Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues, client/SSR integration (supabase-js, @supabase/ssr), CLI/MCP, and debugging Supabase-specific errors — everything about using Supabase beyond raw Postgres. Complements, doesn't replace, supabase-postgres-best-practices. |
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
| `.agents/skills/code-review-expert/SKILL.md` | Not run proactively (see Priority order → Code). Its `references/security-checklist.md` is read as a checklist for the Security tier. Run the full review workflow only when the user explicitly asks for a code review. |
| `.agents/skills/find-skills/SKILL.md` | Discover or install a skill when asked, or when a specialized/recurring need is not covered by available skills; follow the vetting rules above. |
| `.agents/skills/skill-creator/SKILL.md` | Creating, editing, or evaluating a skill when the user asks for skill work. |
| `.agents/skills/grill-me/SKILL.md` | Stress-test a plan or design through a relentless one-question-at-a-time interview before building. |
| `.agents/skills/grilling/SKILL.md` | Grill the user on a plan, decision, or idea when they ask to stress-test it or use a "grill" trigger phrase. |
| `.agents/skills/grill-with-docs/SKILL.md` | Same interview as grill-me, and records ADRs and a glossary as decisions are made. |
| `.agents/skills/improve-codebase-architecture/SKILL.md` | Scan for reuse/consolidation opportunities (Portable tier) before writing new code, not for cosmetic refactors (see Priority order → Code). Present an HTML report, then grill through the chosen one. |
| `.agents/skills/tdd/SKILL.md` | Test-first development (red-green-refactor) for features and bug fixes, including integration tests. |
| `.agents/skills/setup-matt-pocock-skills/SKILL.md` | One-time repo setup for the engineering skills (issue tracker, triage labels, domain docs). Run only when the user asks. |
| `.agents/skills/triage/SKILL.md` | Move issues and external PRs through triage states, categorise, verify, and write agent-ready briefs. |
| `.agents/skills/prototype/SKILL.md` | Build a throwaway prototype to answer a design question (state model, logic, or UI direction). |
| `.agents/skills/hyperframes/SKILL.md` | Authoring HyperFrames videos (HTML-based video compositions). Start here for video work. |
| `.agents/skills/hyperframes-cli/SKILL.md` | HyperFrames CLI jobs: scaffold, check, preview, render locally or in the cloud, publish. Needs Node.js 22+ and FFmpeg. |
| `.agents/skills/hyperframes-registry/SKILL.md` | HyperFrames component/block registry for video compositions. |
| `.agents/skills/media-use/SKILL.md` | Get or make media for a HyperFrames video: music, sfx, images, voiceover, transcripts, colour grades. HeyGen features need the user's own API key; never expose it. |
| `.agents/skills/webapp-testing/SKILL.md` | Verify a running web app with Playwright: click through real pages, screenshot, read console/network logs. Use this before claiming a UI change works. |
| `.agents/skills/mcp-builder/SKILL.md` | Build or review an MCP server that lets Claude talk to an external service. Use when adding or auditing a Claude/MCP integration, not for installing third-party MCP servers found online. |
| `.agents/skills/handoff/SKILL.md` | Compact the current conversation into a handoff document for another agent. |

## Completion

- Inspect the final diff and verify that unrelated files were not changed.
- Run checks appropriate to the task and report the actual results. State what remains unverified and why.
- Before handing off, confirm the change actually does what was asked — not "the code looks right," but observed behavior: run it, render it (`webapp-testing`/Playwright for UI), query it, or otherwise produce evidence the stated goal is met. A claim with no evidence attached is not a completed task.
- Also confirm the change does not regress any higher-priority tier it touches: a Loading/UI fix must not introduce a security gap or an unvetted dependency; a Portable change (swapping in a mature module) must not break Loading/UI behavior it replaced. Check all tiers the change actually touches, not just the one it was framed as.
- Do not bring work to the user for acceptance until the above two checks pass with real evidence in hand. The user verifying unverified work is wasted effort — self-verify first so their review has something real to check against.
- If the evidence itself shows the result is bad — broken, ugly, half-done, or not what was asked — do not hand it off anyway and let the user catch it. Fix it or say plainly it isn't working and why. Never pass along something you would not accept yourself.
- In the handoff, summarize the changed files, the meaningful differences, and verification performed — including what evidence was produced for "it works" and which other priority tiers were checked.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
