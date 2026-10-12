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

## 7. Mandatory role-switch review for every user-facing change

Perform these **three roles sequentially**. They are delivery gates, not three pieces of UI or text to display to users.

1. **Engineer — implement.** Confirm the requested behavior, existing modules, data ownership, and permissions. Reuse the correct module and established components; do not invent new features, names, menus, explanatory cards, or cross-module shortcuts to demonstrate an architectural concept. Make the behavior correct and test it.
2. **Designer — inspect the finished interface.** Stop thinking like the implementer. Look at the **actual rendered result**, including desktop and phone-sized layouts when applicable. Judge hierarchy, visual weight, information density, spacing, responsive arrangement, and whether essential results are visible without unnecessary scrolling. Delete or redesign redundant headings, repeated controls, oversized cards, and internal engineering explanations. If you would reject the screen as a designer, **do not submit it**.
3. **Ordinary user — complete the task.** Stop thinking like the designer or engineer. From the entry point, try to perform the intended action without prior implementation knowledge: find the correct control, navigate, import/save/search or otherwise finish the task, and interpret its real result. Check empty, loading, error and permission states. An inactive display or an explanation of a future feature is **not** a usable feature. If navigation or purpose is confusing, **do not submit it**.

- **Non-negotiable handoff:** All three roles must pass before calling UI/UX complete. Passing unit tests and a build does not substitute for the designer/user pass. If rendered or real-device checks were not possible, state explicitly that the corresponding review remains unverified; do not claim to have viewed or accepted the design.
- **Rules are implemented in behavior, not written onto the interface.** Product Canon, privacy boundaries, source routing, fixed destinations and disabled operations belong in code. Do not plaster explanatory paragraphs or developer status notes onto user screens.
- **Remove before adding.** For each proposed UI element ask whether the same operation already exists, whether removing it improves the user's flow, and whether it crosses product/module identity (LOC generic functions vs LunaRunes-specific features). Do not create a second entry point to satisfy an implementation checklist.
- **Owner is not the design QA department.** Catch and fix obvious UX problems yourself; never knowingly hand over a screen you would immediately criticize when asked “what do you think as a user?”

Last revised: 2026-10-12 (mandatory engineer → designer → ordinary-user review).

