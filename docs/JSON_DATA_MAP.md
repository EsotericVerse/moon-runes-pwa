# LOC JSON Data Map

**Status:** Current  
**Updated:** 2026-09-05

此文件說明 repository 內 JSON 的角色，不以「全部 JSON 都是資料庫」處理。

## 1. 分類

### A. Shared registries — 結構化治理層

路徑：`data/shared/*.json`

用途：跨 LOC 共用的 schema、registry、分類、媒體／ERA／KM 對應與 Unified Search metadata。

重要檔案：

- `LOC_KNOWLEDGE_ASSET_REGISTRY.json`：KM 可索引知識資產與 provenance。
- `LOC_KM_KEYWORDS.json`：關鍵詞與 aliases；**檢索輔助，不是 Canon 定義本身**。
- `LOC7_LINGUISTIC_ANALYSIS_REGISTRY.json`：LOC7 語言結構分析 registry。
- `LOC_SHARED_MANIFEST.json`：shared registry 索引。
- `LOC_LANGUAGE_SYSTEM_REGISTRY.json`：語言系統 registry。
- `LOC_ERA_REGISTRY.json`：ERA／時期 registry。
- `LOC_CONTENT_TYPE_REGISTRY.json`：內容類型 registry。
- `LOC_MEDIA_REGISTRY.json`：LOC5 媒體對應。

### B. FAQ source view — 維護型問答資料

路徑：`card_api/data/LOC_FAQ_v0.3.json`

- 現行：v0.3，80 題。
- 角色：KM 的 FAQ 問答 View。
- 不得取代 Canon／母資料。
- v0.1、v0.2 為歷史版本。

### C. RAG retrieval derivative — 檢索衍生資料

路徑：`card_api/data/LOC_FAQ_RAG_v0.3.json`

- 來源：`LOC_FAQ_v0.3.json`
- 角色：原子化 retrieval chunks。
- Runtime：目前 `card_api/main.py` 載入 v0.3。
- v0.1、v0.2 為歷史版本。
- 更新 FAQ source 後，RAG 應重新產生／同步，不反向手改成新的 canonical source。

### D. LOC1 runtime / derived data

例如：

- `card_api/new_runes.json`
- `card_api/runes_all_data.json`
- `card_api/three_card_combinations.json`
- `data/shared/lots.json`

此類資料須依符文 Canon 與 `LunaRune64.xlsx` 的治理鏈判定。對符文核心定義而言，`LunaRune64.xlsx` 仍為最高優先母資料；runtime JSON 不得反向覆寫。

### E. LOC3 / LOC5 search data

例如：

- `card_api/data/LOC3_LYRICS_SEARCH_v0.1.json`
- legacy `LOC3_MEDIA_LINKS_v0.1.json`
- shared `data/shared/LOC_MEDIA_REGISTRY.json`

媒體 canonical ownership 屬 LOC5；LOC3 可引用 media linkage。現行程式應優先 shared media registry，legacy overlay 僅作 compatibility fallback。

### F. Experimental / test JSON

`engine/`、tests 或 temporary data 中的 JSON，除非另有 registry 與 authority 宣告，預設屬實驗／測試／中間產物，不升格為 Canon。

## 2. 同步方向

```text
Canon / XLSX / original source
          ↓
maintained Markdown / shared registry
          ↓
FAQ source JSON
          ↓
RAG / embeddings / indexes
          ↓
API / UI
```

## 3. 版本規則

- 新版本建立新檔名；不以 v0.3 內容覆寫 v0.2。
- Runtime 必須明確指向 current version。
- Historical file 保留 provenance。
- Registry 可指向 current 與 historical assets，但需有 `status`。
- 任何 AI 產生的結構化內容，在人工確認前最多標記 `Working`／`Proposed`。

## 4. Current runtime checkpoints

截至 2026-09-05：

- FAQ runtime source：`LOC_FAQ_RAG_v0.3.json`
- FAQ parent view：`LOC_FAQ_v0.3.json`
- KM maintainable core：`docs/LOC7_KM.md`
- Rune mother data：`LunaRune64.xlsx`

這些角色不可互相混寫。
