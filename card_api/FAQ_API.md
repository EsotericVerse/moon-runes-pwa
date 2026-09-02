# LOC7 FAQ API v0.1

LOC7 的第一個公開模組，以 40 題已確認 FAQ 切分為 62 個檢索片段。
模組與既有 FastAPI 服務共同部署，不修改 `/divination` 的抽牌流程。

## `POST /faq/search`

搜尋最相關的 FAQ 片段，`top_k` 可設定為 1–10。

```json
{
  "query": "第零符會抽到嗎？",
  "top_k": 5
}
```

回應包含相似度分數、FAQ／Chunk ID、問題、答案、分類與 Canon 版本。

## `POST /faq/ask`

檢索後以已確認的 FAQ 原文組合答案，並保留 `[FAQ-000-A]` 格式的依據標記。
目前採用不需外部 API 金鑰的 extractive 模式；資料不足時不自行推測。

```json
{
  "query": "LOC是什麼？要去哪裡使用？",
  "top_k": 5
}
```

## 實作方式

- 繁體中文文字正規化
- 1–4 字元 n-gram TF-IDF
- 問句、別名與關鍵詞混合加權
- 服務啟動時載入一次資料與索引
- 僅使用 Python 標準函式庫，不增加 Render 建置負擔

資料來源：`data/LOC_FAQ_RAG_v0.1.json`
