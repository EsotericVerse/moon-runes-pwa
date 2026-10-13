# LOC — Current Release and Maintenance Plan

**Current source:** `main` · **package:** `0.9.5-rc` (check `package.json`) · **as of:** 2026-10-14  
**1.0.0 candidate date:** 2026-10-16, the first anniversary of LOC's naming; **tentative, not a guaranteed publication**.

This is the **only Current release-readiness and outstanding-work document**. Historical RC plans and the old TODO are not parallel product authority. Published Git Tags and GitHub Releases retain immutable version history.

## Release intent

LOC's core framework is considered ready for an initial stable release by the author. The final 1.0 preparation is **repository/version-control cleanup, coherent Current documents, and release packaging**, not a new major feature sprint. Small correctable issues, UI polish and import edge cases may proceed under `1.0.1`, `1.0.2`, etc. A version number is not a claim of perfect or universal real-device testing.

At release time, preserve Supabase PostgreSQL as the primary runtime authority, existing Registry/Manage/Galaxy/Time mappings, canonical content, Auth/RLS boundaries, LunaRunes symbols and approved 2D/3D VFX. Do not rewrite data or change existing published release tags for cosmetic cleanliness.

## Current completed capability and evidence

- **Core**: Scope/Scope Group Registry, reusable static shell, Galaxy text/media, Source/Time mapping, Search, Statistics, Culture, Governance and authorized management are implemented on Current main.
- **Navigation**: one global NAV, personal favorites/folders, six shared dock actions, and Scope-aware canonical web/native routes.
- **LunaRunes**: the 66-symbol Canon, draw/daily/library/game functions and unified 2D/3D experience retain their separate authored rules.
- **iOS**: Capacitor arm64 builds and unsigned IPA packaging exist; `v0.9.5-rc` has a successful published IPA. This does not assert signed installation or iPhone acceptance.
- **Environment-based file routing**: native App uses private Local File, website uses authorized database import. Neither environment is selected by screen dimensions.
- **Version control**: 96 obsolete branch refs were cleaned after verified Git Bundle backup; Current work enters `main` without new PRs unless expressly authorized. Preserve official Releases/Tags, keep only active release automation.
- **Verification**: report specific workflow run SHA and status; GitHub CI/build/browser checks and actual on-device/manual use are distinct evidence.

## 1.0 packaging checks

1. Freeze the exact `main` commit to publish, check `package.json`/`package-lock.json`, README, native version/build number and release notes are consistent.
2. Run Current repository contracts (`npm run verify`), public DB read contract, static build, desktop/mobile browser checks and GitHub Pages deployment; fix true blockers without suppressing failing assertions.
3. Confirm no broken main navigation, silent wrong-Scope writes, authorization/RLS bypasses, missing essential bundle assets or unusable primary flows. **Genuine data-loss, privacy or authorization regressions are blockers; ordinary small defects can be patched.**
4. For an iOS deliverable, independently run Xcode arm64, validate Bundle ID, AppIcon, numeric 66 cards, export of static routes and the IPA artifact. Label it **unsigned** until locally signed and tested; web acceptance must not be represented as iPhone acceptance.
5. Publish a new immutable `v1.0.0` tag/Release only after the actual release decision. No early tagging because of the anniversary alone.

## Post-release acceptance / patch queue (not automatically 1.0 blockers)

- Website JSON Import/Source Refresh: real sample data round-trip; custom nested mapping, duplicate UID/native IDs, bounded batches, partial failures, permissions and provenance, ensuring no unintended duplicates.
- iPhone: native Local File import/list/read/delete, `LibraryNoCloud` persistence, offline behavior, Files picker/Share, byte-for-byte verification and no unexpected uploads; App-specific SQLite binary backup/restore and daily Rune permission boundaries.
- Remaining device smoke: NAV/favorites/folders, safe-area and touch, 2D/3D/3D ambient fog, daily Rune/draw/library, Account/OAuth and error/empty states; visual approval is distinct from automated tests.
- Scope/Group and managed features: Admin mapping, source-category sharing/revocation, source refresh, media/artist metadata/provenance, Culture cross-Scope timeline, Statistics, Keyword Class analysis and large-corpus performance.
- Verify future feature descriptions against deployed behavior; optional Clerk/organization auth and more advanced Group collaboration stay **separately proposed work**, never silently enabled for 1.0.

## Authority for the remaining Current documents

- Product/semantic definition: `docs/LOC_CANON.md`, `docs/LUNARUNES_DRAW_GOVERNANCE.md`.
- Product depth and analysis: `docs/FEATURE_DEEP_DIVE.md`, `docs/LOC-AUTOMATIC-ANALYSIS.md`.
- One UI/NAV contract: `docs/CURRENT_UI_CONTRACT.md`.
- One domains/deployment/runtime contract: `docs/DOMAIN_ARCHITECTURE.md`.
- One native App/Local File/SQLite contract: `docs/IOS_APP.md`.
- Data/permissions: `docs/DATABASE_MIGRATION.md`, `docs/AUTHENTICATION.md`.
- Directory and dependency ownership: `docs/REPO_DIRECTORY_GOVERNANCE.md`, `package.json`, `package-lock.json`.
- Released RC's archived build specification: `governance/releases/v0.9.5-rc.md`; earlier release documents remain accessible in their historical Git tags.

**Rule:** A completed implementation, an automated check and an explicitly accepted real-device workflow are different statuses. Do not retroactively infer unperformed validation or present a patch-eligible improvement as an unimplemented core system.
