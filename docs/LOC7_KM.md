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

## 7. 雙符文關係層

雙卡資料必須拆成「關係」與「抽牌投影」兩層，不能混成同一筆解牌資料。

### 7.1 Pair Relation — 中性關係

`data/shared/LOC6_DUAL_RUNE_RELATION_REGISTRY.json` 保存兩個符文放在一起時的基本語意關係。

- pair key 不帶方向，固定以較小符文 ID 在前，例如 `09_16`。
- A＋B 與 B＋A 查到同一個中性關係。
- 關係層不指定誰是「因」、誰是「果」。
- 可集中引用《命運句語法圖鑑》的明確雙卡例子、LOC2 可證明的情境案例，以及後續人工確認的實際案例。
- LOC2 Event 的 SL／ML／NE／OC requirement 不得自動轉成特定符文 pair。

### 7.2 Draw Projection — 抽牌因果投影

真正進入 LOC1 雙卡抽牌時，才疊加：

```text
中性 A＋B 關係
      ↓
抽牌順序：第1張＝因、第2張＝果
      ↓
兩張四向狀態
      ↓
問題／情境
      ↓
月相等背景
      ↓
本次雙卡解讀
```

因此同一個 pair 可以支援 `A → B` 與 `B → A` 兩種因果投影；它們共享底層關係，但不是同一個抽牌答案。

這個分層讓案例庫可被 LOC1 解牌重用，同時由 LOC6 保存牌組文法，不把歷史案例硬寫成固定命運句。

## 8. 政德風治理 Corpus

政德風採「原始語句／治理原則／風格狀態／時期投影」分層保存，不再只以語錄集合處理。

- 維護文件：`docs/LOC6_ZHENGDE_STYLE.md`
- 結構化 registry：`data/shared/LOC6_GOVERNANCE_REGISTRY.json`
- LOC3 可提供不同 ERA 的歌曲與歌詞證據。
- LOC4 可提供長文、小說、文章中的文字證據。
- LOC8 提供時間與人生階段。
- LOC7 可做句型、向量、風格特徵與 stage comparison，但不得把 AI 重寫冒充歷史原文。

政德風的 Stage Profile 以 **ERA 為第一索引**。P1–P8 由 LOC8 的 `LOC_ERA_REGISTRY.json` 提供時間、階段描述與前後狀態；LOC6 再把歌曲、文章、語錄等文字證據掛回對應 ERA。年齡只作衍生 View。

「30 歲的政德會怎麼說／46 歲的政德會怎麼說」應建立在 ERA＋真實歷史語料之上；在原文證據不足時，ERA description 只能產生 `inferred` profile，不得冒充 recorded style。

## 9. LOC3 → ERA → LOC6 回掛

LOC3 現行可搜尋 corpus 共 403 首，已依 P2–P8 回掛到 `data/shared/LOC6_ERA_STYLE_EVIDENCE.json`，提供每個 ERA 的作品數、主要 tags、起始狀態、轉折方式、結尾結構等 recorded metadata aggregate。

- P1 目前明確排除於公開 LOC3 搜尋，因此此層沒有 P1 歌曲 aggregate。
- ERA 名稱與日期仍以 LOC8 `LOC_ERA_REGISTRY.json` 為權威。
- LOC6 只負責從作品證據分析風格轉變，不重新定義 ERA。

### 符文歌曲

`data/shared/LOC3_RUNE_SONG_REGISTRY.json` 專門判定真正的符文歌曲。

只有具有「實際抽牌 → 解讀 → 歌詞／歌曲」provenance 的作品才可標成 `rune_song`。月光、命運、符文等意象本身不足以成立。

目前資料層分成：
- `confirmed`：有直接 draw-to-song 來源證據。
- `high_candidate`：多重來源高度吻合，但仍缺創作 provenance。
- `medium_candidate`：時間／情境吻合，但缺直接符文連結。
- theme-only：不得列為符文歌曲。

## 10. FAQ / RAG 現況

現行作用資料：

- `card_api/data/LOC_FAQ_v0.3.json`：80 題 FAQ source view。
- `card_api/data/LOC_FAQ_RAG_v0.3.json`：由 FAQ v0.3 衍生的原子化檢索資料。
- `card_api/main.py`：目前載入 RAG v0.3。

歷史資料：

- FAQ／RAG v0.1、v0.2 保留作 version history，不再視為 current runtime source。

## 11. Shared Registry

`data/shared/` 主要承接跨 LOC 的結構化 registry。KM 相關核心：

- `LOC_KNOWLEDGE_ASSET_REGISTRY.json`
- `LOC2_EVENT_REGISTRY.json`
- `LOC_KM_KEYWORDS.json`
- `LOC7_LINGUISTIC_ANALYSIS_REGISTRY.json`
- `LOC_SHARED_MANIFEST.json`

詳細角色見 [JSON_DATA_MAP.md](./JSON_DATA_MAP.md)。

## 12. 同步規則

任何知識更新依下列順序處理：

1. 找出 authority source。
2. 修改 Canon／母資料／原始作品或維護中的 Markdown 文件。
3. 同步 Shared Registry。
4. 必要時更新 FAQ source dataset。
5. 從 FAQ source 重新建立 RAG／Embedding／索引衍生資料。
6. 驗證 API 與 UI。
7. 保留歷史版，不以新版本內容覆寫舊版本號。

## 13. Graph RAG 狀態

Unified Search 已有實作；完整 Relation Schema、Knowledge Graph expansion 與 Graph RAG 仍屬下一階段。不得因已有 registry、related_ids 或 search view 就宣稱完整 Graph RAG 已部署。

## 14. 文件格式

`docs/LOC7_KM.md` 自 0.2 起是 repository 內唯一維護中的 KM 主文件。

若未來需要 DOCX／PDF，應由 Markdown 內容輸出為發布版本；發布檔不回頭作為 KM 維護來源。

---

**LOC KM principle:** Knowledge is governed upstream, structured downstream, and exposed through views.
