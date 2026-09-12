# LOC JSON Data Policy

## Authority

`data/json/core/runes.json` is the highest-level canonical LunaRunes dataset.

- Manual updates to `runes.json` are authoritative.
- Runtime/build adapters may derive shapes, indexes, group metadata, or caches from it.
- Generated data must never overwrite or redefine canonical rune rows.
- Legacy `runes64.*` / `runes66.*` projections must not become alternate canonical sources.

## Directory responsibilities

### `core/`
Small, stable semantic datasets required by the model/runtime.

- `runes.json`: canonical rune definitions; highest authority.
- `lots.json`: Lots/oracle domain data; semantically separate from rune definitions.
- `rune_grammar.json`: grammar/rule data.
- `rune_interpretations.json`: interpretation data; large, load only when required.
- `three_card_combinations.json`: multi-rune combination data.

A file being in `core/` does not grant it authority over fields owned by `runes.json`.

### `registries/`
Structured registries and catalogues. Load by feature; do not preload all registries at application startup.

### `search/`
Search-specific indexes and shards. These are delivery structures, not Canon. Keep them split when splitting reduces first-load or per-query transfer.

### `generated/`
Rebuildable projections, corpus shards, statistics and snapshots. Generated files may be deleted or regenerated when their source and generator remain available and no runtime consumer depends on the old projection.

### `derived/`
Small deterministic derivatives from canonical/registry data. Never treat derived values as a replacement source for Canon.

### `sources/`
Imported/raw source material used to build searchable or structured data. Source material is not loaded by normal application startup.

### `archive/`
Historical material only. Runtime code must not depend on archive paths.

### `experimental/`
Non-canonical experiments. Production runtime must not depend on these files unless they are promoted through governance first.

## Loading policy

1. Do not split `runes.json` merely to reduce file count or create parallel sources. It is small enough to remain a single canonical dataset.
2. Heavy data such as interpretations, corpora, search indexes, graphs and statistics should be loaded only by the feature that needs them.
3. LOC Next views share the loader/cache in `app/loc/data.js`; do not add independent duplicate fetch layers inside individual views.
4. Keep request concurrency bounded. More shards must not mean unbounded parallel requests.
5. Prefer browser/CDN cacheable static JSON over repeatedly generated runtime responses.
6. A new JSON file must have one clear role: canonical source, registry, source, derived projection, generated projection, or search shard.
7. Before deleting a projection, migrate its consumers and verify the build/runtime path first.
