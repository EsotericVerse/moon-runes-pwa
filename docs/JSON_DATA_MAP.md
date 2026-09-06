# LOC JSON Data Map

**Status:** Current  
**Updated:** 2026-09-07

此文件說明 repository 內 JSON 的**角色、權威與同步方向**。完整目錄契約見 [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) 與 [REPOSITORY_GOVERNANCE.md](./REPOSITORY_GOVERNANCE.md)。

## 1. 統一資料目錄

~~~text
data/json/
├─ core/
├─ registries/
├─ search/
├─ generated/
├─ archive/
└─ experimental/
~~~

資料依「角色與生命週期」分類，不依副檔名或 LOC 編號無差別堆放。

## 2. Core — 月符正式 runtime projection

路徑：`data/json/core/`

| 檔案 | 用途 | 上游權威 |
|---|---|---|
| `runes64.json` | 基本符文 lookup；名稱、群組、月相、關鍵詞、四向 | `LunaRune64.xlsx` |
| `rune_interpretations.json` | 64 核心符文 × 四向 × 現實月相的展開解讀 | `LunaRune64.xlsx` / governed derivation |
| `lots.json` | 66 可抽符文的籤詩 projection | `LunaRune64.xlsx#Lots` |
| `three_card_combinations.json` | 三卡方向組合規則 | LOC1 interpretation rules |

`LunaRune64.xlsx` 仍是最高優先母資料。Core JSON 是程式唯一正式投影，不得反向覆寫母資料。

> 同一資料只保留一份正式 projection；不同需求讀不同專用檔，不再建立整套全包副本。

### Core 並不等於「所有 JSON 固定化」

只有資料量較大、來源權威明確、結構成熟、runtime 需要穩定讀取，而且不應由下游各自手動修改的資料，才適合進 `core/`。

會持續調整的治理資料，例如 ERA、Graph Schema、Rights、Governance、KM Registry、Relation/Evidence Registry，仍放在 `registries/`，透過版本與治理流程正常演化。

~~~text
大型成熟穩定資料 → core projection
小型持續治理資料 → registries
檢索衍生資料     → search
可重建結果       → generated
歷史版本         → archive
研究資料         → experimental
~~~

## 3. Registries — 結構化治理與跨 LOC 關係

路徑：`data/json/registries/`

主要包括：

- `LOC_SHARED_MANIFEST.json`
- `LOC_DATA_GOVERNANCE.json`
- `LOC_SHARED_SCHEMA.json`
- `LOC_REFERENCE_MODEL.json`
- `LOC_CONTENT_RIGHTS_POLICY.json`
- `LOC_LANGUAGE_SYSTEM_REGISTRY.json`
- `LOC_ERA_REGISTRY.json`
- `LOC_GRAPH_SCHEMA.json`
- `LOC_CROSS_RELATIONSHIP_REGISTRY.json`
- LOC1–8 各責任域的 Registry / Evidence / Analysis 結構

Registry 保存**關係、權責、狀態與 provenance**，不應為方便查詢而複製另一權威來源的完整 payload。

## 4. Search — 檢索專用 View

路徑：`data/json/search/`

### FAQ

- `search/faq/LOC_FAQ_v0.4.json`：現行 FAQ source view。
- `search/faq/LOC_FAQ_RAG_v0.4.json`：現行 retrieval derivative。

FAQ / RAG 是 KM View，不是 Canon。

### LOC3

- `search/loc3/LOC3_LYRICS_SEARCH_v0.1.json`
- shard / manual overlay 依同一 domain 集中
- `LOC3_MEDIA_LINKS_v0.1.json` 只作 legacy compatibility overlay；LOC5 媒體 canonical ownership 在 `registries/LOC_MEDIA_REGISTRY.json`

Search data 可以為 retrieval 最佳化，但不得變成新的語義母資料。

## 5. Generated — 可重建衍生資料

路徑：`data/json/generated/`

目前主要承接 LOC6 Threads：

- article index
- document manifest
- ERA / P0 analysis baseline
- compressed main-post shards

Generated output 應有 upstream provenance。可以重建的資料，不應因方便而升格 Canon。

## 6. Archive — 歷史版本

路徑：`data/json/archive/`

目前保存 FAQ / RAG v0.1–v0.3。

規則：

- 保留 provenance 與歷史比較價值。
- Current runtime 不得 silent fallback 到 archive。
- 舊版本不因新版本發布而被改寫。

## 7. Experimental — 研究資料

路徑：`data/json/experimental/`

目前 `experimental/engine/` 保存：

- `runes_extended.json`
- `rune_interpretations_filled.json`
- training / sentence / meta 等研究輸出

`engine/` 本身只保存實驗程式。它直接讀 `core/` 的正式 rune projection，不再維護另一份完整月符副本。

## 8. Configuration JSON 例外

以下是 configuration，不屬資料層：

- root `manifest.json`：PWA configuration
- `integrations/google_apps_script/loc8/appsscript.json`：Apps Script configuration

因此規則是「集中 data JSON」，不是無差別搬移所有 `.json`。

## 9. 資料同步方向

~~~text
Canonical / mother source / original evidence
                ↓
        governed projection
                ↓
      core / registries
          ↓          ↓
       search     generated
          ↓          ↓
          API / UI / Graph
                ↓
           analysis
~~~

下游 Search、Graph、UI、AI、experimental output 不得反向覆寫上游 authority。

## 10. Python Path Contract

正式 Python 程式統一使用 `card_api/paths.py`：

- `core_json(name)`
- `registry_json(name)`
- `search_json(domain, name)`
- `generated_json(...)`
- `archive_json(...)`
- `experimental_json(...)`

新增程式不應重新硬編一套 repository path。

## 11. Governance / KM 對應

- Repository 結構治理：`docs/REPOSITORY_GOVERNANCE.md`
- Data projection 治理：`docs/DATA_ARCHITECTURE.md`
- LOC 共用治理：`docs/LOC_GOVERNANCE_CORE.md`
- Copyleft：`COPYLEFT.md`
- Knowledge Asset indexing：`data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json`

## 12. Migration 完成條件

移動資料檔案時，以下必須在同一 migration 中更新：

1. Python
2. JavaScript
3. HTML fetch URL
4. Registry / provenance path
5. Service Worker cache
6. GitHub Actions workflow
7. docs / KM
8. tests

最後執行 `card_api/scripts/validate_repo_layout.py`，舊路徑引用必須為零。

---

**Data rule:** 一個檔案應只有一個清楚角色、一條權威鏈，以及一個值得存在的理由。
