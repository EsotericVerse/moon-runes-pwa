# LOC RC8 Stable Baseline

**Status:** Release Candidate 8 baseline frozen  
**Freeze date:** 2026-09-29 (Asia/Taipei)  
**Baseline parent:** `f1385e573d65d937edd855685b16dcd47b622338`

RC8 is the stable candidate baseline for the Current LOC architecture. This freeze records the state after RC8 structural consolidation, LunaRunes Game first graphical pass, shared editor consolidation, dynamic loader cleanup, and restoration of LunaRunes single/daily guidance from the canonical Neon model.

## RC8 invariants

- Neon Postgres is the Current SSOT.
- Current runtime does not use JSON / legacy JS / static snapshots as authority or fallback.
- Retired LOC1–8 runtime architecture, compatibility facades, old path loaders, persistent corpus cache, ranking snapshots, and runtime text-index cache do not return.
- Shared dynamic loading remains incremental; normal content uses 20-item batches and LunaRunes targets use 16-item batches where that contract applies.
- Galaxy identity uses `uid` as the primary key in both Galaxy tables.
- Empty-body Galaxy records are not valid text works; pure media belongs to media governance rather than being fabricated as text content.
- Shared display heading behavior is centralized: title first, short body fallback, unnamed only when neither exists.
- Lunar/date behavior is fixed to `Asia/Taipei`.
- Rune draw ritual timing and sequential random draw behavior remain verifier-protected.
- LunaRunes core data comes from `silver.runes` and `silver.runes_etc`.
- For runes 1–64, `silver.runes_etc` contains complete 4-direction sets for `direction`, `lots`, and `daily` (256 rows each).
- Single and Daily guidance are loaded after the draw for only the selected rune(s); the full guidance matrix is not loaded up front.
- `/game` first graphical RC8 pass remains intact and reads canonical Neon data.

## Verification at freeze

The baseline immediately before this freeze passed the Current deployment pipeline, including:

- RC contract verification
- public Neon data/API verification
- Next static export
- GitHub Pages deployment

## Management-page boundary

Governance/Admin management pages have not yet received final manual UI review by the author. This is explicitly recorded as post-freeze manual validation, not as an unfinished RC8 Current migration blocker.

If that review finds management-page defects, corrections should be narrow and preserve the RC8 data/runtime invariants above. A defect that demonstrates actual data loss, incorrect authority, or broken Current runtime semantics may justify revisiting the baseline; ordinary UI/editor corrections do not.

## Change policy after RC8

RC8 is a reference point. New features, deeper Game rules, wider corpus stress tests, locale expansion, semantic-display experiments, and management UX refinements belong after this baseline unless they are required to correct a verified regression.
