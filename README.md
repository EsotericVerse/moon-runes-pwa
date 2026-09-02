# 🌕 LOC｜月典（Luna Codex｜月之符文）PWA

由 [月語之境工作室（EsotericVerse）](mailto:esotericverse.xy@gmail.com) 建立的月之符文語言系統與 PWA 實作。

本專案以 HTML、CSS、原生 JavaScript 與 Python／FastAPI 組成，可透過 GitHub Pages 提供前端服務，並支援漸進式網頁應用程式（PWA）。

- **LOC＝月典**
- **Luna Codex＝月之符文**
- **現行 Canon：0.5r**
- **公開網站：<https://loc.lo3rwang.cc/>**
- **符文查詢：<https://loc.lo3rwang.cc/list.html>**

LOC 最初以正方形符文紙牌呈現，後來逐步發展為管理符文、創作、跨媒體表達、治理與文字結構的語言系統。

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
| [`64LunaRune.docx`](./64LunaRune.docx) | **命運句語法圖鑑**：整理符文四向語意、命運句與相關語法資料 |
| [`LOC_Canon_0.5r.docx`](./LOC_Canon_0.5r.docx) | **LOC Canon 0.5r**：現行系統定義、固定骨架與治理規則 |
| [`LunarRunesCardCut.pdf`](./LunarRunesCardCut.pdf) | **實際紙本卡片列印檔案**：供正方形月之符文卡牌輸出與裁切使用 |
| [`LunaRune64.xlsx`](./LunaRune64.xlsx) | **符文資料庫／最高優先母資料**：符文名稱、分類、定義、月相與四向語意的 Single Source of Truth |

文件分工：

- `LOC_Canon_0.5r.docx` 定義系統規則
- `LunaRune64.xlsx` 保存結構化符文母資料
- `64LunaRune.docx` 說明命運句與語法內容
- `LunarRunesCardCut.pdf` 將系統輸出為可實際使用的紙本卡牌

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
| LOC2 | Game | 桌遊、電子卡牌、條件、行動、規則與遊戲機制 |
| LOC3 | Music | 音樂創作、微月光、歌曲與歌詞語意搜尋 |
| LOC4 | Writing | 小說、角色、符文文本、世界觀與文字創作 |
| LOC5 | Resonance | 圖像、聲音、文字、MV、系統圖形與跨媒體概念視覺化 |
| LOC6 | Governance | 人生觀、價值觀、治理原則、生活語句、戰役紀錄與政德風 |
| LOC7 | Text Architecture | 文字建築學、語意關係、分類與語意向量框架 |
| LOC8 | Life | 統合 LOC1–7、生活應用、App 與跨域綜合項目 |

本 repository 主要呈現 LOC1／月之符文的實作，不等同於 LOC1–8 的全部內容。

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

### Python／FastAPI API

`card_api/` 是目前實際作用的 API 目錄，包含 FastAPI 主程式及應用所需的 JSON 資料，用於：

- 符文資料讀取
- 農曆日期及時間窗計算
- 單卡與多卡組合資料
- 占卜結果與建議規則處理

### 語意引擎實驗

`engine/` 是獨立的實驗目錄，保存語意向量、訓練資料、測試腳本與相關中間資料。其內容用於研究及驗證，不等同於 `card_api/` 的正式作用流程，也不代表完整 LLM、RAG 或 Graph RAG 已正式部署。

### PWA 功能

PWA 與 RWD 架構已於 2025 年 5 月完成，現行版本包含：

- 首頁載入後主動註冊 Service Worker
- 透過 `moon-runes-pwa-v7` 快取關鍵資源
- 更新時保留現行快取並清除舊版快取
- 支援新增至桌面／主畫面
- 提供 192×192、512×512 與 Apple Touch Icon
- 以 standalone 模式顯示
- 支援響應式桌機與行動版介面

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

RAG／LLM 屬於延伸解釋與整合方向，不代表已全面部署。Graph RAG 仍是研究或後續評估方向，不作為現行完成度宣稱。

---

## 📁 專案結構

```text
moon-runes-pwa/
├── 🏠 前端頁面
│   ├── index.html
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
│       ├── requirements.txt
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
├── 📚 Canon、語法與母資料
│   ├── LOC_Canon_0.5r.docx
│   ├── 64LunaRune.docx
│   ├── LunarRunesCardCut.pdf
│   └── LunaRune64.xlsx
├── 📱 PWA 與部署配置
│   ├── manifest.json
│   ├── service-worker.js
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── CNAME
├── 🗂️ 其他現存資料（待個別整理）
│   ├── LOC_2026.docx
│   ├── all.xlsx
│   ├── temp.json
│   └── mp3/
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

**月語之境工作室（EsotericVerse）**

- Email：[esotericverse.xy@gmail.com](mailto:esotericverse.xy@gmail.com)
- LOC：<https://loc.lo3rwang.cc/>
- 作者網站：<https://lo3rwang.cc/>
- GitHub：[@lo3rwang](https://github.com/lo3rwang)

---

## 📄 授權與署名

本專案以 Copyleft 精神發布。符文系統、語意結構與實作內容可供研究、使用與修改，但請保留來源標註並遵循相同共享精神。

**OW3gs made by OscarWang / LunarCodex / 王政德**

唯一作者：**Lucas Oscar Wang 政德**

---

**用微月光，照亮當下可前行的一步。**
