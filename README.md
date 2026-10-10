# LOC｜Luna Codex

**Current version: 0.9.2-rc.3 (Release Candidate — iOS launcher icon and web navigation baseline)**

> 0.9.2 RC3 packages the latest main NAV/favorite folders, Culture revisions, and an iOS unsigned IPA with the approved LOC lunar AppIcon. It remains a stabilization candidate, not 1.0 GA. iOS IPA requires local signing for installation, and private Local File/import with real files remain **Pending / not manually tested**. See `docs/TODO.md`.

This repository contains two related but separately governed systems:

- **LOC／月典 — Language Architecture Framework**
- **LunaRunes／月之符文 — Symbolic Language**

**Lucas Oscar Wang 政德 — Language Architect｜語言建築師**

The two systems can interoperate, but their definitions, data responsibilities and special rules are not shared by default.

---

## LOC

LOC is the framework for organizing text, works, sources, time, relationships, search and analysis.

### Current architecture

- Next.js owns application routing; React owns UI.
- Next filesystem owns existing named routes plus one fixed `/scope/.../` generic shell; DB-created Scope IDs are resolved from the Scope registry at runtime.
- Supabase PostgreSQL owns the primary runtime canonical data. Neon is a public **read-only fallback** when the primary anonymous query fails; authenticated writes and account actions remain on the primary path and never fail over automatically.
- The Scope registry owns hierarchy and deployment/navigation metadata; it does not own corpus data.
- **LOC (`loc`) preserves limited cross-Scope analysis:** Statistics compares managed Scopes' totals, shares and time trends; Culture intersects their currently open periods and compares works/media source-category densities. Other DB-created Scope Groups are overview/navigation only. No merged canonical corpus is created.
- `silver.manage` owns data Scope and Galaxy/Time table mapping.
- PostgreSQL remains the authoritative query layer for Scope, fixed eligibility flags, COUNT, date ranges and pagination across Search, Statistics and Culture.
- PostgreSQL handles precise Scope-based search (LOC Group Search remains a navigation guide), while confirmed keyword classifications are stored as fixed Galaxy attributes. Re-run the explicit batch only when the active Keyword Class or its rules change.
- Keyword classes are self-contained, UUID-addressable Scope resources. The active Class is selected by `current_keyword_class_id`; article results are stored as `class_id` + `group_lists`, and public Statistics/Culture read those attrs without live reclassification.
- Search is lexical/metadata search. Exact Scope aliases terminate with the Scope homepage entry; exact period style keywords prepend their configured short description and then continue normal related results.
- Missing general-Scope configuration remains empty; LOC does not borrow LunaRunes Canon, keywords or Style as fallback.

### Shared LOC features

| Feature | Responsibility |
| --- | --- |
| Statistics | Single-Scope distributions and LOC's bounded cross-Scope totals, share and time trends |
| Culture | Single-Scope Time River, source and Anchor analysis; LOC also retains its cross-Scope intersection and combined source time rivers |
| Governance | Public governance and management boundaries |
| Search | Scope-aware lexical, metadata and relation search |

### LOC data rules

- Galaxy `uid` is the canonical record identity.
- Text works live in Galaxy.
- Media without body text remains media; no blank Galaxy body is invented.
- Media metadata and `meta_tags` may participate in Search, Culture and Statistics.
- `source_id`, `target_id`, `ref_id` and `galaxy_link` keep relationships explicit.
- General Statistics are calculated live from canonical data. Keyword classification is the exception: a confirmed batch writes fixed article attrs so repeated Statistics/Culture views stay lightweight and deterministic.
- Management reads canonical data even when public feature flags are off or `searchable=false`.
- Admin can provision Scopes, create/edit Scope Groups and move registry membership without adding bespoke Next routes.
- **Management roles are exactly `scope` and `admin`:** `scope` is limited to explicit Scope mappings; `admin` has global management authority. A Scope Group, anonymous access, and public feature flags are not additional roles; database RLS remains authoritative.
- Source Refresh compares only incoming `source_name + source_native_id` values in bounded batches, then previews create/update/unchanged counts before writing.

### LOC deployment

- LOC — https://loc.lo3rwang.cc/
- Author — https://loc.lo3rwang.cc/lo3rwang/
- Admin — https://admin.lo3rwang.cc/

### LOC documents by responsibility

- **對外深度功能說明：** `docs/FEATURE_DEEP_DIVE.md` — 目的、機制、跨功能關聯、適用情境與能力邊界；1.0 不以新手教學為主。
- **Canon 與語言定位：** `docs/LOC_CANON.md`、`docs/LOC-language-theory.md` — 定義與責任，不由功能說明反向改寫。
- **分析機制：** `docs/LOC-AUTOMATIC-ANALYSIS.md` — Culture／Statistics／Search 如何遵守資料與決策邊界。
- **架構與 UI 契約：** `docs/DOMAIN_ARCHITECTURE.md`、`docs/NAV_GOVERNANCE.md`、`docs/CURRENT_UI_CONTRACT.md`。
- **權限、部署與遷移：** `docs/AUTHENTICATION.md`、`docs/DEPLOYMENT_OWNERSHIP.md`、`docs/DATABASE_MIGRATION.md`。
- **Current Packages List：** `docs/PACKAGES.md` — 核對實際 `package.json`／lockfile 的直接依賴、用途與測試工具；版本權威仍是 manifest／lockfile。
- **Repository 與發版治理：** `docs/REPO_DIRECTORY_GOVERNANCE.md`、`docs/RELEASE_ROADMAP.md`、`docs/TODO.md`。
- **LunaRunes 抽牌治理：** `docs/LUNARUNES_DRAW_GOVERNANCE.md`；Game runtime contract 仍由 `app/lrunes/game/README.md` 維護。

文件各守原有責任：深度功能說明不是第二份 Canon，Release/Review 歷史紀錄也不因 Current 更新而改寫。

> 系統幫你看見軌跡，但不替你決定你是誰。

---

## LunaRunes

LunaRunes is an independent Symbolic Language with its own Canon, Rune data, draw grammar and special routes.

### Current Rune structure

- 01–64: eight core groups.
- 65 玄 — Chaos.
- 66 命 — Fate.
- 第零符 德 — author baseline Rune; never part of the normal draw pool.

Directions are fixed as:

1. 正位
2. 半正位
3. 半逆位
4. 逆位

LunaRunes special semantics belong only to LunaRunes. They do not become general LOC Scope defaults.

### LunaRunes runtime data

Canonical runtime tables:

- `silver.runes`
- `silver.runes_etc`

Draw/runtime queries read only the Rune IDs, selected directions and data types actually needed for the current result. They do not preload every direction and slice in JavaScript.

### LunaRunes features

LunaRunes owns its own Draw, Daily, Rune Directory, Game and duel routes.

Its canonical deployment is:

- LunaRunes — https://lrunes.lo3rwang.cc/
- Alternate LOC mount — https://loc.lo3rwang.cc/lrunes/

### LunaRunes documents

- `docs/LUNARUNES_DRAW_GOVERNANCE.md`

LunaRunes Canon content, approved English names and Rune semantics are not rewritten by general UI localization or LOC Search behavior.

---

## Shared UI and repository rules

- Eight Themes each provide a complete palette.
- Fixed UI copy is centralized in `app/i18n/ui-copy.js`.
- Authored works, Galaxy content and LunaRunes Canon are outside UI-copy localization.
- Repository documentation is Current-only: one responsibility has one maintained source, with no superseded or duplicate parallel authority.
- New work starts from Current main; completed work is frozen after merge.

## Release documents

- `docs/RELEASE_ROADMAP.md`
- `docs/TODO.md`
- `governance/releases/v0.9.1-rc.1.md`
