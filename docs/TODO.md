# LOC TODO Ledger

## RC8 Current close-out

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

## Current open blockers

None recorded.

## Next stage — not an RC8 close-out blocker

The next engineering pass is a module-usage audit rather than feature completion:

- Review installed modules and use them where they replace hand-built infrastructure cleanly.
- Remove direct dependencies that Current code does not use directly.
- Select mature media-management / metadata modules for image, audio, and video ingestion instead of building media parsing logic inside LOC.
- Keep LOC responsible for normalization, relationships, time/place metadata, governance, Search/Culture/Statistics integration, and Neon persistence.

Long-range family-scale corpus work, locale expansion, semantic-display experiments, and Game UI evolution are future product directions. They are not unfinished RC8 migration work and must not reintroduce retired JSON/cache architecture.
