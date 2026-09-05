# 🌕 LOC｜月典（Luna Codex｜月之符文）PWA

由 [秘藝文域（EsotericVerse Studio）](mailto:esotericverse.xy@gmail.com) 建立的月之符文語言系統與 PWA 實作。

本專案以 HTML、CSS、原生 JavaScript 與 Python／FastAPI 組成，可透過 GitHub Pages 提供前端服務，並支援漸進式網頁應用程式（PWA）。

- **LOC＝月典**
- **Luna Codex＝月之符文**
- **現行 Canon：0.5r**
- **公開網站：<https://loc.lo3rwang.cc/>**
- **符文查詢：<https://loc.lo3rwang.cc/list.html>**

LOC 最初以正方形符文紙牌呈現，後來逐步發展為管理符文、創作、跨媒體表達、治理與文字結構的語言系統。它統整作者兩年多累積的個人作品與人生觀，形成可持續延伸至遊戲、音樂、小說、視覺、治理及語意技術的語言框架。

> LOC 始於一副牌，但不止於一副牌。

---

## ✨ 主要特色

- 🎯 **多種抽取模式**：提供單卡、雙卡、三卡、五卡與每日抽取流程
- 🌙 **月相與四向語意**：結合符文固定月相、當日時間窗與四種卡牌方向
- 🧩 **66 符文固定骨架**：1–64 核心符文，加上 65「玄」與 66「命」
- 🔎 **符文資料查詢**：依群組與符文名稱瀏覽卡面及相關資料
- 🧠 **結構化建議實驗**：Python／FastAPI 測試符文資料、組合及規則式建議
- 📱 **PWA 已完成**：自 2025 年 5 月起具備安裝、桌面／主畫面啟動與離線快取
- 🎨 **響應式設計**：支援桌機與行動裝置顯示
- 📚 **Canon 與母資料治理**：文件、資料庫、衍生資料與應用分層管理

---

## 🧭 系統自我定義

### LOC 是什麼

LOC 是一套以符文作為基礎語意單位的語言系統。它透過符文組合、卡牌方向、月相及時間背景，協助使用者理解問題結構、當下狀態與可能的回應方向。

LOC 不以象徵的神聖性建立權威，而以定義、結構及資料一致性成立。

### LOC 不做什麼

- 不宣告不可改變的命定結果
- 不提供不可質疑的唯一答案
- 不替代使用者作出選擇
- 不隸屬、支持或批判任何宗教或信仰體系

> LOC 的核心不是預言未來，而是讓語言、作品與人生選擇擁有一致座標。

### 微月光原則

> 不照亮整條道路，  
> 只在困境中照亮當下能前行的一小段。

LOC 用於釐清問題、提供方向及協助理解結構，而不是替使用者裁決人生。

---

## 📚 核心文件與資料檔案

| 檔案 | 定位與用途 |
|---|---|
| [`64LunaRune.docx`](./docs/64LunaRune.docx) | **命運句語法圖鑑**：整理符文四向語意、命運句與相關語法資料 |
| [`LOC_Canon.docx`](./docs/LOC_Canon.docx) | **LOC Canon 0.5r**：現行系統定義、固定骨架與治理規則 |
| [`LunarRunesCardCut.pdf`](./docs/LunarRunesCardCut.pdf) | **實際紙本卡片列印檔案**：供正方形月之符文卡牌輸出與裁切使用 |
| [`LunaRune64.xlsx`](./LunaRune64.xlsx) | **符文資料庫／最高優先母資料**：符文名稱、分類、定義、月相與四向語意的 Single Source of Truth |

文件分工：

- `docs/LOC_Canon.docx` 定義系統規則
- `LunaRune64.xlsx` 保存結構化符文母資料
- `docs/64LunaRune.docx` 說明命運句與語法內容
- `docs/LunarRunesCardCut.pdf` 將系統輸出為可實際使用的紙本卡牌

---

## 🧩 66 符文固定骨架

LOC 的正式符文骨架共 66 符文，數量、編號與位置固定，不再新增、刪除或調換。

| 編號 | 定位 | 說明 |
|---|---|---|
| 1–64 | 核心符文 | 固定語意主體，具有名稱、分類、核心定義、固定月相與四向語意 |
| 65「玄」 | Chaos | 固定特殊符文 |
| 66「命」 | Fate | 固定特殊符文 |

### 第 0 符「德」

第 0 符「德」是作者基準符：

- 不列入 66 符文牌組
- 不參與一般抽取
- 不構成 LOC0
- 可保留於 Canon、索引與作者方法論說明中

完整符文內容可於 [LOC 符文查詢](https://loc.lo3rwang.cc/list.html) 瀏覽。

---

## ◰ 正方形卡牌與四向語意

四向語意來自 LOC 最初的正方形紙牌結構。同一張卡牌旋轉後形成：

- 正位
- 半正位
- 半逆位
- 逆位

方向改變語意的狀態、張力與閱讀角度，但不取代符文本身的核心定義。四向不是單純的吉凶好壞，也不是四張不同卡牌。

---

## 🌙 月相與時間窗

### 符文固定月相

1–64 每張核心符文皆具有固定月相：

- 新月
- 上弦
- 滿月
- 下弦

每個八符文組內，四種固定月相各出現兩次，以維持群組配置平衡。

### 應用層時間窗

目前程式依農曆日期提供額外的時間背景：

```text
農曆 1–7 日   → 新月
農曆 8–14 日  → 上弦
農曆 15–21 日 → 滿月
農曆 22–28 日 → 下弦
農曆 29–30 日 → 空亡
```

時間窗只作為占卜結果的額外說明與加權提示，不改寫符文本體語意。

---

## 🧱 語意分立

英文只作為註解標示，不參與中文符文的語意生成或構詞。

| 中文 | 英文註解 | 定義 |
|---|---|---|
| 無 | Blank | 一切皆有可能；值與內容尚未確定 |
| 虛 | Void | 空洞、未實化或結構尚未形成 |
| 空 | Space | 空間與位置維度 |
| 氣 | Breath | 流動、氣息與生命動勢 |
| 暗 | Shadow | 陰影及未被照見的部分 |
| 玄 | Chaos | 混沌與不可完全歸因的生成條件 |
| 誤 | Error | 錯置、偏差或辨識失準 |

---

## 🧭 LOC1–8｜八種分發與功能分工

LOC1–8 是固定的功能分隔與標準骨架，不是版本、排名、成熟度或高低優劣。編號到 8 為止，不存在 LOC9。

| 分發 | 名稱 | 功能定位 |
|---|---|---|
| LOC1 | Lots | 66 符文籤詩、四向判讀、抽取、多符文組合、每日抽取與趨勢 |
| LOC2 | Game / Scenario | 將符文語言放進真實情境：以雙卡因果描述狀況，並透過 Event、回應、共振與規則互動形成可處理的情境語料 |
| LOC3 | Music | 音樂創作、微月光、政德風、符文寫歌與歌詞語意檢索 |
| LOC4 | Writing | 文字分類、小說、角色、符文文本、世界觀與敘事創作 |
| LOC5 | Resonance | 圖像、聲音、文字、MV、系統圖形與跨媒體概念視覺化 |
| LOC6 | Governance / Interpretation | 人生觀、價值觀、治理原則、政德風，以及符文組合如何被轉譯為實際文字與敘事的解析實證 |
| LOC7 | Text Architecture / KM | 文字建築學、知識管理、檢索、關係結構與 Graph RAG 後續方向 |
| LOC8 | Integration / Temporal Management | 每日符文、事件、時期、時間線、狀態軌跡與跨分發統合 |

### 目前具現化成果

| 分發 | 現行成果與階段 |
|---|---|
| LOC1 | 66 符文固定資料、四向內容及每張符文的獨立圖卡均已完成；抽牌、查詢與每日抽取 PWA 已實際運作，並持續發展語意解讀。 |
| LOC2 | **LOC SP：Semantic Playground MVP v1.3 Alpha** 已完成核心循環、四大組態、八職業架構與首批 32 張事件卡，目前進入實體卡牌印製及桌面試玩驗證。 |
| LOC3 | 已累積大量「政德風」音樂作品，並建立歌曲資料及語意檢索實作。另曾以 LOC1 的 OW3gs 十一張抽牌解釋情境，再將解讀轉化為歌詞與歌曲，形成特殊的符文寫歌方式。 |
| LOC4 | 已建立文字分類，並完成以其為文本結構的七大篇長篇小說，全文約 22 萬字；另有其他小說與文字創作。 |
| LOC5 | **已有實際影音作品，不是僅停留在概念或視覺素材階段。** 除系統圖形、LOC1 的 66 張獨立符文圖卡與既有 LOC3 關聯 Reels 外，已確認至少兩支「月之符文」宣傳影片曾公開發布於 Instagram Reels，形成可驗證的 LOC1 × LOC5 跨媒體成果；本地影片資產亦正在回收整理至 repository。後續重點轉為媒體 Registry、來源對應與 Unified Search 整合，而非從零製作 LOC5 影片。 |
| LOC6 | 已形成政德風語錄、價值觀、治理與風格內容；另由《月語者》七篇章節大綱整理出 182 個章節槽位、180 筆具明確三符文紀錄的符文解析實證，保存「符文組合／方位／月相 → 實際敘事」的歷史對照。 |
| LOC7 | 已完成文字建築與 KM 基礎，現行 LOC7_KM v0.3、FAQ v0.4／RAG v0.4；Unified Search 已統一查詢 LOC1、LOC3、LOC4、LOC5、LOC6、LOC7、LOC8 的現有資料來源。完整 Knowledge Graph expansion／Graph RAG 仍屬後續階段。 |
| LOC8 | Life 頁面已有每日符文、時期、事件紀錄與事件時間線／軌跡等可操作視圖；現階段重點為資料同步、身份／多使用者架構、分析呈現與跨 LOC 引用，而不是從零建立入口。 |

LOC 目前不是只停留在概念層：LOC1–5 都已有可直接展示的實體作品或可運作成果；LOC6 已有治理／政德風與符文解析資料，LOC7 已有 KM／FAQ／RAG／Unified Search，LOC8 已有可操作的事件、時期與每日符文介面。這些內容多數源自作者的個人作品與人生經驗，LOC 則提供統整、關係化及後續延伸的共同骨架。

### LOC2｜Semantic Playground

LOC2 是一款把「理解語意」變成遊戲的桌遊。它以 Luna Codex 66 符文為基礎，不是傳統戰鬥卡牌，也不只是抽牌解籤。

> **世界提出問題 → 玩家用符文回答 → 不同答案彼此共振 → 形成暫時定義。**

玩家面對事件後，從手中的符文選出組合建立回答；不同玩家的回答會互相影響、比較與共振。遊戲真正關注的不是攻擊力，而是：面對同一個問題，每個人如何理解、如何回答，又如何面對別人的答案。

符文組合沿用 LOC1 的語意結構：

- 單卡：基本語意
- 雙卡：底層先查「兩符文的中性關係」，實際抽牌再依第 1 張＝因、第 2 張＝果形成因果投影
- 三卡：源－轉－合
- 五卡與十一卡：更完整的局勢與語意結構

雙卡關係與雙卡抽牌結果分開治理：`LOC6_DUAL_RUNE_RELATION_REGISTRY.json` 只保存 A＋B 的關係；抽牌順序、四向、問題與月相等條件則在 LOC1 interpretation runtime 疊加。

八職業也不是人格分類，而是八種回應世界的方法：承載、裁斷、校正、培育、承擔、導流、校準與保留未知。

目前的 **MVP v1.3 Alpha** 已完成核心循環、四大組態、八職業與首批 32 張事件卡，下一階段為實體卡牌印製與桌面試玩。電子版則可進一步計算方向、狀態、連鎖、多重條件及三卡、五卡、十一卡關係。

> **LOC2 是把 LOC 的語言做成可以互動、可以練習，也可以玩的形式。**

### LOC6｜政德風文字摘要

政德風是 LOC6 已形成的語錄、價值觀、語氣與語言治理系統，也是 LOC3 音樂、LOC4 小說及其他創作分發的重要風格來源。

> **政德風＝長話短說的極限：拆權威、斷話術、守底線。**

它將過往經驗整理成最簡單、能說也能「道」的「道」。其作用近似一套**語言人格防火牆**：

**拆劇本 → 斷頻率 → 反話術 → 回收主權 → 保持幽默 → 拒絕情緒勒索**

| 範圍 | 內容摘要 |
|---|---|
| 核心哲學 | 價值觀是衡量尺度；道德是價值觀的體現與換算規則。錯誤可以發生，但必須產生價值。 |
| 主權與意志 | 相信自己的判斷，保留選擇、拒絕、失敗及重新決定的權利。 |
| 斷頻率與反控制 | 不跟隨他人預設劇本；辨認控制、話術與偷渡規則，重新取得回答方式。 |
| 拆解代表權 | 追問「代表誰、依據什麼、誰授權」，拒絕人格、倫理、正義、群眾、制度與信仰挾持。 |
| 契約與價值 | 沒有共同同意與共同價值的單方面宣告，不構成契約。 |
| 邊界與防衛 | 慈悲不是投降；底線受到侵犯時，保留回應與自我防衛。 |
| 關係與生活 | 不依附關係取得主權；戰役結束後仍回到日常、探索與生活。 |
| 幽默與反轉 | 以短句、雙關、自嘲及現實落差，中止無效話術並降低其控制力。 |

代表句包括：

- 「價值觀的價值。」
- 「免錢的最貴。」
- 「我允許錯誤發生，只要錯的有價值。」
- 「我不跟你走劇本。」
- 「你在玩話術，我在改規則。」
- 「你代表正義？那我代表現實。」
- 「單方面宣告不叫契約，叫自言自語。」
- 「你說只有兩個選項，但我覺得有六個：你、他、尊重、我、我不想選、我不知道。」
- 「慈悲不是投降。」
- 「我不是要當王，我只要系統能跑。」

完整語錄保存為 LOC6 的內容庫；README 與介紹材料採摘要呈現。

本 repository 以 LOC1／月之符文為起點，現已逐步整合 LOC2–8 的可展示成果、資料 Registry、搜尋入口與系統文件；各分發的完整內容仍由其原始作品與知識來源保存。

---

## 🚀 功能詳解

### 主要入口（`index.html`）

- 顯示「玄」之符文作為起始卡面
- 提供主要抽取入口及操作說明
- 連結每日抽取、符文查詢與各種牌數模式
- 顯示固定月相與當日時間背景
- 將抽取結果導向結果頁面

### 抽取模式

- `result.html`：單卡、每日、雙卡、三卡與五卡結果入口
- `2card.html`／`3card.html`／`5card.html`：不同牌數的獨立頁面
- `daily.html`：每日抽取頁面
- `fate.html`：替代風格的單卡／命運結果呈現
- `list.html`：依群組及符文查詢完整資料
- [`search.html`](https://loc.lo3rwang.cc/search.html)：**Unified Search 主入口**；同時查詢籤詩／符文、音樂、文字作品、媒體、治理／政德風、知識與時期資料，使用者不必先選 LOC 編號
- [`faq.html`](https://loc.lo3rwang.cc/faq.html)：LOC7 Knowledge Base 專門查詢介面（保留作進階／單域 View）
- `loc3.html`：相容導向頁；LOC3 歌詞、作品類別、歌詞類型、ERA、Reels 與跨 LOC 關聯搜尋已整合進 [`search.html`](https://loc.lo3rwang.cc/search.html?content_type=lyrics_work)

### Python／FastAPI API

`card_api/` 是目前實際作用的 API 目錄，包含 FastAPI 主程式及應用所需的 JSON 資料，用於：

- 符文資料讀取
- 農曆日期及時間窗計算
- 單卡與多卡組合資料
- 占卜結果與建議規則處理
- Unified Search 跨 LOC 查詢與 facets（`/search`、`/search/facets`）
- LOC7 FAQ 語意檢索與依據式回答（`/faq/search`、`/faq/ask`）
- LOC3 歌詞作品層檢索與同詞版本推薦（`/loc3/search`、`/loc3/facets`）

### Unified Search

現行整合採 **「共用查詢層，不合併 Canon ownership」** 的方式：

```text
自然語言 Query
      ↓
Unified Search
      ├─ LOC1  籤詩／月符
      ├─ LOC3  歌曲／歌詞
      ├─ LOC4  文字作品
      ├─ LOC5  Reels／媒體 Registry
      ├─ LOC6  治理／政德風
      ├─ LOC7  FAQ／KM／Knowledge Assets
      └─ LOC8  時期／時間脈絡
      ↓
Shared Result Envelope
```

LOC4 已可直接搜尋 Writing Registry，LOC5 可搜尋 Media Registry，LOC6 可直接搜尋 Governance／政德風 Registry，LOC7 讀取 FAQ／KM 與已登錄 Knowledge Assets，LOC8 讀取連續時期 Registry。LOC2 目前仍以 LOC7 Knowledge View 為主，尚未作為獨立結果群組直接路由。

不同來源的搜尋分數維持各自尺度，前端依資料類型分組呈現，不把不同引擎的 score 強制混成單一排行榜。舊有 `faq.html`、`loc3.html` 保留為專門 View，`search.html` 作為整合入口。

### 語意引擎實驗

`engine/` 是獨立的實驗目錄，保存語意向量、訓練資料、測試腳本與相關中間資料。其內容用於研究及驗證，不等同於 `card_api/` 的正式作用流程，也不代表完整 LLM、RAG 或 Graph RAG 已正式部署。

### PWA 功能

PWA 與 RWD 架構已於 2025 年 5 月完成，現行版本包含：

- 首頁載入後主動註冊 Service Worker
- 透過 `moon-runes-pwa-v104` 快取關鍵資源（包含FAQ查詢頁）
- 更新時保留現行快取並清除舊版快取
- 支援新增至桌面／主畫面
- 提供 192×192、512×512 與 Apple Touch Icon
- 以 standalone 模式顯示
- 支援響應式桌機與行動版介面

---

## 🧠 KM 文件治理

LOC7_KM 採 **Markdown-first, structured-data-native**：

- `docs/LOC7_KM.md`：repository 內可維護 KM 主文件
- `docs/JSON_DATA_MAP.md`：JSON 角色與同步方向
- `data/shared/*.json`：跨 LOC 結構化 registry
- FAQ v0.4 為 KM 問答 View；RAG v0.4 為其檢索衍生資料
- 下游 JSON／索引／UI／AI 推論不得反向覆寫 Canon、母資料或原始作品

詳見 [docs 文件索引](./docs/README.md)。

---

## 🗃️ 母資料治理

`LunaRune64.xlsx` 是 LOC 符文母資料與最高優先資料來源（Single Source of Truth）。

```text
LunaRune64.xlsx
        ↓
JSON／JavaScript／其他衍生資料
        ├── 網站與符文查詢
        ├── 抽取系統與 PWA
        ├── 作品
        └── 其他應用
```

治理原則：

- 修改由母資料源頭發起並向下同步
- 衍生端不得反向覆寫 Canon 母資料
- 網站、作品與應用是平行分支，不是彼此依序產生
- 66 符文固定骨架與應用內容分開治理
- 不直接在 `64images/` 或衍生 JSON 中新增第 67 個符文

---

## 🧠 語意技術方向

LOC 的語意技術以可檢索、可組合及可解釋為目標。

LOC3 現行 demo 主要採用：

```text
資料 → Embedding → FAISS → 語意搜尋結果
```

LOC7 FAQ v0.4 已整理 80 題公開 FAQ，並同步產生 RAG v0.4 檢索資料，提供 [`faq.html`](https://loc.lo3rwang.cc/faq.html) 作為專門 Knowledge View，並在 `card_api/` 提供 `/faq/search` 與 `/faq/ask`。Unified Search 則把 FAQ／KM 與 LOC1、LOC3、LOC4、LOC5、LOC6、LOC8 的現有資料來源放進同一查詢入口。完整 Graph RAG 仍是後續方向，不作為現行完成度宣稱。

---

## 📁 專案結構

```text
moon-runes-pwa/
├── 🏠 前端頁面
│   ├── index.html
│   ├── faq.html
│   ├── list.html
│   ├── daily.html
│   ├── 2card.html
│   ├── 3card.html
│   ├── 5card.html
│   ├── result.html
│   └── fate.html
├── 🎨 樣式與圖像
│   ├── css/
│   │   └── style.css
│   ├── 64images/
│   │   └── 01_靈.png … 66_命.png
│   └── icons/
│       ├── icon-192x192.png
│       └── icon-512x512.png
├── ⚙️ 前端邏輯
│   └── js/
│       ├── main.js
│       ├── list.js
│       ├── daily.js
│       ├── 2card.js
│       ├── 3card.js
│       ├── 5card.js
│       ├── result.js
│       ├── fate.js
│       ├── direction64.js
│       ├── runeLibrary.js
│       └── 符文衍生資料檔
├── 🐍 實際作用 API
│   └── card_api/
│       ├── main.py
│       ├── faq_rag.py
│       ├── FAQ_API.md
│       ├── requirements.txt
│       ├── data/
│       │   ├── LOC_FAQ_v0.1.json … LOC_FAQ_v0.3.json
│       │   └── LOC_FAQ_RAG_v0.1.json … LOC_FAQ_RAG_v0.3.json
│       ├── new_runes.json
│       ├── runes_all_data.json
│       └── three_card_combinations.json
├── 🧪 語意引擎實驗
│   └── engine/
│       ├── combined_embeddings.npy
│       ├── combined_meta.json
│       ├── training_data.json
│       └── 其他測試腳本與實驗資料
├── requirements.txt
├── render.yaml                  # 指向 card_api/ 的 Render Blueprint
├── 📚 KM 與文件
│   └── docs/
│       ├── README.md
│       ├── LOC7_KM.md
│       ├── JSON_DATA_MAP.md
│       └── 其他發布文件
├── 📚 Canon、語法與母資料
│   ├── docs/LOC_Canon.docx
│   ├── docs/64LunaRune.docx
│   ├── docs/LunarRunesCardCut.pdf
│   └── LunaRune64.xlsx
├── 📱 PWA 與部署配置
│   ├── manifest.json
│   ├── service-worker.js
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── CNAME
└── README.md
```

---

## 🛠️ 技術架構

### 前端

- HTML5
- CSS3
- 原生 JavaScript
- PWA：Service Worker＋Web App Manifest
- 農曆計算：`solarlunar`

### 作用中 API（`card_api/`）

Render Blueprint 已指向 `card_api/`，使用 `uvicorn main:app` 啟動 FastAPI。

- Python
- FastAPI
- Uvicorn
- Pydantic
- `zhdate`
- JSON 結構化資料
- LOC7 FAQ 中文混合檢索（Python 標準函式庫）

### 實驗引擎（`engine/`）

- 語意向量與 Embedding 資料
- 訓練及測試資料
- Python 實驗腳本
- 尚未納入正式 API 流程的研究內容

### 瀏覽器

建議使用近期版本的 Chrome、Firefox、Safari 或 Edge。行動版支援 iOS Safari 與 Android Chrome；實際離線能力依瀏覽器的 PWA 與 Service Worker 支援而定。

---

## 🎨 維護指南

### 修改符文資料

1. 先修改最高優先母資料 `LunaRune64.xlsx`
2. 依既有同步流程重新產生 JSON／JavaScript 衍生資料
3. 核對 `64images/` 中的卡面檔名與編號
4. 測試符文查詢及所有抽取模式
5. 不得直接新增、刪除或調換 66 符文

### 修改樣式

主要樣式位於 `css/style.css`，可調整色彩、版面、響應式配置與動畫效果。

### 擴展功能

新增抽取或顯示模式時，可參考 `js/main.js`、`js/result.js` 與既有牌數模式。功能擴展不得改寫 Canon 固定骨架。

---

## 🙌 貢獻指南

歡迎針對程式、介面、文件及可驗證資料問題提出 Issue 或 Pull Request。

1. Fork repository 並建立功能分支
2. 完成修改與測試
3. 說明是否影響母資料、衍生資料或應用層
4. 發送 Pull Request 進行討論

Canon、66 符文、編號與固定位置不接受任意增刪；相關提案應先說明資料依據及治理影響。

---

## OW3gs 與個人規則層

OW3gs 是作者的方法論與個人規則層，不等同於 LOC 的全部 Canon。

### 7–11 法則

- 第 1–6 張：狀況分析
- 第 7–11 張：核心判定區間

此法則屬於作者個人規則層，不改變 LOC 的通用符文骨架。

---

## 📞 聯絡資訊

**秘藝文域（EsotericVerse Studio）**

- Email：[esotericverse.xy@gmail.com](mailto:esotericverse.xy@gmail.com)
- LOC：<https://loc.lo3rwang.cc/>
- 作者網站：<https://lo3rwang.cc/>
- 社群帳號：[@lo3rwang](https://lo3rwang.cc/)
- GitHub：[@EsotericVerse](https://github.com/EsotericVerse)

---

## 📄 授權與署名

本專案以 Copyleft 精神發布。符文系統、語意結構與實作內容可供研究、使用與修改，但請保留來源標註並遵循相同共享精神。

**OW3gs made by OscarWang / LunarCodex / 王政德**

唯一作者：**Lucas Oscar Wang 政德**  
**Language Systems Governance Architect (LOC) · Wordsmith · Moon Resonator**

---

**用微月光，照亮當下可前行的一步。**
