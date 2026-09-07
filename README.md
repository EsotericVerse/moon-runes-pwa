# 🌕 LOC｜月典（Luna Codex）

LOC（月典／Luna Codex）是一套用來**分析、拆解、組織、搜尋並推演語言**的語言系統框架。

系統以 LunaRunes（月之符文）作為語彙種子，從語彙延伸到脈絡、文字創作、多媒體、治理、文字建築與時間推演。月之符文是重要的 Reference Seed System，但不是使用 LOC 的門檻。

> 從語彙開始，延伸出文字創作與多元體系；它們在脈絡中彼此連結，透過演算法整合，並在時間中持續推演。

- **現行 Canon：0.5r**
- **Web Build：0.5**
- **公開網站：<https://loc.lo3rwang.cc/>**
- **作者：Lucas Oscar Wang 政德**
- **GitHub：<https://github.com/EsotericVerse/moon-runes-pwa>**

---

## 目前進度｜2026-09-08

目前已進入 **Demo 收斂與功能驗收階段**。核心骨架不再擴張，優先處理功能完整性、資料一致性與公開入口。

- **LOC1**：66 符固定骨架、單卡／雙卡／三卡／五卡／OW3gs、每日抽與月相顯示已具備；目前以解讀一致性與等待體驗收尾。
- **LOC2**：Context／Relation／Event／Graph 與 Semantic Playground 已有可展示實作；Graph 本體權責固定歸 LOC2。
- **LOC3**：Suno corpus 已整理至 773 首；歌曲／歌詞搜尋與時期分析已有基礎，後續補新歌同步與分類。
- **LOC4**：小說、文章、Pixnet、PTT、Threads 與 Facebook 等文字來源逐步納入統一 corpus；早期作品首次發表日期與後期潤稿版分開治理。
- **LOC5**：Reels、圖像、影音與系統視覺資產已有實際成果；目前以 Registry、來源對應與搜尋整合為主。
- **LOC6**：治理內容已統一收斂到 `governance.html`；政德風進入 **6.1｜改名後・自我治理期**。
- **LOC7**：KM、FAQ／RAG、Cross-format Search、Graph RAG 與 Simple Text Analysis 已有作用中基礎；下一步是更新 FAQ 到現行 Canon／時期／頁面架構。
- **LOC8**：`evolution.html` 已統一承接 Period、Timeline、Trend、Trajectory；Facebook／Threads／Pixnet／PTT／Suno 等只作 source，不再建立平台專屬 Timeline 頁。

### Demo 前目前優先順序

1. FAQ／KM 同步現行定義
2. 核心頁面功能驗收
3. 搜尋、Context、Evolution 的資料與 fallback 一致性
4. 最後再更新 tutorial01 / tutorial02

## Demo 入口

| 功能 | 頁面 | 說明 |
|---|---|---|
| 首頁 | [index.html](https://loc.lo3rwang.cc/) | LOC 總覽與主要入口 |
| 月之符文 | [runes.html](https://loc.lo3rwang.cc/runes.html) | 66 符、抽牌、每日抽、雙卡／三卡／五卡／OW3gs |
| 脈絡 | [context.html](https://loc.lo3rwang.cc/context.html) | 節點、關係式、Event、Graph、沙盒 |
| 多元搜尋 | [search.html](https://loc.lo3rwang.cc/search.html) | Cross-format Search：文字、音樂、多媒體、符文、脈絡與知識 |
| 推演 | [evolution.html](https://loc.lo3rwang.cc/evolution.html) | 時期、Timeline、Trend、Trajectory |
| 治理 | [governance.html](https://loc.lo3rwang.cc/governance.html) | 政德風、治理原則與方法 |
| LOC2 遊戲 | [loc2-game.html](https://loc.lo3rwang.cc/loc2-game.html) | Semantic Playground |
| 作者 | [lo3rwang.html](https://loc.lo3rwang.cc/lo3rwang.html) | Lucas Oscar Wang 政德 |

新手導覽：
- [tutorial01.html](https://loc.lo3rwang.cc/tutorial01.html)
- [tutorial02.html](https://loc.lo3rwang.cc/tutorial02.html)

---

## LOC 1–8

LOC1–8 是**功能分隔與標準骨架**，不是版本、成熟度或高低排序。

| LOC | 現行定位 | 主要內容 |
|---|---|---|
| LOC1 | LunaRunes 月之符文 | 66 符、籤詩、抽牌、月相、四向、OW3gs |
| LOC2 | Context 脈絡 | 節點、關係、Event、Graph、Semantic Playground |
| LOC3 | Music 音樂 | Suno、歌曲、歌詞與音樂語意 |
| LOC4 | Literary 文字創作 | 小說、文章、生活文字與創作 corpus |
| LOC5 | Media 多媒體 | 圖像、影音、Reels、系統視覺化 |
| LOC6 | Governance 治理 | 政德風、價值觀、治理句型與方法 |
| LOC7 | Text Architecture 文字建築 | KM、搜尋、RAG、Graph RAG、文字結構與演算法 |
| LOC8 | Evolution 推演 | 時期、時間線、趨勢、軌跡與跨來源時間分析 |

LOC 的功能關係可概括為：

```text
語彙
  ↓
文字創作／多元體系
  ↓
脈絡與關係
  ↓
演算法與文字建築
  ↓
時間中的推演
```

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

`LunaRune64.xlsx` 是符文母資料與最高優先來源；JSON、JavaScript、搜尋索引與畫面內容均屬衍生資料。

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

- 節點
- 關係式
- Event
- Graph
- Graph RAG
- 沙盒遊戲

### Evolution

Evolution 負責回答：

> 這些關係如何隨時間一起改變？

概念上：

```text
Context Graph × Time × Period × Event × Works → Evolution
```

現行 `evolution.html` 已提供：

- 時期
- Timeline
- Trend
- Trajectory
- 時期資料新增／編輯／刪除
- Event 新增／編輯／刪除

符文演化另有 LunaRune-specific 演算法，不與一般 Evolution 趨勢計算混為一體。

---

## 現行時期（Period / ERA）

公開介面使用「**時期**」；內部 stable ID 可保留既有 `ERA-...`。

### 大時期

| 時期 | 日期 | 定位 |
|---|---|---|
| P1.0 | 1980-06-23 ～ 2003-12-15 | 早期／大學時代文字 |
| P2.0 | 2003-12-16 ～ 2009-03-24 | 當兵入伍到公開網路文字之前 |
| P3.0 | 2009-03-25 ～ 2024-11-17 | 公開網路文字期 |
| P4.0 | 2024-11-18 ～ 2025-04-27 | Threads |
| P5.0 起 | 2025-04-28 ～ | 月符／月典形成後的現行階段 |

重要歷史切點：

- **2003-12-16**：入伍，明確人生轉折
- **2009-03-25**：目前已確認最早 Pixnet 公開網路文字
- **2010-02-10 11:34:28**：PTT `sopa1980` 註冊
- **2012-01-30**：〈老鼠〉，第一篇正式發表小說
- **2024-11-18**：Threads 開始
- **2025-04-28**：《月語者》開始寫作，作為 P5.0 起點

### P4 / P5 細分

| 時期 | 日期 | 名稱 |
|---|---|---|
| P4.1 | 2024-11-18 ～ 2025-02-20 | Threads開始啟動 |
| P4.2 | 2025-02-21 ～ 2025-04-27 | 《月語者》籌劃期 |
| P5.0 | 2025-04-28 ～ 2025-10-15 | 月符到月典形成期 |
| P5.1 | 2025-10-16 ～ 2026-01-14 | LOC啟動 |
| P5.2 | 2026-01-15 ～ 2026-03-08 | 微月光與關係敘事期 |
| P5.3 | 2026-03-09 ～ 2026-06-09 | 自我治理的啟動跟檢討 |
| P5.4 | 2026-06-10 ～ 2026-06-30 | 人生月台與療傷期 |
| P5.5 | 2026-07-01 ～ 2026-07-31 | 順其自然與劃清界線 |
| P5.6 | 2026-08-01 ～ 2026-08-31 | 自由的風的脫困期 |
| P5.7 | 2026-09-01 ～ 現在 | 自我治理與未來展望期 |

Facebook、PTT、Pixnet、Threads、Suno、小說與其他作品都視為不同 corpus / source；**平台本身不是 LOC 的身份，也不各自擁有獨立功能頁**。Timeline 由 Evolution 統一承接。

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

其中〈老鼠〉是第一篇正式發表小說。這些作品屬於 LOC4 早期一般文字創作，**不是符文文學**。後期版本是在既有故事脈絡上進行潤稿、擴寫、改名與正式發行。

---

## Search / Text Architecture

`search.html` 是 Cross-format Search 統一入口，目標是讓使用者不必先理解 LOC 編號，就能直接輸入關鍵字、作品名稱、句子或概念。

可查詢的主要類型包括：

- 月之符文
- 音樂／歌詞
- 文字作品
- 多媒體
- Governance／政德風
- Knowledge / KM
- Context / Relation
- 時期與時間資料

技術面由 `card_api/` 提供作用中的 FastAPI 與搜尋 API；資料集中於 `data/json/`，實驗性向量／語意程式保留在 `engine/`。

Graph RAG 的關係資料所有權仍歸 Context；LOC7 負責檢索、文字建築與演算法。

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

LOC6 承接治理原則、價值觀句型與政德風。

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
| `LunaRune64.xlsx` | LunaRunes 母資料 / Single Source of Truth |
| `docs/LOC_Canon.docx` | LOC Canon 0.5r |
| `docs/64LunaRune.docx` | 命運句語法圖鑑 |
| `docs/LunarRunesCardCut.pdf` | 紙本符文卡輸出 |
| `docs/LOC7_KM.md` | Knowledge Management 主文件 |
| `docs/JSON_DATA_MAP.md` | JSON 角色與同步方向 |
| `COPYLEFT.md` | Copyleft 治理說明 |

---

## Repository 結構

```text
moon-runes-pwa/
├── card_api/            # FastAPI / Search
├── data/json/           # core / registries / search / generated / archive / experimental
├── docs/                # Canon、KM、治理與技術文件
├── engine/              # 語意與向量實驗
├── js/                  # 前端邏輯
├── css/                 # 前端樣式
├── tools/               # builders / importers / utilities
├── 64images/            # 66 符文卡面
├── pics/                # 系統視覺資產
├── reels/               # 多媒體資產
├── index.html
├── runes.html
├── context.html
├── search.html
├── evolution.html
├── governance.html
├── loc2-game.html
├── lo3rwang.html
├── tutorial01.html
├── tutorial02.html
├── LunaRune64.xlsx
├── manifest.json
├── service-worker.js
├── COPYLEFT.md
└── README.md
```

根目錄 HTML 只保留目前仍有明確功能或展示責任的頁面；舊的單一平台 Timeline、舊 Projection、內部 KM Upload 與重複介紹頁已移除。

---

## 技術

### Frontend
- HTML
- CSS
- Vanilla JavaScript
- PWA / Service Worker

### Backend / Search
- Python
- FastAPI
- Uvicorn
- JSON registries
- Semantic / keyword retrieval
- RAG / Graph RAG

### Data governance

```text
Canon / Master Data
        ↓
Registry / Structured Data
        ↓
Search / Generated Index
        ↓
UI / API / Analysis
```

衍生層不得反向覆寫上游 Canon 或母資料。

---

## 授權

本專案以 **Copyleft** 精神發布。原創程式、資料結構、月之符文與 LOC 內容鼓勵研究、使用、修改與衍生，同時保留作者、來源、修改歷史與相容的共享原則。

完整說明見 [COPYLEFT.md](./COPYLEFT.md)。

第三方資料、私人 corpus、外部平台內容與另有授權限制的資產，不因本 repository 的 Copyleft 說明而自動重新授權。

---

## Author

**Lucas Oscar Wang 政德**  
Language Systems Governance Architect · Wordsmith

- Website: <https://lo3rwang.cc/>
- LOC: <https://loc.lo3rwang.cc/>
- GitHub: <https://github.com/EsotericVerse>

> LOC 始於一副牌，但不止於一副牌。
