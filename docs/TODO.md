# LOC TODO Ledger

## RC8 Current close-out — CLOSED

- [x] Neon Postgres is the Current SSOT.
- [x] Current runtime no longer uses JSON / JSONB content authority, JSON shard fallback, or old JS/data reverse-read.
- [x] Legacy Render-memory workarounds, persistent corpus cache plans, IndexedDB shared-data cache plans, ranking snapshot tables, and materialized-cache plans are retired from the Current architecture.
- [x] Shared runtime reads canonical Neon relations directly through the repository/query layer.
- [x] Statistics and rankings are calculated from Current canonical data; they are not stored as duplicate ranking snapshots.
- [x] FlexSearch runs with its own cache disabled. Its runtime index is transient search working memory, not Current data authority or persistent cache.
- [x] TanStack Query is used for React query lifecycle/state; it is not a second SSOT.
- [x] Search, Culture, Statistics, Context, Daily, and multimedia metadata use the Current Neon-backed module path.
- [x] Multimedia is a first-class language extension layer. Media metadata may participate in Search, Culture, and Statistics without requiring the original asset URL.
- [x] Production Neon has no Current cache table, ranking table, or materialized view used to duplicate the corpus.
- [x] Old JSON/cache/shard TODO items are retired and no longer count as RC8 work.
- [x] LunaRunes Game RC8 pre-close pass completed: Game code/docs/assets are consolidated under `app/lrunes/game/`; the UI uses the existing Rune card, group, Event, and author visuals; Game rune reads are fixed to `silver.runes` + `silver.runes_etc`.

## Current open blockers

None recorded. RC8 Current close-out is closed.

## RC8 post-freeze manual validation

- [ ] Manually review Governance / Admin management pages and edit flows.
- [ ] Any management-page defect found after this baseline is a focused UI/management correction unless it exposes a data-integrity or runtime-authority defect.
- [ ] Do not reopen retired JSON/cache/legacy runtime architecture while correcting management UI.

## RC9 — existing-function completion

RC9 is the final release candidate. It does not expand the product boundary; it completes and stabilizes the functions already present in Current.

- [ ] Complete manual review and correction of Governance / Admin management pages and edit flows.
- [ ] Broaden use of installed modules where they fit existing functions cleanly, replacing unnecessary hand-built infrastructure without changing the Current SSOT or feature meaning.
- [ ] Finish LunaRunes interpretation sentence handling so single, Daily, multi-card, and related guidance use the intended existing sentence rules consistently.
- [ ] Finish LunaRunes keyword handling, including the canonical keyword library, rule handling, management flow, Search/Statistics use, and consistency with current rune definitions.
- [ ] Complete LunaRunes Game rules, graphical interface, interaction flow, and placement/configuration as part of RC9.
- [ ] Consolidate existing interface configuration so shared layout and feature placement do not depend on page-specific exceptions.
- [ ] Re-run existing-function regression checks after those changes and preserve the RC8 runtime/data invariants.

RC9 closes when the existing functional surface is complete enough that remaining work is multimedia/image integration and final visual stabilization.

## 1.0 Release — multimedia, extensibility, and visual stabilization

**Hard release gate:** OAuth-authorized managed import must be operational, including two-layer text/link parsing. 1.0R cannot be closed without it.

There is no RC10. After RC9, the next release target is **1.0 Release (1.0R)**. Working target: **2026-10-15**.

- [ ] Integrate image multimedia already present in source material, especially Facebook, Threads, Instagram, and other existing media-bearing records.
- [ ] Preserve multimedia as first-class media/reference data; do not fabricate empty text works to represent images.
- [ ] Connect image metadata and relationships to the existing Galaxy / Media / Search / Culture / Statistics model where appropriate.
- [ ] Stabilize all graphical pages and visualizations across the existing LOC, LunaRunes, author, management, Culture, Statistics, graph/timeline, Daily, and Game surfaces.
- [ ] Make ordinary Scope/Group extension work through the shared architecture without requiring bespoke core implementation.
- [ ] Make ordinary Scope/Group governance and feature setup achievable through simple Admin configuration.
- [ ] Verify shared permissions, navigation, feature mounting, and visual conventions remain coherent when Scope/Group instances are extended.
- [ ] Make the Admin import flow operational for governed text/link ingestion.
- [ ] Require a valid OAuth-backed source authorization before import is available.
- [ ] Restrict import execution to Scope managers and Admin; non-manager Scope users cannot use the importer.
- [ ] Require the importing user to affirm they have the necessary right/authorization to import/use the selected content; record the authenticated source/provenance without treating OAuth itself as copyright certification.
- [ ] Default all newly imported records to private/non-public visibility; publishing is a separate explicit management action.
- [ ] Preserve source name, source-native identity, original link, and other available provenance on import.
- [ ] Enforce traversal/usage limits so the importer cannot be used as a bulk backup or mirroring service.
- [ ] Add a basic OAuth-capable authenticated page reader for approved/imported pages: read page text and links, then follow only directly linked pages; limit traversal to two total layers (start page + one linked-page layer), with no deeper recursive crawl.
- [ ] Route imported text, links, source identity, duplicate checks, and relationships through the existing governance/import pipeline and Neon SSOT.
- [ ] Deliver the author's private personal-analysis app alongside 1.0R, sharing the governed Current data model rather than a separate corpus authority.
- [ ] Complete final regression, responsive, loading, and failure-state checks for the visual application.
- [ ] Freeze the resulting build as **1.0 Release (1.0R)**.

## Version policy

- RC8 = stable architecture/data/runtime baseline.
- RC9 = final candidate for existing-function completion and language/keyword quality.
- RC10 = **not used**.
- 1.0 Release = multimedia image integration + Scope/Group maturity + governed Admin import/OAuth two-layer page parsing + private personal-analysis app + complete graphical-page stabilization + final release validation.

