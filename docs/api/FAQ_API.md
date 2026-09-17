# LOC FAQ API

LOC FAQ／RAG 的公開 API。現行 runtime 採 **v0.4 base + v0.5 Current overlay**：v0.4 保留完整歷史問句、aliases 與 retrieval base；`LOC_FAQ_v0.5.json` 在建立索引前套用 Current category、answer 與術語語意。

這個分層用來同時保留 provenance 與 Current Canon：舊 LOC1–8 問法仍可搜尋，但不得因此恢復 LOC 編號的 Current ownership。

FAQ 是可維護的問答 View，RAG JSON 是檢索衍生資料；KM 固定指 Knowledge Management／知識管理。FAQ、RAG、Search 與 KM 不互相等同，也都不得取代 Canon、Master Data、Registry 或原始作品。

## `POST /faq/search`

搜尋最相關的 FAQ 片段，`top_k` 可設定為 1–10。

```json
{
  "query": "第零符會抽到嗎？",
  "top_k": 5
}
```

回應包含相似度分數、FAQ／Chunk ID、問題、Current answer、Current category 與 Canon 版本。

## `POST /faq/ask`

檢索後以已確認的 Current FAQ 答案組合回應，並保留 `[FAQ-000-A]` 格式的依據標記。
目前採用不需外部 API 金鑰的 extractive 模式；資料不足時不自行推測。

```json
{
  "query": "LOC是什麼？要去哪裡使用？",
  "top_k": 5
}
```

## 實作方式

1. 載入 `LOC_FAQ_RAG_v0.4.json` 作歷史／base retrieval dataset。
2. 優先載入 `LOC_FAQ_v0.5.json` 作 Current semantic overlay；若不存在才使用舊 `LOC_FAQ_CANON_OVERRIDES.json` compatibility fallback。
3. 套用 Current phrase replacements、category 與 answer。
4. 重新以 Current question／aliases／keywords／answer 建立 `retrieval_text`。
5. 使用繁體中文正規化與 1–4 字元 n-gram TF-IDF 檢索。

僅使用 Python 標準函式庫，不增加 Render 建置負擔。

資料：
- Base FAQ：`../../data/json/search/faq/LOC_FAQ_v0.4.json`
- Base RAG：`../../data/json/search/faq/LOC_FAQ_RAG_v0.4.json`
- Current overlay：`../../data/json/search/faq/LOC_FAQ_v0.5.json`
- Compatibility fallback：`../../data/json/search/faq/LOC_FAQ_CANON_OVERRIDES.json`
