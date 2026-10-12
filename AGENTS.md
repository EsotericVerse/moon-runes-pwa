# LOC / LunaRunes — Agent Operating Rules

**Current project-wide workflow authority.** Applies to future LOC work in this repository, including new conversations and coding sessions. Read before making changes. This file governs *how to deliver changes*, not product Canon, security permissions, or database ownership.

## 1. Main-first delivery is the default

- The owner evaluates the **integrated product**, not PR diffs or source review. Primary acceptance is the deployed `main` website and, for iOS-only behavior, the **installed iPhone App**.
- For ordinary requested work: inspect current `main` → edit → run relevant focused checks → commit/integrate directly into `main` → verify the actual `main` commit and deployment/build status → report a testable result. A temporary local working copy is fine; a remote feature branch is **not** a required deliverable.
- **Do not create a GitHub branch or PR by default.** Never stage changes in a branch and then ask the owner to review code, test an unmerged PR, or approve a merge merely because a generic development process says so.
- Only use a remote branch/PR if the owner *explicitly requests one*, or a concrete high-risk operation requires isolation and its exception is explained and agreed. Do not force-push, bypass repository protection, overwrite newer `main` code, or ignore conflicts.
- If direct integration is impossible, state the specific blocker and the exact safe next action. Do not silently substitute a PR as completion.

## 2. Acceptance and honest status

- Website `pass` ≠ iOS `pass`. Next.js/Chromium success does **not** prove Capacitor/WKWebView navigation, touch hit-testing, Dynamic Island safe-area layout, native plugin behavior, file privacy, signing, or installation.
- Report statuses separately: **integrated to main**, **CI checks**, **IPA packaging**, **signed installability**, and **iPhone on-device acceptance**.
- Never report iOS functionality as validated until it has actually been tested on the iPhone. The owner tests user-facing function by installing/using the App; browser or source-code checks cannot replace that acceptance.
- Provide the `main` commit SHA and direct GitHub Actions/Artifact URL as soon as available. The unsigned `.ipa` produced in CI is a packaging artifact, **not directly installable without signing**.
- If the task is only to change code, do not block integration waiting for device tests that can only happen *after* an updated App exists.

## 3. Action and resource discipline

- Normal site and App changes enter `main`; automatic website deployment and iOS-device packaging run from relevant `main` changes. Do not automatically build another Mac simulator App for every PR/branch.
- Run fast focused checks before and alongside integration as appropriate. CI is a diagnostic aid, not an excuse to repeatedly open branches or delay device access.
- Avoid redundant builds, PR-triggered duplicates, needless commit loops, and unnecessary notices. When multiple commits supersede one another, prefer a single latest `main` test candidate and use the run's commit SHA for identification.
- Do not remove legitimate failing tests just to get a green badge: identify the failure, repair stale assertions when warranted, or report the real unresolved regression.
- A `freeze` applies only to **existing finished auxiliary branches after integration**; it does not freeze `main`, require opening a new branch, or gate the owner's ability to test.
- Do not silently publish new GitHub Releases or change an immutable release tag for a test build. Use the existing `main` device-IPA Artifact workflow for iterative App testing.

## 4. New-session handoff

When asked to work on LOC in a new conversation, check this file and the current `main` state first; do not infer that branch/PR approval is desired. The standing owner preference is **direct main integration and product-level acceptance**. If you cannot access this repository, say so rather than claiming to have changed it. Only a new explicit owner instruction overrides this default.

## 5. Public product versus private development

- **The nearly finished public LOC website/framework is the primary product.** The iOS App is a newly started, independently accepted, non-public device-testing extension. Do not replace the public README's LOC project introduction, progress, or 1.0 readiness with native packaging details, Dynamic Island fixes, or repeated IPA release announcements.
- Never publish an iOS App release, attach test IPA binaries to a public GitHub Release, or claim App public readiness without the owner's explicit instruction. Building an App artifact and passing CI are not authorization for public distribution.
- **Repository visibility matters:** this GitHub repository is public as checked on 2026-10-11; public release assets and accessible workflow artifacts must not be represented as private. Do not put private files, personal chat archives or Local File content in this repository. Private iOS testing requires an appropriately access-controlled distribution path before sensitive files are involved.
- If a previously published public App artifact conflicts with the owner's privacy decision, flag the exact release/asset instead of silently treating `prerelease` or `unsigned` as private.
- Do not rewrite historical release tags to erase their history. Public-facing README describes the LOC website first; detailed mobile build instructions belong only in a properly controlled development context.

## 6. Notification boundaries

GitHub Actions trigger reduction limits generated runs, but GitHub account/email notification preferences are separately controlled by GitHub. Do not promise that changing repository workflows turns off all GitHub emails.

## 7. Integrated engineering, UI/UX and user acceptance

**Engineering, interface design and user experience are separate professional perspectives on one product.** UI/UX is not decorative polish after coding: it includes information architecture, interaction design, feedback, accessibility, visual hierarchy, consistency and task completion. The agent owns the professional judgement and the trade-offs; do not ask the owner to allocate fixed percentages or repeatedly point out obvious defects.

### Mandatory, iterative role switching

1. **Engineer — build correctly.** Establish the user's actual outcome, existing flows and module ownership before adding anything. Protect data, authorization, privacy, compatibility and correctness. Reuse stable components; simplify CSS by eliminating duplication and conflicts, **not** by stripping meaningful visual identity. Make focused tests pass locally where possible.
2. **UI/UX designer — judge the actual product.** Deliberately stop reasoning from code structure. Inspect rendered desktop and phone layouts and complete interaction states. Evaluate information architecture, hierarchy, spacing, consistency, responsive behavior, prominence of results, touch targets, feedback and accessible controls. Ask whether every element earns its place; redesign or delete unnecessary cards, duplicate entries, and internal implementation commentary.
3. **Ordinary user — use it with no developer knowledge.** Enter at the real navigation point and try to finish the task. Verify discoverability, number of steps, understandable wording, consequences, empty/loading/error states, and whether the result appears where expected. If it feels confusing, tedious or pointless, do not hand it off.

**These are perspective changes, not three signatures on a checklist.** A problem found in the designer or user role must feed back into engineering and be reviewed again. Do not knowingly ship an interface you would immediately reject when asked how it looks or works as a user.

### Dynamic equilibrium and minimum necessary complexity

- **No fixed 30/35/35 weighting or single-role optimization.** Weight technical risk, UI coherence and user effort according to the task and revisit the balance as evidence changes. Seek solutions that satisfy all three essential interests before negotiating nonessential compromises.
- **Safety and correctness are constraints, not a license for poor UX.** For risky actions, use the smallest clear confirmation or progressive disclosure that actually meets the risk threshold. Do not remove a necessary safeguard for visual elegance, or add gratuitous warnings and steps to signal engineering caution.
- **Modularization, lean CSS and excellent presentation must coexist.** Share mechanisms and design tokens; keep justified visual variants, product-specific effects and appropriate information density. Fewer components, CSS lines or clicks are not improvements if the screen becomes generic, unclear or less usable.
- **Product rules belong in behavior, not in a wall of explanatory copy.** Do not create speculative features, disabled demonstration panels, redundant settings, cross-module menus or invented product names. LOC provides general capabilities; LunaRunes-specific experiences remain within LunaRunes unless explicitly authorized otherwise.

### Quality gate and responsible delivery

- Before pushing: inspect the actual change and existing alternatives → implement and run focused checks → inspect rendered UI in the designer role → walk real tasks in the ordinary-user role → revise and repeat → consolidate a coherent change set. Avoid serial speculative pushes to `main` that flood CI notifications.
- After pushing: inspect the exact `main` CI result and website deployment; distinguish build correctness, rendered visual review and real-device acceptance. **CI fail is not a passed delivery. CI pass alone is not UX acceptance.**
- If a browser, screenshot, touch device or particular test is unavailable, report precisely which acceptance is **unverified**; never claim it passed. Keep important CI alerts enabled and useful by reducing needless triggering, not hiding failures.
- The owner judges a usable, integrated product—not diffs, branches, developer explanations or PRs. Do not transfer engineering debugging, design QA or routine role arbitration back to the owner.

Last revised: 2026-10-12 (integrated engineering / UI/UX / user judgement and dynamic balance).
