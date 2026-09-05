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

Supported public content filters in v0.1:

- `rune_record` — LOC1
- `lyrics_work` — LOC3
- `reel` / `video` — LOC5 media references
- `faq` — LOC7 Knowledge View
- `era` — LOC8 temporal registry
- blank / `all` — query all live sources

Response groups:

```text
groups.runes      LOC1
groups.works      LOC3
groups.media      LOC5
groups.knowledge  LOC7
groups.timeline   LOC8
```

Each result uses shared reference fields where available:

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

Scores remain source-local. Do not compare a LOC3 score numerically against a LOC7 or LOC8 score as if they came from the same model.

### `GET /search/facets`

Returns shared content types, ERA labels and currently available LOC3 facets for the advanced search UI.

## Current coverage

| LOC | Unified Search v0.1 |
|---|---|
| LOC1 | Direct rune retrieval |
| LOC2 | Knowledge View only; direct game corpus pending |
| LOC3 | Direct lyrics/music retrieval |
| LOC4 | Shared registry ready; corpus import pending |
| LOC5 | Direct media references through shared media registry |
| LOC6 | Shared registry ready; direct corpus pending |
| LOC7 | Direct FAQ/KM retrieval |
| LOC8 | Direct ERA retrieval |

The system intentionally returns no fabricated LOC4/LOC6 corpus results until those corpora are imported.

## UI

Primary integrated interface:

- `/search.html`

Specialist views remain available where they still represent distinct workflows:

- `/faq.html`
- `/list.html`
- `/life.html`

`/loc3.html` is now a compatibility redirect to `/search.html?content_type=lyrics_work`. LOC3 remains the canonical music/lyrics data authority, but search presentation is consolidated into Unified Search.

This preserves deep/specialized workflows while providing one default semantic entry point.
