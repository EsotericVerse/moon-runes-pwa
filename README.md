# 🌕 LOC｜月典（Luna Codex）

LOC（月典／Luna Codex）是一套用來**分析、拆解、組織、搜尋、治理並推演語言**的模組化語言框架（Modular Language Framework）。

LOC 的 Current information architecture 固定採 **Scope Model × Feature Model → Page Composition**：Scope 管理資料、權威與歷史邊界；Feature 是可跨 Scope 重用的能力；Page Composition 將兩者組合成實際頁面與入口。

LunaRunes（月之符文）是 LOC 的第一個 Symbolic Language reference implementation：以 66 枚中文單字為核心語彙，實作脈絡、Graph、Grammar、治理、搜尋與演化。月之符文用來證明 LOC 的模組方法可被實作，但不是使用 LOC 的門檻。

**術語治理：LOC 整體固定稱為 Modular Language Framework／模組化語言框架；LunaRunes 固定稱為 Symbolic Language／符號式語言；LOC1–8 僅保留為歷史／provenance 識別，不再代表 Current Scope、Feature ownership、NAV 或 Canon authority。**

### 主要定位

> LOC is a reusable language module framework. LunaRunes demonstrates that the framework can be implemented as a working symbolic language module.
>
> LOC is fully open source. Commercial value comes from consulting, system architecture, governance design, and case-specific implementation.

中文：LOC 是一套可重複使用的模組化語言框架。LunaRunes（月之符文）證明了這套框架可以被實作為一個實際運作的符號式語言。LOC 完全開源；商業價值來自顧問服務、系統架構、治理設計，以及依個別案例進行的客製化實作。

> 從語彙開始，延伸出文字創作與多元體系；它們在脈絡中彼此連結，透過演算法整合，並在時間中持續推演。

- **Current architecture：Scope Model × Feature Model → Page Composition**
- **LOC GPT Skills：1.0.0**
- **公開網站：<https://loc.lo3rwang.cc/>**
- **作者：Lucas Oscar Wang 政德 lo3rwang**
- **GitHub：<https://github.com/EsotericVerse/moon-runes-pwa>**

---

## 目前進度｜2026-09-17

目前重點是 **Current Scope / Feature 架構收斂、資料一致性與公開功能驗收**。LunaRunes Canon 已直接支援符文脈絡、Graph、統計與推演資料；同時 LOC、LunaRunes、lo3rwang 與 Governance 依各自 Scope 保有資料與權威邊界，共用 Context、Statics、Evolution、Governance、Search 等 Features。

- **LunaRunes／月之符文**：66 符固定骨架、籤詩、抽牌與第 0 符「德」基準資料。
- **Context／脈絡**：Relation、Event、Graph 與 Semantic Playground。
- **Music／音樂**：Suno corpus、歌曲／歌詞搜尋與時期分析。
- **Literary／文字創作**：小說、文章、生活文字與歷史 corpus。
- **MultiMedia／多媒體**：Reels、圖像、影音與跨媒介資產。
- **Governance／治理**：共同治理方法，以及各 Scope 自己的治理主體與權威。
- **Knowledge Management／知識管理**：知識資產、authority、version、provenance、relation 與 retrievability；FAQ／RAG／Search 是 View、Feature 或衍生資料，不等於 KM 本體。
- **Evolution／推演**：Period、Timeline、Trend、Trajectory 與時間投影。

### 正式資料鏈

目前以 LunaRunes 作為第一套完整資料來源，主要資料鏈已實際成立：

```text
LunaRunes Canon
→ 正向／反向關鍵詞
→ 符文
→ 唯一群組
→ Graph
→ 統計／排行榜
→ 歷程／時間線／趨勢／軌跡
```

符文脈絡與符文分析核心採 **No API**：直接使用 repository 既有 `runes.json` 與現行規則，不呼叫外部 API、不重掃文章建立第二套關鍵詞，也不建立第二套 Canon。

### Demo 前目前優先順序

1. FAQ／KM 與 Current Canon 同步
2. LOC／LunaRunes／lo3rwang Scope 的 Page Composition 與 NAV 一致化
3. 搜尋、Context、Evolution 的資料與 fallback 一致性
4. 整合式新手導覽與公開文件同步

## Demo 入口

| 功能 | 頁面 | 說明 |
|---|---|---|
| 首頁 | <https://loc.lo3rwang.cc/> | LOC 總覽與主要入口 |
| 月之符文 | <https://loc.lo3rwang.cc/runes/> | LunaRunes 主頁、66 符資料、圖鑑、抽牌、判讀規則與符文脈絡 |
| 統計 | <https://loc.lo3rwang.cc/statics/> | LOC Scope 統計；LunaRunes 使用 `/runes/statics/` 或獨立 host 對應組合 |
| 脈絡 | <https://loc.lo3rwang.cc/context/> | LOC Scope Context；各 Scope 可組合自己的 Context Feature |
| 搜尋 | <https://loc.lo3rwang.cc/search/> | Cross-format Search；Scope 邊界由 Search composition 控制 |
| 推演 | <https://loc.lo3rwang.cc/evolution/> | 時期、Timeline、Trend、Trajectory 與資料歷程 |
| 治理 | <https://loc.lo3rwang.cc/governance/> | LOC 全域治理方法與跨 Scope 歷史入口 |
| Context Sandbox | <https://loc.lo3rwang.cc/game/> | Semantic Playground |
| 作者 | <https://lo3rwang.cc/> | Lucas Oscar Wang 政德 / lo3rwang Scope |

---

## LOC GPT Skills

LOC GPT Skills 將 LOC 的語言治理與 Repository 治理方法封裝成可重複調用的 AI Skills。它們不是獨立於 LOC 的另一套理論，而是 LOC Modular Language Framework 的 callable implementations。

### v1.0.0

| Skill | 用途 |
|---|---|
| `loc-km-governance` | 檢查 Canon、KM、FAQ、Registry、Base66、術語一致性、資料權威與舊版污染 |
| `loc-repo-health-check` | 檢查 Repository 結構、路徑、runtime projection、API／Search、legacy dependency、部署與效能風險 |

兩個 Skill 共用現行 LOC 治理原則：

```text
Current Canon
        ↓
Scope Model × Feature Model
        ↓
Registry / Structured Data
        ↓
Page Composition / Search / Analysis
        ↓
UI / API / AI Skill
```

其中 LunaRunes 是 LOC 的 Symbolic Language reference implementation；Skills 則把已形成的方法與治理能力轉成 GPT／Agent 可重複使用的工作流程。

- **公開套件：** [LOC-GPT-Skills-v1.0.0-bundle.zip](https://loc.lo3rwang.cc/LOC-GPT-Skills-v1.0.0-bundle.zip)
- **版本：** 1.0.0
- **發布方式：** 原始 Skill 結構與可執行 validator 採開放方式提供，bundle 作為安裝／交換用發布包。

---

## LOC1–8｜Historical / Provenance

LOC1–8 **不再是 Current information architecture**。它們保留用來讀懂舊文件、舊檔名、舊資料欄位與系統形成歷史；不得因此重新取得 Scope、Feature、NAV、Registry 或 Canon ownership。

| 歷史識別 | 曾主要對應 | Current 對應方式 |
|---|---|---|
| LOC1 | LunaRunes／抽牌 | LunaRunes Scope + 抽牌／Grammar 等 Features |
| LOC2 | Context／遊戲 | Context Feature、Semantic Playground、Game data |
| LOC3 | Music | Music corpus / Search / Author or applicable Scope |
| LOC4 | Literary | Writing corpus / Search / applicable Scope |
| LOC5 | MultiMedia | Media data / Search / applicable Scope |
| LOC6 | Governance／方法 | Governance Feature、Author governance、各 Scope governance |
| LOC7 | Text Architecture／Algorithm／KM | Analysis、Search、KM、FAQ/RAG 等各自分離的責任 |
| LOC8 | Life／Evolution | Evolution Feature、Event/Timeline/Trend/Trajectory |

歷史資料中的 LOC 編號可以保留；**Current 判斷永遠回到 Scope Model × Feature Model → Page Composition。**

---

## LunaRunes｜月之符文

月之符文固定為 **66 符**。

- 1–64：八組核心符文
- 65：玄（Chaos）
- 66：命（Fate）
- 第 0 符「德」是作者基準符，不列入抽牌

每張核心符文具有固定月相與四向語意：

- 正位
- 半正位
- 半逆位
- 逆位

1–64 每個八符組內，新月、上弦、滿月、下弦各出現兩次。

`LunaRune66.xlsx` 是符文母資料與最高優先來源；JSON、JavaScript、搜尋索引與畫面內容均屬衍生資料。

---

## 抽牌與 OW3gs

現行抽牌模式：

- 單卡
- 雙卡
- 三卡
- 五卡
- OW3gs 十一張

OW3gs 的結構：

- **1–6：因的描述層**
- **7–11：果的判定層**

雙卡、三卡、五卡與 OW3gs 均有各自語法與判讀結構；符文本體、抽牌順序、四向、月相與問題脈絡分層處理。

---

## Context 與 Evolution

### Context

Context 負責回答：

> A 跟 B 怎麼連？

現行功能包含：

- 符文脈絡 Graph · No API
- 節點
- 關係式
- Event
- Graph
- Graph RAG／bounded traversal
- 沙盒遊戲

Context 擁有 relation/context semantics；Search/Analysis 可消費其 Graph 做檢索與 traversal，但不取得資料 ownership。

### Evolution

Evolution 負責回答：

> 這些關係如何隨時間一起改變？

概念上：

```text
Context Graph × Time × Period × Event × Works → Evolution
```

現行 Evolution Feature 提供：

- 時期
- Timeline
- Trend
- Trajectory
- 符文資料歷程 · No API
- 符文結構時間線
- 符文關鍵詞趨勢
- 符文群組軌跡

符文演化另有 LunaRune-specific 演算法，不與一般 Evolution 趨勢計算混為一體。

---

## 現行時期（Period / ERA）

公開介面使用「**時期**」；內部 stable ID 可保留既有 `ERA-...`。時期資料的 authority 由適用 Scope 自己治理；不同 Scope 的 ERA 不因名稱相似而自動合併。

| 時期 | 日期 | 定位 |
|---|---|---|
| P1.0 | 1980-06-23 ～ 2003-12-15 | 學生時代 |
| P2.0 | 2003-12-16 ～ 2009-03-24 | 當兵入伍到公開網路文字之前 |
| P3.0 | 2009-03-25 ～ 2017-06-22 | 公開網路文字前期 |
| P4.0 | 2017-06-23 ～ 2024-11-17 | 2017-06-23 起 |
| P5.0 | 2024-11-18 ～ 2025-02-20 | Threads |
| P5.1 | 2025-02-21 ～ 2025-04-27 | Suno 啟用 |
| P6.0 | 2025-04-28 ～ 2025-10-15 | 《月語者》與月之符文開始 |
| P6.1 | 2025-10-16 ～ 2026-01-14 | LOC 啟動 |
| P6.2 | 2026-01-15 ～ 2026-03-08 | 微月光與關係敘事期 |
| P7.0 | 2026-03-09 ～ 2026-07-31 | 政德風 |
| P7.1 | 2026-08-01 ～ 2026-08-31 | 自由的風 |
| P7.2 | 2026-09-01 ～ 現在 | 自我治理 |

重要歷史切點：

- **2003-12-16**：入伍，明確人生轉折
- **2009-03-25**：目前已確認最早 Pixnet 公開網路文字
- **2010-02-10 11:34:28**：PTT `sopa1980` 註冊
- **2012-01-30**：〈老鼠〉，第一篇正式發表小說
- **2017-06-23**：切入 P4.0
- **2024-11-18**：Threads 開始，P5.0
- **2025-04-28**：《月語者》開始寫作，同時作為月之符文相關內容的 P6.0 起點
- **2026-03-09**：P7.0 政德風
- **2026-09-01**：P7.2 自我治理，Current

Facebook、PTT、Pixnet、Threads、Suno、小說與其他作品都視為不同 corpus / source；平台本身不是 LOC 的身份，也不各自擁有獨立功能頁。Timeline 由 Evolution Feature 承接。

---

## 早期文字與小說

目前已確認的早期公開文字起點為 Pixnet：

- **2009-03-25 10:15｜〈同情心？〉**

小說／創作歷史則另行治理，不把後來的潤稿版日期覆蓋首次發表日期。

已確認案例：

| 早期名稱 | 最早可確認日期 | 現行／潤稿版名稱 |
|---|---|---|
| [創作] 生日情人 | 2011-04-08 | 一日情人 |
| [創作] 我的兩個男朋友 | 2011-06-13 | 男男男關係 |
| [創作] 老鼠 | 2012-01-30 | 老鼠 |
| 假性單身 | 2015-03-25 | 假性單身 |
| 在你之前在你之後 | 2016-06-23 | 在你之前，在你之後 |
| 浮木 | 2021-03-12 | 錯的人 |

其中〈老鼠〉是第一篇正式發表小說。這些作品屬於早期一般文字創作 corpus，**不是符文文學**。後期版本是在既有故事脈絡上進行潤稿、擴寫、改名與正式發行。

---

## Search / Text Architecture

Search 是可跨 Scope 重用的 Feature；使用者不必先理解 LOC 編號，就能直接輸入關鍵字、作品名稱、句子或概念。

可查詢的主要類型包括：

- 月之符文
- 音樂／歌詞
- 文字作品
- 多媒體
- Governance／政德風
- Knowledge / KM
- Context / Relation
- 時期與時間資料

Graph RAG 的 relation/context authority 歸 Context；Search/Analysis 負責檢索與 traversal。KM 管理知識資產、來源、版本、關係與可追溯性，**不等於 RAG 或 Search**。

---

## 主要 corpus

目前 LOC 已累積多種長期語言與創作資料來源：

- Threads：4,578 筆主貼文 + 2,430 筆 Reply
- Suno：773 首歌曲
- Pixnet：66 篇文章
- PTT：`sopa1980` 公開發表紀錄
- Facebook：兩個帳號，資料持續匯出／整理
- 小說與文章：保留首次發表、原始版本、潤稿版與正式版關係

Corpus 是分析證據，不等於 Canon；Canon、原始作品、Registry、搜尋索引與 UI 各自分層治理。

---

## Governance / 政德風

Governance 是可跨 Scope 重用的治理 Feature／context；政德風則屬 lo3rwang Scope 的個人語言、文化與治理案例。

目前政德風進入：

**政德風 6.1｜改名後・自我治理期**

版本節點以真實人生重大日期與文字演化為依據；版本變化不覆蓋歷史原文。

治理原則包括：

- 原始資料保留原文
- 後設解讀與原始文本分開
- stable ID 優先維持
- 衍生資料不得反向覆寫母資料
- 允許修正，但保留來源與歷史

---

## 核心資料與文件

| 檔案 | 用途 |
|---|---|
| `LunaRune66.xlsx` | LunaRunes 母資料 / Single Source of Truth |
| `docs/LOC_Canon.docx` | LOC Canon 文件 |
| `docs/64LunaRune.docx` | 命運句語法圖鑑 |
| `docs/LunarRunesCardCut.pdf` | 紙本符文卡輸出 |
| `data/json/registries/LOC_LANGUAGE_SYSTEM_REGISTRY.json` | Current Scope / Feature architecture 與系統治理投影 |
| `governance` | 系統、資料與 Repository 治理入口 |
| `COPYLEFT.md` | Copyleft 治理說明 |

---

## Repository 結構

```text
moon-runes-pwa/
├── app/                 # Next.js Current UI / Page Composition
├── services/            # API / optional server capabilities
├── data/json/           # core / registries / search / generated / archive / experimental
├── docs/                # Canon、交換與必要技術文件
├── engine/              # 語意與向量實驗
├── tools/               # builders / importers / utilities
├── skills/              # LOC GPT Skills source directories
├── LunaRune66.xlsx
├── COPYLEFT.md
└── README.md
```

舊 HTML、舊 LOC 編號檔名與 legacy directories 若仍存在，視為 compatibility 或 provenance；不得因此反向定義 Current architecture。

---

## 技術

### Frontend
- Next.js / React
- Static export
- PWA / Service Worker where applicable

### Backend / Search
- Python
- FastAPI
- JSON registries
- Semantic / keyword retrieval
- RAG / Graph traversal

### GPT / Agent Skills
- `loc-km-governance`
- `loc-repo-health-check`
- Structured JSON output
- Python validators
- LOC framework-aware governance rules

### Data governance

```text
Current Canon / Master Data
        ↓
Scope / Registry / Structured Data
        ↓
Feature / Search / Generated Projection
        ↓
Page Composition / UI / API / Analysis
```

衍生層不得反向覆寫上游 Canon 或母資料。

---

## 授權

本專案以 **Copyleft** 精神發布。原創程式、資料結構、月之符文與 LOC 內容鼓勵研究、使用、修改與衍生，同時保留作者、來源、修改歷史與相容的共享原則。

完整說明見 [COPYLEFT.md](./COPYLEFT.md)。

第三方資料、私人 corpus、外部平台內容與另有授權限制的資產，不因本 repository 的 Copyleft 說明而自動重新授權。

---

## Author

**Lucas Oscar Wang 政德 lo3rwang**  
Language Governance Architect｜語言治理架構師 · Wordsmith｜文字工匠 · Calibrator｜校對者

- Website: <https://lo3rwang.cc/>
- LOC: <https://loc.lo3rwang.cc/>
- GitHub: <https://github.com/EsotericVerse>

> LOC 始於一副牌，但不止於一副牌。
