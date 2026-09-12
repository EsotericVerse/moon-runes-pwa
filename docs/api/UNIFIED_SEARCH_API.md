# LOC Unified Search API v0.1

Unified Search is the orchestration layer for the `lo3rwang` personal language system.

It does **not** merge Canon ownership. Each LOC keeps its own authoritative data; this API normalizes retrieval results into one shared envelope.

## Endpoints

### `POST /search`

Example request:

```json
{
  "query": "自我治理",
  "top_k": 6,
  "content_type": "",
  "period": "",
  "era": "",
  "playlist": "",
  "category": "",
  "style": ""
}
```

Supported public content filters include oracle, rune records, lyrics, text/article, media, governance fragments, knowledge/FAQ, authored social archive sources and period/ERA records.

Shared result fields include:

```text
result_id
system_id
primary_loc
related_locs
content_type
title
summary
score
era_id
period
source_refs
payload
```

Scores remain source-local and must not be compared across modules as if produced by one normalized model.

### `GET /search/facets`

Returns shared content types, period/ERA registry labels and available facets for the advanced search UI. Public UI uses「時期」；stable machine IDs may remain `ERA-Px`.

## Current coverage

- LOC1: Lots/oracle + direct rune retrieval
- LOC2: Knowledge View; game corpus remains a specialist workflow
- LOC3: music/lyrics retrieval
- LOC4: work registry + authored Facebook/Threads life-writing sources
- LOC5: media registry
- LOC6: governance/政德風 registry; may cite LOC4 source text without owning it
- LOC7: FAQ/KM and registered knowledge assets
- LOC8: continuous period/evolution registry retrieval

Backend/runtime code remains under the legacy `card_api/` path until the service consumer audit is complete. API documentation authority is now `docs/api/`.

## UI

Primary integrated interface is `/search`. Specialist routes remain where they represent a distinct workflow. LunaRunes references should route through the canonical rune surface rather than retired `lots.html` pages.

## Graph RAG / Provenance

`POST /search` may return bounded `graph` and `provenance` information. Public graph traversal is bounded and does not expose the graph as a bulk corpus export.

Quality-weighted traversal uses governed edge quality, hop decay and a minimum traversal score. These values are governance weights, not model probabilities. The canonical graph contract remains the registered graph schema.

## Public Graph endpoint

### `GET /search/graph`

Without `node_id`, return metadata only. With `node_id`, return a bounded neighborhood at depth 1–3. Bulk export is not part of the public contract.

## Optional private social datasource

Private Facebook/archive text must not be committed to the public repository. When a private dataset is not mounted, private-source retrieval must fail explicitly rather than synthesize or expose archive text.
