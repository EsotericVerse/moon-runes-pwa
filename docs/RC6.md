# RC6｜Current Architecture Baseline

Date: 2026-09-23  
Status: Release Candidate baseline

RC6 is the current verified engineering baseline for the LOC / LunaRunes web system.

## Scope

RC6 fixes the Current architecture around four public functions:

- Context / 脈絡: Graph only.
- Culture / 文化: Time River only.
- Statistics / 統計: chart presentation only; no interpretation, ranking verdicts, or automatic definitions.
- Search / 搜尋: Scope-aware keyword/full-text retrieval.

Governance remains a shared Current presentation across LOC, LunaRunes, and lo3rwang until a later governance-specific split is intentionally introduced.

## Scope model

The Current public scopes are independent:

- LOC
- LunaRunes
- lo3rwang

Each Scope owns its own data authority. Cross-Scope features may read or link to another Scope, but do not acquire governance authority over it.

LOC does not maintain a separate third personal Period system. LOC Culture summarizes the current state of LunaRunes and lo3rwang and links into each Scope's own Time River.

## Neon as SSOT

Neon Postgres is the Current single source of truth for runtime content and structured data.

Current runtime must not use content JSON as a fallback, alias, registry key, or alternate authority.

The RC6 statistics snapshot contract is stored in:

- `silver.metric_snapshots`
- `silver.save_metric_snapshot(...)`

The schema migration is defined in:

- `docs/sql/metric-snapshots.sql`

The public runtime reads snapshots only. It does not recalculate or write aggregate metrics during page rendering.

Snapshot updates are watermark-based: a refresh writes only when the incoming `source_updated_at` is newer than the stored snapshot.

At RC6 baseline creation, the relation and function are installed in production and verified; initial snapshot rows may still be populated by the refresh process.

## Culture / Period anchors

Culture uses a WYSIWYG Time River.

Period rows may carry:

- `anchor_type`
- `anchor_role`
- `is_primary_anchor`
- `is_rc_zone`

The Time River renders the complete set of dated rows together. It does not hide periods behind pagination and does not infer, automatically re-cut, or silently replace user-defined boundaries.

Major anchors are explicit. RC zones may represent finer transition/version regions.

## Statistics

Statistics uses the existing ranking and metric data for visualization.

RC6 uses Recharts for chart rendering and supports multiple chart forms without attaching interpretive prose or automatic judgments.

When snapshot rows are available, ranking reads prefer `silver.metric_snapshots`. Existing ranking relations remain a compatibility fallback until snapshots are populated for every environment.

Homepage counters also read snapshot values rather than hard-coded corpus totals.

## Current terminology

LOC1–8 are retired from Current runtime architecture.

Current runtime identifiers use descriptive names instead of retired LOC-number identifiers. Historical documents may preserve older terminology as historical evidence, but it must not become a Current runtime dependency.

Likewise, `evolution` and KM are not Current public feature/domain names.

## Verified baseline

RC6 was validated against:

- main branch build
- GitHub Pages deployment
- production Neon project `LunaCodex`
- production branch `production`
- Project ID `restless-sky-20803706`
- Branch ID `br-restless-salad-b38eyn0q`

The RC6 core implementation commit was:

- `4128e9d5103d88424a0add94355cb6ace1e2f1bb` — anchors and metric snapshot integration

The final Current runtime naming cleanup reached:

- `e169ca7a54b57ad7dde3fc30e1f32b4c70593798`

Both the RC6 feature baseline and final main deployment completed successfully through GitHub Pages before this RC6 document was created.

## Non-goals

RC6 does not:

- expand LunaRunes keyword definitions;
- redesign admin or OAuth;
- introduce a new Period inference engine;
- restore JSON as a Current data source;
- reintroduce retired LOC1–8 runtime modules;
- reinterpret Statistics as analysis or judgment.

Those are separate future changes and must not be folded back into RC6 implicitly.
