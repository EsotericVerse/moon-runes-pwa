# LOC7_KM — Knowledge Management

**Version:** 0.3  
**Status:** Current  
**Owner:** LOC7 — Text Architecture  
**Updated:** 2026-09-06

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
        ├─ published tutorials（例如 LOC_Tutorial_01_語言系統框架入門.pdf）
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

只有具有「實際抽牌 → 解讀 → 歌詞／歌曲」provenance，或作者明確確認為該流程產物的作品，才可標成 `rune_song`。月光、命運、符文等意象本身不足以成立。

回收規則已收斂為：

- **時間範圍硬限制：只有 P2、P3、P4 可能存在符文歌曲。** P1 與 P5–P8 全部排除。
- 66 個符文名稱可作完整歌詞的第一層 recovery keywords，但只計 **distinct rune names**；同一符文重複出現不累加。
- 低辨識度詞（例如月、日、心、愛、夢、風）只能作弱訊號。
- 禁咒／符文詠唱類屬顯式符文文本例外，不進 rune_song 候選、排序或 threshold 校準。
- 關鍵字密度與同日抽牌都只能找候選；作者否認或作品 provenance 可直接覆蓋推論。

目前工作層級：
- `confirmed`：作者明確確認或有直接 draw-to-song 來源。
- `candidate`：僅限 P2–P4，且仍缺直接確認。
- `rejected_non_rune_song` / `rejected_period_scope`：已排除。

現行已確認的 work-level rune songs：
- `E0223`《日蝕之前的顯現》（P3）
- `E0285`《在塵裡長出的光》（P4，代表作）
- `E0354`《界內之風》（P4）
- `E0364`《界外誤差》（P4）

《界線之內》已由作者更正為**非符文歌曲**；先前 title-level 確認為輸入錯字，已撤銷，不再保留 unresolved 例外。

現行數量口徑：**4 首 work-level confirmed rune songs**。目前不另保留 title-level confirmed 例外。

LOC3 版本推薦分數另外納入跨媒介完成度：IG Reels +20、YouTube MV +30，兩者可累加。這些 bonus 只影響同詞版本的推薦順序，不進歌詞語意向量，也不改變 rune_song provenance 判定。

### LOC3 道理／命題層

LOC3 不把「情緒」視為每首歌曲的必填語意。部分政德風歌曲以理性論述、系統觀察、關係規則、界線判斷或治理命題為核心；對這類歌曲，真正可檢索的語意可能主要存在於「道理句」而非情緒詞。

Structured schema：`data/shared/LOC3_REASONING_SCHEMA.json`

分析至少可拆成：
- 主張／論點
- 理由／依據
- 因果
- 條件
- 界線
- 治理
- 關係規則
- 判斷
- 反轉／重框
- 結論

這類作品可使用 `discourse_mode = rational_discourse | rational_reflection | system_observation`，並允許 `emotion_applicability = not_primary | not_required`。當情緒不適用時，不得再把「沒有情緒 tag」計為未完成分析。對這類作品，`reasoning_tags`／道理命題必須進入 retrieval text，讓「關係需要互動」「逃避也是面對」「邊界不可無限退讓」等命題本身成為可搜尋語意，而不是只依賴情緒詞。

對理性論述型歌曲，`reasoning_tags` 與 `key_propositions` 在檢索上的重要性應至少等同、必要時高於情緒 tag。LOC3 保存歌曲語意，LOC6 可解讀其中的治理／政德風命題，LOC7 再處理命題結構、文字建築與向量檢索。

另外，LOC3 的「完整」不等於所有欄位都必須有值：
- 狀態／動作描述型歌曲可以 `final_state_applicability = not_required`，例如只描述等待、危險、停滯等過程而不給結論。
- 文言文歌曲先列為 `classical_chinese` 例外，必須先做語意解釋／現代語意轉譯，再進關鍵字與 reasoning extraction；不能直接用現代中文詞庫判定缺失。

LOC3 語系治理：**非中文歌曲暫不進行中文關鍵字／主題／情緒的補標與人工複查。** 英文、日文、韓文等作品保留語言、曲風、ERA、媒體資產與基本作品 metadata；待未來建立各語系詞庫後再進行語意 tag 分析。混合語言若主要語言判定為中文，仍可納入中文解析，但需保留 mixed-language 標記。

LOC3 實驗例外治理：**代表歌名長度超過 16 字元的作品，視為早期／測試性生成例外，不納入正式 LOC3 分析、中文 tag 補標、一般搜尋、展示與推薦。** 這些作品保留原始檔與基本歷史 metadata，但不應被計入「LOC3 未完成分析」統計。另有作者明確指定的玩票例外也採相同處理；目前 E0216《啾咪十八歲》已列入此類。

LOC3 另有作品層治理：禁咒／符文詠唱類屬 `hidden_exception`，不展示、不推薦、不進一般搜尋；與 LOC4 有明確關聯的主題曲、角色曲、OP、求婚歌等保存 `loc4_relation`，現行作品推薦加權基準 +40。此加權只作 bounded recommendation prior，不取代歌詞語意相似度。

LOC5 媒體稽核：目前 Suno 500 workbook、`LOC3_MEDIA_LINKS_v0.1.json` 與 shared `LOC_MEDIA_REGISTRY.json` 均未找到上述四首 confirmed rune songs 的 Reels／MV 對應。未找到不等於不存在；在實際媒體來源回收前，不建立 LOC5 假連結。

## 10. FAQ / RAG 現況

現行作用資料：

- `card_api/data/LOC_FAQ_v0.4.json`：80 題 FAQ source view。
- `card_api/data/LOC_FAQ_RAG_v0.4.json`：由 FAQ v0.4 同步衍生的檢索資料。
- `card_api/main.py`：目前載入 RAG v0.4。

v0.4 對齊 2026-09-06 的 LOC6／LOC7／LOC8 權責、Unified Search 實作、公開「時期」用語與既有功能狀態。FAQ 是 KM 的問答 View；RAG 是 retrieval derivative，兩者都不是 Canon。

歷史資料：

- FAQ／RAG v0.1、v0.2、v0.3 保留作 version history，不再視為 current runtime source。

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

## 13. Unified Search / Graph RAG 狀態

Unified Search 已是現行公開檢索入口，後端目前可直接取得 LOC1、LOC3、LOC4、LOC5、LOC6、LOC7 與 LOC8 的不同資料來源；LOC2 目前仍以 Knowledge View 為主。搜尋層只負責 routing、retrieval、ranking 與結果 envelope，不改變各 LOC 的 canonical ownership。

完整 Relation Schema、Knowledge Graph expansion 與 Graph RAG 仍屬後續階段。不得因已有 Shared Registry、related_ids、cross-relationship registry 或 search view 就宣稱完整 Graph RAG 已部署。

## 14. 文件格式

`docs/LOC7_KM.md` 自 0.2 起是 repository 內唯一維護中的 KM 主文件；0.3 起同步記錄 Unified Search、FAQ/RAG v0.4 與目前跨 LOC 檢索責任。

新手教學 PDF 屬於 **Published Tutorial / Derived Knowledge Asset**。它可以被 KM 索引、引用與提供下載，但不因發布為 PDF 而升格為 Canon。現行第一份：

- `docs/LOC_Tutorial_01_語言系統框架入門.pdf` — 新手教學 01：LOC 語言系統框架入門。

若未來需要 DOCX／PDF，應由 Markdown 內容輸出為發布版本；發布檔不回頭作為 KM 維護來源。

---

**LOC KM principle:** Knowledge is governed upstream, structured downstream, and exposed through views.


## 15. 2026-09-06 現行版本矩陣

| 層級 | 現行版本 | 角色 |
|---|---:|---|
| LOC Canon | 0.5r | Canon／核心規則基準 |
| Shared Schema | 0.1 | 跨 LOC 共用欄位與 reference contract |
| Unified Search | 0.1 | 跨 LOC 查詢與結果整合層 |
| LOC7_KM | 0.3 | 維護中的知識管理主文件 |
| FAQ View | 0.4 | KM 對外問答 View |
| FAQ RAG | 0.4 | FAQ 衍生 retrieval dataset |

首頁只顯示前四個系統層級版本；FAQ／RAG 屬 LOC7 下游檢索資料，保留在 KM／技術文件，不與 Canon 並列為同一層級。

### 公開用語與 machine ID

- 公開介面：使用「時期」。
- Stable machine ID：仍可保留 `ERA-P1`～`ERA-P8`。
- 公開功能名稱與右上導覽一致；技術分類放在 `loc-header-meta`。
- LOC6 擁有治理／意義語義；LOC7 擁有 KM、檢索與結構；LOC8 擁有事件、時期與時間統合。


## 16. ChatGPT 對話紀錄匯入策略

ChatGPT 對話紀錄不採「整批全量匯入」作為預設 KM 策略。大量對話屬實作討論、除錯、操作確認、版本推進與暫時性決策；若這些內容已經沉澱到 GitHub、Markdown、Registry、Canon 或實際系統實作，則原始對話不必再次重複進入知識庫。

### 預設規則

- **已實作且已有正式文件／程式碼承接的對話：原則上不匯入。**
- **純除錯、操作流程、PR／部署討論：不作核心 KM corpus。**
- **重複確認、臨時假設、過渡版本討論：不直接匯入。**
- **理論形成、定義演變、命名正名、治理原則、重要反例：可選擇性匯入。**
- **若 Threads／作品／Canon 已能完整支撐同一概念，ChatGPT 對話只作補充 provenance，不作主要來源。**
- **只有當對話保存了其他來源沒有的推理過程、轉折理由或概念形成證據時，才提高匯入優先級。**

### LOC6／LOC8 的實際優先順序

對現行 LOC6 與 LOC8 整理：

```text
Threads / 原始作品 / 真實 Event
        ↓
Canon / 維護中的 Markdown / Shared Registry
        ↓
必要時回查 ChatGPT 對話
```

ChatGPT 對話不是預設第二套完整 corpus，而是 **gap-filling source**。只有在需要補足概念形成、時間轉折、名稱修正或決策 provenance 時，才精準回收相關片段。

這可避免把已整理完成的實作討論再次灌入 KM，降低重複、噪音與版本污染。


## 17. LOC6 Threads KM 搜尋

2026-09-06 起，Threads 不再只停留在離線分析來源；第一批 Threads evidence 已接入 LOC Unified Search。

### 現行資料層

- 原始匯出：`threads_and_replies.json`
- 去重基準：7008 筆
- 主貼文：4578 筆，視為 primary evidence
- Reply：2430 筆，視為 supplemental evidence
- 搜尋索引：`data/shared/LOC6_THREADS_KM_INDEX.json`
- Unified Search group：`governance`
- Content type：`governance_fragment`

索引同時保存：

- 可搜尋 Threads 原文摘錄
- 日期與 P0–P8 時期
- main / reply evidence role
- 關鍵字 document frequency
- main / reply 各自的 ERA distribution

### 治理邊界

這一層是 **Primary-source-derived Search Index**，不是 Canon。搜尋結果可以作為 LOC6 概念形成、風格演變與治理語言的原始證據，但不得因高頻或搜尋命中就自動升格為 Canonical Concept。

現行已完成 4,578 筆主貼文全文的 repository 索引；完整 7,008 筆去重文字紀錄仍保留於原始 Threads export。Concept clustering、Surface Term 與 Canon governance 可持續增量分析，但不再阻塞全文搜尋。


### 2026-09-06 展示版進度

目前 repo 已接入完整 4,578 筆 Threads 主貼文全文 corpus，並由 sharded document manifest 載入至 LOC6 Article Search；搜尋頁提供「LOC6 文章／Threads」篩選、文章卡片與原文展開。2,430 筆 Reply 仍保留為 supplemental evidence，不與主貼文同權重。


### 全文解析目標

LOC6 Threads corpus 現行完整解析目標為 **7,008 筆去重文字紀錄**，時間範圍自 **2024-11-18 至 2026-09-06**。其中 **4,578 筆主貼文**作為 primary evidence，**2,430 筆 Reply** 作為 supplemental evidence。

完整解析必須保留三個層次：

1. **Document layer**：原文、日期、source role、stable source id。
2. **Semantic layer**：Surface Term、phrase、Concept candidate、semantic role、support evidence。
3. **Projection layer**：ERA、trend、main/reply support、後續 Canon 關係。

不得以 ERA 或 Canon 結果反向覆寫原始 document layer。全文 corpus 的規模與時序本身也屬 LOC6 的展示性指標。


### P0 corpus baseline

P0 已由完整 Threads 主貼文索引取得 **1,049 筆 primary records**，時間範圍為 **2024-11-18 ～ 2025-02-20**。現行 baseline 保存 document count、文字量與 literal probe term prevalence，作為後續跨 ERA 分析的起點。

- Structured baseline：`data/generated/loc6/threads/analysis/LOC6_THREADS_P0_BASELINE_v0.1.json`
- P0 total characters：161,458
- 主貼文只作 primary evidence；Reply 仍維持 supplemental evidence。
- term frequency 不得直接升格 Concept；Concept 仍須由 phrase/context evidence 與人工治理確認。
