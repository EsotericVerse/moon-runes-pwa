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

Supported public content filters in v0.1 include:

- `oracle` — LOC1 籤詩／單符問事
- `rune_record` — LOC1 月符資料
- `lyrics_work` — LOC3 音樂／歌詞
- `text_work` / `article` — LOC4 文字作品
- `reel` / `video` / `multimedia` — LOC5 media registry
- `governance_fragment` — LOC6 治理／政德風語料
- `knowledge` / `faq` — LOC7 KM／FAQ
- `era` — LOC8 時期 registry（公開顯示為「時期」，machine ID 仍可使用 ERA-Px）
- blank / `all` — query all live sources

Response groups:

```text
groups.oracle         LOC1 Lots / 問事
groups.runes          LOC1 月符
groups.works          LOC3 音樂
groups.textworks      LOC4 文字
groups.relationships  Cross-LOC relationships
groups.governance     LOC6 治理／政德風
groups.media          LOC5 媒體
groups.knowledge      LOC7 KM / FAQ
groups.timeline       LOC8 時期
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

Returns shared content types, period/ERA registry labels and currently available facets for the advanced search UI. Public UI uses「時期」；stable machine IDs may remain `ERA-Px`.

## Current coverage

| LOC | Unified Search v0.1 |
|---|---|
| LOC1 | Live: Lots/oracle + direct rune retrieval |
| LOC2 | Knowledge View only; direct game corpus not yet routed as its own result group |
| LOC3 | Live: direct lyrics/music retrieval |
| LOC4 | Live: direct work registry search |
| LOC5 | Live: direct media registry search |
| LOC6 | Live: direct governance/政德風 registry search |
| LOC7 | Live: FAQ/KM and registered knowledge assets |
| LOC8 | Live: continuous period registry retrieval |

Current backend coverage is reflected by `unified_search.py`. Shared search does not change canonical ownership, and source-local scores are not globally normalized.

## UI

Primary integrated interface:

- `/search.html`

Specialist views remain available where they still represent distinct workflows:

- `/faq.html`
- `/list.html`
- `/life.html`

`/loc3.html` is now a compatibility redirect to `/search.html?content_type=lyrics_work`. LOC3 remains the canonical music/lyrics data authority, but search presentation is consolidated into Unified Search.

This preserves deep/specialized workflows while providing one default semantic entry point.

## Graph RAG / Provenance

`POST /search` 現行回傳 `graph` 與 `provenance`。

- `graph`：Canonical Graph RAG 的 bounded traversal 結果，預設深度 2、最多 3 hop。
- `provenance.source_refs`：搜尋命中資料的來源引用彙總。
- `provenance.graph_evidence_kinds`：本次遍歷使用的 graph evidence 類型與數量。
- `provenance.graph_evidence_status`：recorded / deterministic 等 evidence status 統計。
- LOC8 的 repository Event／Daily Rune snapshot 可進公開時間圖；live Google Sheet `Relation` 的 private rows 不會由公開 Search API 直接輸出。

這個界線確保 `life.html` 可以保有私人 Relation Library，同時讓公開 `search.html` 使用已治理、可追溯的 Graph RAG。
