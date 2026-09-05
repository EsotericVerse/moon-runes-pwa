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
- `LOC2_EVENT_REGISTRY.json`：LOC2 Scenario Corpus／Event Corpus；保存現行 Alpha Event 32 與情境語意角色。
- `LOC6_DUAL_RUNE_RELATION_REGISTRY.json`：雙符文中性關係庫；不含抽牌因／果角色與四向結果。

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

### F. LOC2 scenario / event corpus

路徑：`data/shared/LOC2_EVENT_REGISTRY.json`

- 來源：`loc2.html` 現行 Alpha Event 32。
- 角色：把 LOC2 Event 作為真實生活狀況的結構化情境語料，而非只當作遊戲效果。
- 雙卡 A → B 因果是 LOC2 的最小情境文法，可用於描述「狀況如何形成」。
- 現行 Event 的 SL／ML／NE／OC requirement signature 是 Alpha 快速判定資料，不等於固定符文雙卡映射。
- LOC2 保留 Event canonical ownership；LOC4／LOC6／LOC7／LOC8 可引用。
- 未由來源固定的符文配對不得由 registry 或 AI 自動補造。

### G. LOC6 dual-rune relation registry

路徑：`data/shared/LOC6_DUAL_RUNE_RELATION_REGISTRY.json`

- 角色：集中保存兩個符文之間的**中性語意關係**與來源案例。
- pair key 為無方向鍵；A＋B 與 B＋A 使用同一筆底層關係。
- 不保存「第 1 張＝因／第 2 張＝果」的抽牌角色；因果角色由 LOC1 雙卡抽牌 runtime 另外投影。
- 不在此層加入正位／半正／半逆／逆位；四向屬抽牌 interpretation layer。
- 可引用《命運句語法圖鑑》明確案例、LOC2 情境證據與實際解牌紀錄，但需逐筆保留 provenance。
- LOC2 的 group requirement 不是 rune pair，不得自動映射。

### H. LOC6 rune interpretation evidence

路徑：`data/shared/LOC6_RUNE_INTERPRETATION_REGISTRY.json`

- 來源：七篇《月語者》原始章節大綱。
- 規模：182 個章節槽位，其中 180 筆有明確三符文＋方位紀錄。
- 角色：保存「符文組合／方位／月相 → 實際章節敘事」的歷史實證，作為 LOC6 符文解析語料。
- LOC1 保留符文本體語意權威；LOC4 保留小說作品權威；LOC6 負責解析與意義實證；LOC8 可引用其作為創作軌跡。
- 原文中的舊符文名、異名或舊方位寫法保留於 raw 欄位，不靜默改寫。
- 第三篇 Ch5、Ch6 為已確認的特殊流程例外：武打大綱完成後直接交由 AI 展開，當時刻意未進行章節抽牌；因此標記為 `intentional_no_draw`，不是資料缺漏。

### I. Experimental / test JSON

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
