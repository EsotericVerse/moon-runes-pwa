# LOC Documentation Index

> LOC／月典文件入口。此目錄採 **Markdown-first, structured-data-native** 原則。

## 文件治理

- Markdown（`.md`）：可維護、可 diff、可搜尋、可被 KM／Agent 直接讀取的主要知識文件。
- JSON：結構化 Registry、檢索資料、應用資料；依各自 authority 與 provenance 治理。
- XLSX：結構化母資料；`LunaRune64.xlsx` 仍是符文資料的最高優先母資料。
- DOCX／PDF：發布、交換、列印或封存格式，不因放在 `docs/` 就自動成為最高權威。
- 應用輸出與 AI 推論不得反向覆寫 Canon 或母資料。

## 主要文件

| 文件 | 用途 | 狀態 |
|---|---|---|
| [LOC7_KM.md](./LOC7_KM.md) | LOC7 Knowledge Management 核心治理文件 | Current |
| [JSON_DATA_MAP.md](./JSON_DATA_MAP.md) | JSON 資料角色、來源與同步規則 | Current |
| `LOC7_KM.docx` | KM 發布／交換版本 | Published snapshot |
| `LOC_Canon.docx` | Canon 文件版本之一 | Canon document |
| `LunarRunesCardCut.pdf` | 月符實體卡列印檔 | Published artifact |

## KM 最小資料流

```text
Canon / mother source / original works
        ↓
Markdown knowledge documents
        ↓
Shared registries / FAQ source data
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

最後同步：2026-09-05
