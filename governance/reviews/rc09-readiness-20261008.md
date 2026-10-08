# LOC 0.9 RC preparation — 2026-10-08

## Status

- Release decision: **candidate for public demonstration, not yet tagged as 0.9 RC**.
- Current package and README version on this date: `0.8.6-rc.1` / 0.8.6-RC.
- Author reports public flows sufficiently stable for demonstration; import and article publishing / editing still require hands-on verification.
- Do not equate prior manual use, executable automated tests, and fully signed-off acceptance. `docs/TODO.md` remains the formal checklist.

## Branch sweep

- Scanned the GitHub branch list, including all pagination.
- Baseline before sweep: 242 branches in repository, 194 freeze-registry entries, 47 pre-existing PR-less historical branch heads missing freeze markers.
- New PR #437 fixed a brittle mobile test by comparing shared LOC Search Hero subtitle to the actual editable LOC source instead of expecting the literal `月典`. The PR's build workflow succeeded and it was merged.
- During the sweep, 48 branch names were added to `governance/frozen-branches.json`: the 47 historical heads plus the recently merged #437 branch. The archival governance branch itself must be frozen after this PR is merged.
- Of the 47 historical heads, 10 had no commits ahead of `main`; 37 diverged with commits not ancestors of the latest `main` (some may already have been squash-merged, rewritten or superseded). A Git difference is **not** proof the feature is missing from main.
- **Freeze means historical/read-only; freeze does not assert that a branch was merged.** No stale diff was automatically cherry-picked; every original historical branch remains available for audit. `main` is the only active development baseline.

## Outstanding acceptance evidence (not claimed to have passed)

1. Import: permission-gated entry, preview, validation, partial failures, duplicate handling and round-trip on real data.
2. Article: publication, rich-text formatting, media URL, save feedback, edit/reopen, visibility and permission checks.
3. Remaining manually unchecked items in `docs/TODO.md`: public smoke, management paths, scale/performance and error/loading states require explicit acceptance evidence before a formal all-green sign-off.
4. Daily Rune record '新增' remains listed in `docs/LUNARUNES_DRAW_GOVERNANCE.md` as a TODO; verify implementation status separately rather than assuming it is closed.

## Explicitly outside the LOC 0.9 RC blocker list

- The independent Rune Game project already provides a new engine and UI. Its eight-group, eight-role and individual Rune-card advanced rule balance, simulations and iterative tuning are a follow-up design track. They do not determine whether the existing stable public demonstration can proceed.

## Release guardrails

- No new features, CSS-specific patches, imports, database schema changes or gameplay balancing in this branch-freeze PR.
- Do not stamp `0.9 RC` or call all testing complete until a separate release decision.
- Future code changes must branch only from the latest `main`, and be merged then frozen.
