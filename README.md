# LOC｜Luna Codex

**Current version: 0.8.6-RC**

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
- Current route authority is the Next filesystem.
- Supabase PostgreSQL is the runtime data SSOT.
- The Scope registry owns deployment/navigation metadata only.
- `silver.manage` owns data Scope and Galaxy/Time table mapping.
- PostgreSQL remains the authoritative query layer for Scope, fixed eligibility flags, COUNT, date ranges and pagination across Search, Statistics and Culture.
- PostgreSQL handles global search, while confirmed keyword classifications are stored as fixed Galaxy attributes. Re-run the explicit batch only when the active Keyword Class or its rules change.
- Keyword classes are self-contained, UUID-addressable Scope resources. The active Class is selected by `current_keyword_class_id`; article results are stored as `class_id` + `group_lists`, and public Statistics/Culture read those attrs without live reclassification.
- Search is lexical/metadata search. Exact Scope aliases terminate with the Scope homepage entry; exact period style keywords prepend their configured short description and then continue normal related results.
- Missing general-Scope configuration remains empty; LOC does not borrow LunaRunes Canon, keywords or Style as fallback.

### Shared LOC features

| Feature | Responsibility |
| --- | --- |
| Statistics | Live distribution and time-range statistics |
| Culture | Time intersection, density, source grouping and Anchor analysis |
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

### LOC deployment

- LOC — https://loc.lo3rwang.cc/
- Author — https://loc.lo3rwang.cc/lo3rwang/
- Admin — https://admin.lo3rwang.cc/

### LOC documents

- `docs/LOC_CANON.md`
- `docs/LOC-AUTOMATIC-ANALYSIS.md`
- `docs/LOC-language-theory.md`
- `docs/DOMAIN_ARCHITECTURE.md`
- `docs/NAV_GOVERNANCE.md`
- `docs/REPO_DIRECTORY_GOVERNANCE.md`
- `docs/CURRENT_UI_CONTRACT.md`

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
