# 🌕 LOC｜月典（Luna Codex｜月之符文）

由 **EsotericVerse** 建立的月之符文語言系統與 PWA 實作。

- **LOC＝月典**
- **Luna Codex＝月之符文**
- **現行 Canon：0.5r**
- **公開網站：<https://loc.lo3rwang.cc/>**
- **符文查詢：<https://loc.lo3rwang.cc/list.html>**

LOC 最初以正方形符文紙牌呈現，後來逐步發展為管理符文、創作、跨媒體表達、治理與文字結構的語言系統。

> LOC 始於一副牌，但不止於一副牌。

---

## 核心定位

LOC 以固定符文、四向語意與 LOC1–8 功能分工建立共同的語言座標，使符文、抽籤、遊戲、音樂、文字、圖像、治理原則與生活應用能共享一致的語意骨架。

LOC 的核心不是預言未來，而是讓語言、作品與人生選擇擁有一致座標。

---

## 核心文件與資料檔案

| 檔案 | 定位與用途 |
|---|---|
| [`64LunaRune.docx`](./64LunaRune.docx) | **命運句語法圖鑑**：整理符文四向語意、命運句與相關語法資料 |
| [`LOC_Canon_0.5r.docx`](./LOC_Canon_0.5r.docx) | **LOC Canon 0.5r**：現行系統定義、固定骨架與治理規則 |
| [`LunarRunesCardCut.pdf`](./LunarRunesCardCut.pdf) | **實際紙本卡片列印檔案**：供月之符文正方形卡牌輸出與裁切使用 |
| [`LunaRune64.xlsx`](./LunaRune64.xlsx) | **符文資料庫／最高優先母資料**：符文名稱、分類、定義、月相與四向語意的 Single Source of Truth |

文件彼此分工如下：

- `LOC_Canon_0.5r.docx` 定義系統規則
- `LunaRune64.xlsx` 保存結構化符文母資料
- `64LunaRune.docx` 說明命運句與語法內容
- `LunarRunesCardCut.pdf` 將系統輸出為可實際使用的紙本卡牌

---

## 66 符文固定骨架

LOC 的正式符文骨架共 66 符文，數量、編號與位置固定，不再新增、刪除或調換。

| 編號 | 定位 | 說明 |
|---|---|---|
| 1–64 | 核心符文 | 固定語意主體，具有名稱、分類、核心定義、固定月相與四向語意 |
| 65「玄」 | Chaos | 固定特殊符文 |
| 66「命」 | Fate | 固定特殊符文 |

### 第 0 符「德」

第 0 符「德」是作者基準符，用於標示系統的承載基準與作者位置：

- 不列入 66 符文牌組
- 不參與一般抽取
- 不構成 LOC0
- 可保留於 Canon、索引與作者方法論說明中

完整符文內容可於 [LOC 符文查詢](https://loc.lo3rwang.cc/list.html) 瀏覽。

---

## 正方形卡牌與四向語意

四向語意來自 LOC 最初的正方形紙牌結構。同一張卡牌旋轉後形成四個閱讀方向：

- 正位
- 半正位
- 半逆位
- 逆位

方向改變語意的狀態、張力與閱讀角度，但不取代符文本身的核心定義。四向不是單純的吉凶好壞，也不是四張不同卡牌。

1–64 的固定月相為：

- 新月
- 上弦
- 滿月
- 下弦

每個八符文組內，四種固定月相各出現兩次，以維持群組配置平衡。

---

## LOC1–8｜八種分發與功能分工

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

---

## 母資料治理

`LunaRune64.xlsx` 是 LOC 符文母資料與最高優先資料來源（Single Source of Truth）。

資料流向：

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
- Canon 固定骨架與應用內容分開治理

---

## 現有實作

本 repository 已包含可實際運作與查閱的 LOC1／月之符文內容：

- 符文清單與查詢
- 每日抽取
- 單卡、雙卡、三卡與五卡流程
- 結果顯示與命運頁面
- 符文卡面與圖像資料
- PWA 安裝與離線支援
- 響應式桌機與行動版介面
- 母資料、JSON／JavaScript 衍生資料及相關文件

本專案是 LOC 的實作載體之一，不等同於 LOC1–8 的全部內容。

---

## 語意技術方向

LOC 的語意技術以可檢索、可組合及可解釋為目標。

LOC3 現行 demo 主要採用：

```text
資料 → Embedding → FAISS → 語意搜尋結果
```

RAG／LLM 屬於延伸解釋與整合方向，不代表已全面部署。Graph RAG 仍是研究或後續評估方向，不作為現行完成度宣稱。

---

## OW3gs 與個人規則層

OW3gs 是作者的方法論與個人規則層，不等同於 LOC 的全部 Canon。

### 7–11 法則

在 OW3gs 的個人抽取規則中：

- 第 1–6 張：狀況分析
- 第 7–11 張：核心判定區間

此法則屬於作者個人規則層，不改變 LOC 的通用符文骨架。

---

## 專案結構

```text
moon-runes-pwa/
├── README.md
├── LOC_Canon_0.5r.docx
├── 64LunaRune.docx
├── LunarRunesCardCut.pdf
├── LunaRune64.xlsx
├── index.html
├── list.html
├── daily.html
├── 2card.html
├── 3card.html
├── 5card.html
├── result.html
├── fate.html
├── 64images/
├── card_api/
├── engine/
├── js/
├── css/
├── manifest.json
└── service-worker.js
```

---

## 授權與署名

本專案以 Copyleft 精神發布。符文系統、語意結構與實作內容可供研究、使用與修改，但請保留來源標註並遵循相同共享精神。

**OW3gs made by OscarWang / LunarCodex / 王政德**

唯一作者：**Lucas Oscar Wang 政德**  
GitHub：[@lo3rwang](https://github.com/lo3rwang)  
Website：<https://lo3rwang.cc/>

---

用月之頻率，與語言共鳴。
