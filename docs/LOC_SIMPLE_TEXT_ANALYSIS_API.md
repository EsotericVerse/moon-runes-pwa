# LOC Simple Text Analysis API

**Status:** Current  
**API:** LOC API v1.4.0  
**Updated:** 2026-09-07

## 1. Purpose

LOC 必須提供一個最低門檻、可自動化、**不依賴外部 LLM／Embedding API Key** 的文字解析能力。

這個能力的目的不是取代進階語意模型，而是確保任何使用者在取得自己的文字資料後，都能完成最基本且必要的資料處理流程：

```text
Raw Text / Export
        ↓
Text Cleaning
        ↓
Keyword Extraction
        ↓
Simple Rule-based Classification
        ↓
Date / Source Index
        ↓
Keyword Library
        ↓
Trend Projection
        ↓
Search / Graph / RAG
```

如果沒有這一層，新的 corpus 只能依賴人工整理或外部模型，LOC 就無法成為可泛用、可自動化的系統。

---

## 2. Governance Rule

### LOC 必須提供

- 基礎文字清理
- 關鍵字候選抽取
- 使用者可自訂的規則式文字分類
- 文件頻率與命中次數
- 日期／來源索引
- 月／季／年時間分桶
- 關鍵字時期比例
- trajectory / delta 趨勢資料

以上能力必須能在**沒有外部 API Key** 的情況下執行。

### LOC 不強制提供

以下屬於進階增強層，不是 LOC 基礎解析成立的必要條件：

- LLM 摘要
- Embedding
- 向量資料庫
- 自動 cluster 命名
- 高階主題模型
- 情緒／人格推論
- 外部模型進行的自由文字分類
- 特定 AI 供應商的專有能力

使用者、部署者或後續開發者可依需求自行加入這些能力，但不得讓它們變成 LOC 基礎資料入口的必要依賴。

> **Simple analysis is built in; advanced semantic analysis is optional.**

---

## 3. Why This Is Required

趨勢不是直接從原始文字產生。

LOC 的基本依賴鏈為：

```text
沒有解析
→ 沒有穩定 keyword / category library
→ 沒有可比較的時間序列
→ 沒有可信的 trend
```

因此「資料匯入後的第一次解析」必須被視為正式系統功能，而不是作者手動前處理。

目前作者 corpus 可由人工校正補足；但若未來有其他使用者，流程必須可以自動完成。

---

## 4. Endpoint: POST /analyze/text

用途：解析一篇文字並做簡單分類。

### Request

```json
{
  "text": "最近正在整理工作與作品資料，也重新思考未來的職涯方向。",
  "categories": {
    "工作": ["工作", "職涯", "公司", "面試"],
    "創作": ["作品", "創作", "歌詞", "小說"],
    "整理": ["整理", "分類", "清理"]
  },
  "seed_keywords": ["未來", "工作", "作品"],
  "top_k": 12
}
```

### Response concept

```json
{
  "success": true,
  "mode": "local_rule_based",
  "external_api_required": false,
  "keywords": [],
  "categories": [],
  "matched_terms": {}
}
```

### Classification rule

分類表由呼叫端提供，不綁死作者個人的主題分類。

例如同一個 API 可被不同使用者配置為：

```text
工作 → 公司、職場、面試、專案
關係 → 愛、朋友、伴侶、互動
創作 → 歌曲、歌詞、小說、文字
治理 → 界線、責任、選擇、整理
```

也可以完全改成其他領域，例如研究、客服、專案管理、學習紀錄或企業內部文件。

---

## 5. Endpoint: POST /analyze/corpus

用途：將一批文字轉換成可供趨勢分析使用的基本資料。

### Minimum document schema

```json
{
  "id": "post-001",
  "date": "2026-09-07",
  "source": "facebook",
  "text": "..."
}
```

### Request

```json
{
  "documents": [
    {
      "id": "post-001",
      "date": "2026-09-07",
      "source": "facebook",
      "text": "..."
    }
  ],
  "seed_keywords": ["工作", "自由", "整理", "創作"],
  "top_k": 80,
  "min_df": 2,
  "granularity": "month"
}
```

### Output

API 會建立：

- document count
- dated document count
- keyword library
- document frequency
- hit count
- source distribution
- period keyword statistics
- trajectories
- percentage-point delta

這些結果可直接成為 LOC 趨勢層、Search、Graph 或後續 RAG 的輸入。

---

## 6. Local First / API Optional

LOC 的「API」指的是系統介面，不代表一定要呼叫第三方 AI API。

```text
LOC API
├─ Built-in local analysis
│  ├─ clean
│  ├─ keyword
│  ├─ rule-based category
│  ├─ time index
│  └─ trend projection
│
└─ Optional semantic enrichment
   ├─ LLM summary
   ├─ embeddings
   ├─ clustering
   ├─ semantic labels
   └─ external model classification
```

基礎層必須可以獨立存在。

---

## 7. Automation Requirement

現行作者工作流程中仍有人工解析、人工確認與人工建立關鍵字庫的步驟。

這些人工工作可以作為：

- Canon 校正
- 關鍵詞治理
- 例外處理
- 品質驗證

但**不能作為未來一般使用者的必要流程**。

正式產品化方向必須是：

```text
Upload / Import
→ automatic basic parse
→ automatic classification
→ automatic keyword library
→ automatic time index
→ automatic trend
→ optional human correction
→ optional advanced semantic enrichment
```

也就是：

> **人工應該是校正層，不是執行層。**

---

## 8. Privacy / Portability Principle

基礎解析不依賴第三方模型有幾個重要效果：

- 私人資料可留在自己的部署環境
- 不必將全部歷史文字送往外部模型
- 不被單一 AI 供應商綁定
- 大型 corpus 第一次匯入不必先產生 token 成本
- 使用者即使沒有 API Key，也能建立自己的基本趨勢資料
- 後續可自由選擇本機模型或不同外部服務

因此 Local First 不只是成本設計，也是 LOC 的資料治理與可移植性要求。

---

## 9. Current Implementation

現行實作：

- `card_api/corpus_analysis.py`
- `POST /analyze/text`
- `POST /analyze/corpus`
- LOC API v1.4.0

基礎解析只使用 Python 本機邏輯與規則，不要求外部 AI API Key。

進階模型可以加入，但不得取代這個最低可用層。
