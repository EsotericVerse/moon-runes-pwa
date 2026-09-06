# LOC Documentation Index

> LOC／月典文件入口。此目錄採 **Markdown-first, structured-data-native** 原則。

## 文件治理

- Markdown（`.md`）：可維護、可 diff、可搜尋、可被 KM／Agent 直接讀取的主要知識文件。
- JSON：結構化 Registry、檢索資料、應用資料；依各自 authority 與 provenance 治理。
- XLSX：結構化母資料；`LunaRune64.xlsx` 仍是符文資料的最高優先母資料。
- DOCX／PDF：僅保留仍有實際用途的 Canon、語法圖鑑、列印或交換文件；不因放在 `docs/` 就自動成為最高權威。
- 應用輸出與 AI 推論不得反向覆寫 Canon 或母資料。

## 新手教學

| 文件 | 用途 | 狀態 |
|---|---|---|
| [LOC_Tutorial_01_語言系統框架入門.pdf](./LOC_Tutorial_01_語言系統框架入門.pdf) · [Web View](../tutorial01.html) | 新手教學 01：從 LOC 定位、LOC1 月之符文、符文演化到 LOC1–8 功能責任區的語言系統框架入門 | Published tutorial + Web view |

## 主要文件

| 文件 | 用途 | 狀態 |
|---|---|---|
| [LOC3_PERIOD_KEYWORD_ANALYSIS.md](./LOC3_PERIOD_KEYWORD_ANALYSIS.md) | LOC3 依 LOC8 連續時期統計歌曲關鍵字、轉折、情緒功能與結尾狀態 | Working |
| [LOC_CURRENT_STATE_AND_DEMO_ROADMAP.md](./LOC_CURRENT_STATE_AND_DEMO_ROADMAP.md) | LOC 現行基本定義、Demo 架構、LOC1–8 責任、LOC8 時期／事件／時間統合與下一步 | Current / Working |
| [LOC2_SCENARIO_MODEL.md](./LOC2_SCENARIO_MODEL.md) | LOC2 真實情境／雙卡因果與 Event Corpus 定位 | Working |
| [LOC_GOVERNANCE_CORE.md](./LOC_GOVERNANCE_CORE.md) | LOC 共用中立治理核心、CRUD／異議／邊界／版本與治理 Audit 基準 | Current / Governance Baseline |
| [LOC_GOVERNANCE_HISTORY_AND_TRENDS.md](./LOC_GOVERNANCE_HISTORY_AND_TRENDS.md) | LOC 治理思想歷史、語彙變化與自我治理趨勢分析 | Working Historical Analysis |
| [LUNA_RUNES_66_GOVERNANCE_DESIGN.md](./LUNA_RUNES_66_GOVERNANCE_DESIGN.md) | 月之符文66的平等使用、界／域、礦物組、悟與演化治理設計觀點 | Current Design Interpretation |
| [LOC6_ZHENGDE_STYLE.md](./LOC6_ZHENGDE_STYLE.md) | 政德風治理核心、代表句、風格演變與 Stage Profile 規則 | Current / Working |
| [LOC7_KM.md](./LOC7_KM.md) | LOC7 Knowledge Management 核心治理文件 | Current |
| [LOC_SIMPLE_TEXT_ANALYSIS_API.md](./LOC_SIMPLE_TEXT_ANALYSIS_API.md) | LOC 內建簡易文字解析／分類 API：Local First、無外部 API Key 依賴，建立關鍵字庫與趨勢資料 | Current |
| [LOC8_KM.md](./LOC8_KM.md) | LOC8 ERA／Event／Relation／Context 判定與治理邏輯 | Working |
| [JSON_DATA_MAP.md](./JSON_DATA_MAP.md) | JSON 資料角色、來源與同步規則 | Current |
| [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) | core / registries / search / generated / archive / experimental 資料架構與月符 projection 規則 | Current |
| [REPOSITORY_GOVERNANCE.md](./REPOSITORY_GOVERNANCE.md) | Repository 模組化、路徑 migration、刪除／archive 與 CI 配置治理 | Current |
| [Copyleft Policy](../COPYLEFT.md) | Luna Codex／LOC 的 Copyleft、衍生與 provenance 治理 | Current |
| `LOC_Canon.docx` | Canon 文件版本之一 | Canon document |
| `LunarRunesCardCut.pdf` | 月符實體卡列印檔 | Published artifact |

## KM 最小資料流

```text
Canon / mother source / original works
        ↓
Markdown knowledge documents
        ↓
Registries / core projections / FAQ source data
        ↓
RAG chunks / search indexes / application views
        ↓
UI / API / AI answer
```

下游資料不得反向改寫上游定義。

## 狀態詞

- **Canonical**：已進 Canon 或指定母資料。
- **Stable**：現行穩定工作定義。
- **Working**：可使用，但仍可能調整。
- **Proposed**：提案中，未視為現行規格。
- **Historical**：保留歷史追溯，不作現行來源。

最後同步：2026-09-07
