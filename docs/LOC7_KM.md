# LOC7_KM — Knowledge Management

**Version:** 0.2  
**Status:** Current  
**Owner:** LOC7 — Text Architecture  
**Updated:** 2026-09-05

## 1. 定位

LOC7_KM 是 LOC／月典的知識管理核心，負責將 Canon、母資料、原始作品、分析文件、系統 Registry、FAQ／RAG 資料與工作定義整理成 **可追溯、可版本化、可搜尋、可建立關係** 的知識資產。

KM 不等於 FAQ。FAQ 是 KM 的一種問答 View；RAG chunk 是檢索衍生資料；Graph RAG 則是後續關係擴展方向。

## 2. 基本原則

1. **Markdown-first, structured-data-native.**
2. Canon 與指定母資料優先於衍生文件。
3. 原始作品是作品語料的 primary source。
4. LOC6 的風格／治理分析屬 Derived Knowledge，不反向改寫原始文本。
5. 未 Canon 化的對話結論需標記為 `Working` 或 `Proposed`。
6. FAQ、RAG chunk、Embedding、索引與 UI 都是下游 View，不是 Canon。
7. AI 推論不得自動升格為原始紀錄或 Canon。
8. 每個 Knowledge Asset 必須保留 authority、status、provenance 與 version context。

## 3. Source hierarchy

```text
Tier A  Canon / designated mother source
        ├─ LOC Canon
        └─ LunaRune64.xlsx（符文結構化母資料）

Tier B  Original works / primary records
        ├─ songs / lyrics
        ├─ writing
        ├─ media
        └─ life-event records

Tier C  Maintained knowledge documents
        ├─ docs/*.md
        ├─ system explanations
        └─ governance / architecture notes

Tier D  Structured registries
        └─ data/shared/*.json

Tier E  Retrieval derivatives
        ├─ LOC_FAQ_v*.json
        ├─ LOC_FAQ_RAG_v*.json
        ├─ embeddings / FAISS
        └─ other indexes

Tier F  Application views
        ├─ search.html
        ├─ faq.html
        └─ API responses
```

同一 Tier 內仍須依個別 asset 的 authority 與 provenance 判定，不以副檔名代替權威性。

## 4. Knowledge Object

KM 的目標資料模型以 Knowledge Object 為基本單位。最小 metadata：

```json
{
  "id": "KO-...",
  "type": "definition | rule | work | analysis | event | document",
  "loc_scope": ["LOC7"],
  "status": "Canonical | Stable | Working | Proposed | Historical",
  "keywords": [],
  "source": [],
  "version": "",
  "updated_at": ""
}
```

現階段 FAQ／Registry 已可作為 Knowledge Object 化前的穩定資料來源，但不必先把所有內容強制轉成 Graph。

## 5. LOC 邊界

- **LOC1**：符文本體、基本語意、方位與抽取。
- **LOC2**：情境語意。雙卡因果是最小情境文法；Event Corpus 把真實生活狀況整理成可描述、可回應的語意問題。
- **LOC6**：牌組本身的符文文法、組合關係與其實際解析證據。
- **LOC7**：符文／文字建築、句法／語意結構、知識管理、檢索與關係模型。
- **LOC8**：事件、時間、生活軌跡與跨分發統合。

LOC7 可以分析 LOC2／LOC6／LOC8 的資料結構，但不取代它們的 canonical ownership。

## 6. LOC2 Scenario Corpus

LOC2 的事件資料在 KM 中不只視為遊戲規則。它同時是一批 **Scenario Corpus / Event Corpus**。

- 雙卡採 A → B 因果，可用來描述狀況如何形成。
- Alpha Event 32 已提供記憶、誤解、合作、切斷、等待、選擇、重建等真實生活情境原型。
- 現行 Alpha Event 的 SL／ML／NE／OC 是快速判定需求，不等同於固定的雙符文配對。
- KM 不得自行替 Event 補造未被來源定義的符文組合。
- LOC2 情境可供 LOC4 敘事、LOC6 文法、LOC7 建築／關係分析與 LOC8 生活事件引用。

維護文件：[LOC2_SCENARIO_MODEL.md](./LOC2_SCENARIO_MODEL.md)  
Structured registry：`data/shared/LOC2_EVENT_REGISTRY.json`

## 7. FAQ / RAG 現況

現行作用資料：

- `card_api/data/LOC_FAQ_v0.3.json`：80 題 FAQ source view。
- `card_api/data/LOC_FAQ_RAG_v0.3.json`：由 FAQ v0.3 衍生的原子化檢索資料。
- `card_api/main.py`：目前載入 RAG v0.3。

歷史資料：

- FAQ／RAG v0.1、v0.2 保留作 version history，不再視為 current runtime source。

## 8. Shared Registry

`data/shared/` 主要承接跨 LOC 的結構化 registry。KM 相關核心：

- `LOC_KNOWLEDGE_ASSET_REGISTRY.json`
- `LOC2_EVENT_REGISTRY.json`
- `LOC_KM_KEYWORDS.json`
- `LOC7_LINGUISTIC_ANALYSIS_REGISTRY.json`
- `LOC_SHARED_MANIFEST.json`

詳細角色見 [JSON_DATA_MAP.md](./JSON_DATA_MAP.md)。

## 9. 同步規則

任何知識更新依下列順序處理：

1. 找出 authority source。
2. 修改 Canon／母資料／原始作品或維護中的 Markdown 文件。
3. 同步 Shared Registry。
4. 必要時更新 FAQ source dataset。
5. 從 FAQ source 重新建立 RAG／Embedding／索引衍生資料。
6. 驗證 API 與 UI。
7. 保留歷史版，不以新版本內容覆寫舊版本號。

## 10. Graph RAG 狀態

Unified Search 已有實作；完整 Relation Schema、Knowledge Graph expansion 與 Graph RAG 仍屬下一階段。不得因已有 registry、related_ids 或 search view 就宣稱完整 Graph RAG 已部署。

## 11. 文件格式

`docs/LOC7_KM.md` 自 0.2 起是 repository 內唯一維護中的 KM 主文件。

若未來需要 DOCX／PDF，應由 Markdown 內容輸出為發布版本；發布檔不回頭作為 KM 維護來源。

---

**LOC KM principle:** Knowledge is governed upstream, structured downstream, and exposed through views.
