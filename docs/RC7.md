# RC7｜Current Architecture Baseline

Date: 2026-09-27  
Status: Release Candidate baseline  
Web Build: 1.0-RC7

RC7 freezes the current verified LOC / LunaRunes web architecture as the next engineering baseline after RC6.

## Baseline

RC7 keeps the Current architecture centered on:

- Context / 脈絡: 2D relationship graph.
- Culture / 文化: 2D Time River.
- Statistics / 統計: rankings, keyword/source/style settings, and statistical charts.
- Search / 搜尋: Scope-aware FlexSearch over Neon canonical data.
- Governance / 治理: public governance content remains separate from data authority.

The model may represent multiple dimensions including time, but the Current UI does not require a 3D renderer.

## Data authority

Neon Postgres remains the Current single source of truth.

- No JSON / JSONB Current content authority.
- No old JS/data reverse-read fallback.
- No retired LOC1–8 runtime authority.
- Dynamic views read Current canonical tables directly.
- Historical material may remain as history without becoming a fallback.

## Scope

LOC, LunaRunes, and lo3rwang remain independently governed Scopes.

Cross-Scope navigation, statistics, search, or visualization may reference another Scope without acquiring its governance authority.

## Culture and time

Culture remains a 2D Time River.

- Source and Style are both classification views of the Time River.
- Current is a period state / selection rule, not a separate visualization.
- User-defined anchors and periods remain authoritative.
- The existing Current confluence visualization is retained.

Period configuration itself is a settings concern and is not the Time River.

## Current UI rendering

The obsolete 3D runtime modules and dependencies were removed before RC7.

Current visualization packages are used according to function:

- vis-network: 2D network views.
- vis-timeline: time-oriented views where appropriate.
- Recharts: statistical charts.
- FlexSearch: text search indexing.

## Loading semantics

RC7 distinguishes loading state from empty data state.

Pages should not report “目前沒有資料” while the query is still pending. Large reads may instead show that data is being loaded and can require additional time.

## Version boundary

RC7 is a checkpoint of the Current implementation at the time it was declared.

Baseline content commit immediately before the RC7 version marker:

- `7bebadc9ce83817973d33a8ddada2939c92e5b87` — Move governance login below public content

Later management-page restructuring, Scope basic-data controls, Theme placement, OAuth operation logging, and other management refinements are follow-up changes unless explicitly committed into RC7 afterward.

## Historical baseline

RC6 remains preserved in `docs/RC6.md` as the previous engineering baseline.

