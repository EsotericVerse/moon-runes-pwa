# LOC Current State & Demo Roadmap

> 狀態：Current / Working  
> 日期：2026-09-05  
> 用途：記錄 LOC 現行核心定義、已決定架構、Demo 完成度、可立即執行事項、待驗證缺口與下一階段優先順序，避免後續重複討論與重新決策。

---

## 1. LOC 的基本定義

**LOC（Luna Codex／月典）是一套語言系統框架。**

這個基本定位不因網站、RAG、Graph、歌曲、遊戲或任何單一功能而改變。

LOC 的角色不是把八個獨立產品放在一起，而是：

1. 承接不同型態的語言資料；
2. 保留各資料來源、權責與 provenance；
3. 透過共同檢索、關聯、時間與趨勢結構形成整體；
4. 記錄語言如何形成、延伸、跨媒介轉換與演化；
5. 為尚未形成的語言模式保留未知與未來擴展空間。

### 1.1 月之符文與 LOC 的層級

**月之符文（Luna Runes）是種子／根；LOC 是框架。**

月之符文位於最底層，提供穩定的語意參照種子。LOC 建立在這個根之上，負責讓符文與後續生成的語言資料被記錄、分類、關聯、檢索與分析。

簡化表示：

```text
Luna Runes（月之符文）
＝語意種子／根
        ↓
LOC Language System Framework
        ↓
LOC1–8 責任框架
        ↓
不同型態的語言資料
        ↓
RAG / Relation / Trend
        ↓
語言演變與未知進化
```

### 1.2 LOC 統合的是「不同型態的語言資料」

例如：

- 符文、四向、Lots 籤詩
- 情境與 Event
- 歌曲與歌詞
- 創作文字、文章、小說
- 圖像、Reels、MV、多媒體影片
- 政德風、治理語句、價值判斷
- Knowledge Assets、FAQ、分析文件
- ERA、事件、時間狀態
- 各種跨 LOC 關係與趨勢

LOC 不是一般資料倉庫；它關注的是**能承載語言、語意、敘事、表達、狀態與脈絡的資料**。

---

## 2. 月之符文的獨特性

月之符文不是要求使用者先學會一套陌生符號系統。

它的優勢是：

- 以中文字義作為低門檻入口；
- 基本解牌可先看名稱、方向與籤詩，不必背完整 66 符文；
- 使用者只要對文字本身有足夠理解，就能開始使用；
- 符文可作為穩定語意參照點；
- 後續可由實際使用長出歌詞、文章、多媒體、治理與關係資料；
- 當資料與關係累積到足夠程度時，可被 LOC 記錄為更高階的演化結構。

### 2.1 未知演化

月之符文的「演化」不是預先規定的技能樹，也不是 AI 自動補造世界觀。

正確原則是：

> **資料真的長出來，LOC 才記錄它已經長出來。**

例如：

```text
界
├─ 基本定義
├─ 四向
├─ Lots
├─ 實際抽牌
├─ 符文歌
├─ 相關歌詞
├─ 文章
├─ Reels / 影片
├─ 治理語句
├─ 時期變化
└─ 其他後續未知關係
```

因此月之符文具有：

**低進入門檻 + 高演化上限。**

---

## 3. LOC Framework 與 66 月符的關係

LOC Framework 原則上不必綁死 66 月符。

其他人可以用自己的語意種子系統，例如：

- 81 月符
- 36 日符
- 其他自建概念／符號 vocabulary

只要建立穩定 seed corpus，就可以依 LOC 框架方式進行情境、作品、關係、RAG 與趨勢分析。

但目前 **66 月符是 LOC 最完整、已有實際演化證據的 Reference Seed System**。

它已有：

- 固定符文資料
- 四向語意
- Lots 籤詩與多面向提示
- 實際抽牌
- 符文歌
- 文字延伸
- 多媒體實例
- LOC2 沙盒
- ERA 與關係證據

因此別人可以重做自己的 seed system，但真正昂貴的是後續的**時間成本、語料成本與關係證據累積**。

---

## 4. LOC1–8 現行責任

### LOC1｜Lots / Seed Corpus
- 月之符文語意種子
- 66 符文資料
- 四向
- Lots 籤詩
- 抽取與多卡語法入口
- 是 RAG 的第一層 Seed Corpus，不是 Search 之外的例外

### LOC2｜Semantic Playground / Simulation
- 語意沙盒
- Event / Scenario
- 玩家用符文回答問題
- 回應、互動、共振與暫時定義
- 讓符文從「被理解」進入「被測試」
- 是 LOC 的 Semantic Simulation Layer

### LOC3｜Music
- 歌曲
- 歌詞
- 符文歌 provenance
- ERA 音樂證據
- reasoning / proposition metadata

### LOC4｜Writing
- 創作文字
- 文章
- 小說
- 角色與敘事作品
- 歌曲轉文章、主題曲等跨媒介文字關係

### LOC5｜Resonance / Multimedia
- 圖像
- Reels
- MV
- 影片
- 聲音 × 文字 × 視覺
- 符文與作品的多媒體演化證據

### LOC6｜Governance / Interpretation
- 政德風
- 人生觀、價值觀、治理原則
- 語氣、命題、判斷方式
- 符文／作品如何被轉譯成文字與治理意義
- ERA 間的風格差異分析

### LOC7｜Knowledge Management / RAG / Graph Structure
- Knowledge Assets
- KM
- Text Architecture
- Relationship Schema
- Retrieval
- RAG
- Graph 結構與後續多跳擴展
- **所有 LOC 的文字搜尋統一由 LOC Search / LOC RAG 管理**

### LOC8｜Context / Relation & Trend
LOC8 的現行核心是**事件、時期、關係、軌跡與趨勢分析**，時間只是其中一個投影維度。

目前已實作：

- 每日符文紀錄與近期趨勢
- Event 新增／修改／刪除與 Current State
- ERA 時期直接新增／修改／刪除（顯示即管理）
- Event Timeline：回答「什麼時候發生什麼」
- Relation Library：保存節點與節點之間的關係
- 軌跡 Trajectory：呈現狀態／時期如何一路轉變
- 趨勢分析 Analysis：比較相鄰 LOC3 時期的關鍵字／語義家族比重升降，並搭配文字轉折說明
- Context：統合 Relation、Trajectory、Analysis，作為 Graph-ready 的脈絡工作區
- 跨 LOC 的時間、作品、概念與 Event 引用

目前 Graph 視圖仍為後續，不應宣稱完整 Knowledge Graph / Graph RAG 已完成。

因此：

> LOC6 負責意義／治理判斷；  
> LOC7 建立與管理知識／檢索結構；  
> LOC8 記錄事情何時發生、如何沿時間改變，並把跨 LOC 資料放回同一段脈絡。

---

## 5. LOC Search 的正式定位

### 5.1 名稱

- 介面簡稱：**LOC 搜尋引擎**
- 技術層名稱：**LOC Unified Search / RAG retrieval layer**

### 5.2 原則

**LOC1–8 保留各自資料權責；Unified Search 是共同的文字查詢與結果整合入口。**

各 LOC 頁面可以保留：

- 瀏覽
- 展示
- 操作
- 遊戲
- 抽牌
- 圖鑑
- 視覺化

但不再各自維護文字搜尋。

### 5.3 Graph RAG 的真正樣子

LOC Search 的終局不是作品展示器，而是：

```text
Query
 ↓
Semantic / Keyword Retrieval
 ↓
找到 Seed / Knowledge Object
 ↓
Relationship Expansion
 ↓
跨 LOC 展開
 ↓
Temporal / Trend Analysis
```

其 Graph 節點可包括：

- Rune
- Lots
- Event
- Song
- Lyrics
- Writing Work
- Reel / Media
- Governance Statement
- Knowledge Asset
- ERA
- Event / Time State

Edge 可包括：

- source_of
- derived_from
- expanded_to
- adapted_to
- theme_of
- rune_draw_provenance
- semantically_related
- belongs_to_era
- evolves_from
- temporal_before / after
- cross_media_relation

### 5.4 現況限制

目前已有 Shared Registry、cross-relationship 資料與 related_ids 等關係基礎，但完整 Relation Schema、Knowledge Graph expansion 與 multi-hop Graph RAG 尚未完成。

因此現況稱呼：

- **LOC Integrated Demo：成立**
- **Unified Search：已有實作**
- **Graph relationship groundwork：已有部分資料基礎**
- **完整 Graph RAG：尚未完成**

---

## 6. 籤詩模式的正確 Demo 流程

籤詩模式是 LOC Search 的一個 retrieval mode，不是 LOC1 的獨立搜尋器。

例如：

> 我今天想問愛情問題，抽到心半正。

流程：

1. 解析 Rune = 心
2. 解析 Direction = 半正位
3. 解析 Question Domain = 愛情
4. 讀取 `lots.json`
5. **先顯示對應籤詩**
6. **再一次列出該符文／方向的各面向建議**
7. 顯示符文與方位原文
8. 取出可驗證關鍵字
9. 不先做抽象語意分析
10. 以關鍵字檢索：
   - 歌詞
   - 文字作品
   - 多媒體
   - 文件／KM
   - ERA
   - 其他已建立的關係

原則：

> **籤詩是回答；RAG 是延伸。**

而不是讓作品結果蓋掉原本 Lots 的正式提示。

---

## 7. Demo 現在已經完成什麼

以「能否展示 LOC 的核心價值」衡量，綜合 Demo 已完成很大一部分。

目前可展示：

- LOC1 抽牌／籤詩／Seed Corpus
- LOC2 Semantic Playground Alpha
- LOC3 歌曲／歌詞資料
- LOC4 Writing Registry 與部分作品關係
- LOC5 Media Registry 與已知 Reels
- LOC6 政德風／治理／演變分析
- LOC7 KM / RAG / Search
- LOC8 每日符文／ERA CRUD／Event Timeline／Relation／Trajectory／Analysis
- Search-first 統一入口
- FAQ 與 LOC3 specialist search 已整合／redirect
- LOC1 Seed Corpus 已進 Knowledge Asset
- 籤詩 keyword-first retrieval mode 已開始實作

現在真正要做的是：

> **收斂、補資料、驗證，不是繼續無限制新增功能。**

---

## 8. 首頁可先決定的 UI 架構

首頁不再需要 LOC1–8 八個大型展示區。

### 保留大型 Demo

#### A. LOC1
- 抽牌
- 籤詩
- 月符圖鑑入口
- Seed Corpus 的實際使用

#### B. LOC2
- Semantic Playground
- Event / Scenario
- 沙盒演練

#### C. LOC RAG / LOC7
- 統一搜尋
- 籤詩／符文／歌詞／文字／多媒體／治理／知識／時期
- Graph / Relation 展開
- 作為整個 LOC 的知識入口

### 小型責任方塊

另用 8 個簡潔文字方塊說明 LOC1–8 各自負責什麼。

其中 LOC3–6、8 不必各自佔大型首頁區塊，詳細內容由 Search 結果與 Knowledge Assets 展開。

---

## 9. 現在可以先鎖定的決策

以下可以視為 **Stable / Current**：

1. LOC 是語言系統框架。
2. 月之符文是種子／根；LOC 是框架。
3. LOC 統合的是不同型態的語言資料。
4. 66 月符是目前 LOC 的 Reference Seed System，但不是理論上唯一可接入的 seed vocabulary。
5. LOC1–8 是責任分工，不是八套產品。
6. LOC1 Seed Corpus 是 RAG 的正式一部分。
7. LOC2 是 Semantic Playground / Simulation Layer。
8. LOC7 管 KM、RAG、Graph structure 與全 LOC 文字檢索。
9. LOC8 核心定位為 Context / Relation & Trend Analysis。
10. 時間線／ERA 是「關係」的一個維度；Trajectory 與 Analysis 分別負責演變投影與變化證據解讀。
11. LOC Search 是唯一文字搜尋入口。
12. Search 介面簡稱「LOC 搜尋引擎」，正式技術名「LOC RAG 語意向量搜尋」。
13. 籤詩模式先 Lots、再多面向、再 keyword retrieval。
14. 各 LOC 保留 canonical ownership；Search 不合併 ownership。
15. 「介面統一，資料分責；搜尋統整，關係展開。」
16. 演化必須 evidence-driven，不由 AI 自行宣告。

---

## 10. 現在還不應鎖死的項目

以下保留 **Working / Pending**：

1. Graph traversal 的最終演算法。
2. 全域 ranking 是否需要單一 score。
3. Embedding model 的最終選型。
4. 是否全面 FAISS、改用 vector DB，或混合檢索。
5. 多媒體 embedding 的最終格式。
6. LOC8 趨勢模型的統計／圖模型細節。
7. 符文「演化條件滿足」的正式 threshold。
8. 其他 seed system（81 月符／36 日符）的正式接入 schema。
9. Graph edge type 的最終 Canon vocabulary。
10. Production API / authentication / multi-user 架構。

---

## 11. 下一階段最值得做的事

### Priority A｜Demo 收斂
- 簡化首頁
- LOC1 / LOC2 保留大型操作展示
- LOC RAG 成為第三個主核心
- LOC1–8 改成小型責任方塊

### Priority B｜Search Corpus 補齊
- LOC2 規則完整進 KM / Search
- LOC4 corpus migration
- LOC5 歷史 Reels / Media Registry 回補
- LOC6 Governance direct search
- LOC8 Relation / Trend results

### Priority C｜Golden Queries
至少固定四個 Demo 驗收案例：

#### 1. 心半正＋愛情
驗證：
- Lots
- 全面向建議
- 關鍵字
- 歌詞
- 文字
- 多媒體
- KM
- ERA

#### 2. 已讀不回
驗證：
- LOC3 歌曲
- 歌詞
- LOC4 六章文章
- LOC5 Reels
- LOC6 解讀
- ERA / Relation

#### 3. 界
驗證：
- 基本符文
- 四向
- Lots
- 符文歌 provenance
- semantic related works
- 邊界治理文字
- 多媒體
- ERA 演變

#### 4. LOC2 怎麼玩
驗證：
- 完整規則
- Scenario Model
- Event 32
- Semantic Playground

### Priority D｜Graph RAG
在 corpus 與 relationship registry 足夠後，再補：
- relation expansion
- multi-hop
- provenance-aware traversal
- temporal edge
- trend aggregation

---

## 12. 現在 Demo 的真正賣點

不是：

- 我有 66 張牌
- 我有很多歌曲
- 我有很多 Reels
- 我有一個 RAG 搜尋器

而是：

> **月之符文提供語意種子，LOC2 提供沙盒演練，LOC 框架把文字、歌詞、多媒體、治理、知識與時間資料接在一起，再由 RAG／Graph 找回關係、由 LOC8 觀察演變與趨勢。**

可以濃縮為：

> **月之符文是種子，LOC 是讓語言生長的框架。**

以及：

> **LOC7 建關係網；LOC8 看關係怎麼變。**

---

## 13. 文件治理原則

這份文件用來保存「目前已知狀態與工作決策」，避免未來重新討論同一件事。

更新規則：

- 已明確確認的架構原則 → Current / Stable
- 已有實作但仍可能調整 → Working
- 想法但尚未驗證 → Proposed
- 不再採用但需追溯 → Historical
- 不得因 UI 暫時實作方式反向改寫基本定義
- 重要新決策應先寫回此文件或對應 Knowledge Asset，再修改 UI／API
- 新增 corpus 時保留來源、日期、primary LOC、related LOC 與 authority

---

## 14. 一句總結

**LOC 不是八個功能的集合，而是一套以月之符文為語意種子、以框架方式統合不同型態語言資料、透過 RAG／Graph 建立關係，並由時間與趨勢觀察語言如何持續演化的系統。**


---

## 15. Cache-first UI policy

為避免 Render／Google Apps Script 喚醒、網路延遲或短暫失敗造成統合介面空白，現行前端採：

> **Cache first → immediate render → network refresh → cache update**

### LOC Search

- Facets（ERA、歌曲類型、播放清單）先讀 localStorage cache。
- 無 cache 時使用版本內建 fallback。
- `/search/facets` 成功後更新 UI 與 cache。
- API 暫時失敗時仍保留上次可用分類。
- Knowledge Image 已成為正式搜尋類型，可直接呈現系統統整圖。

### LOC8 Life / Relation & Trend

- Event / Daily Draw 先顯示上次成功同步的事件 cache。
- Google Sheet 在背景刷新；成功後覆寫 cache。
- 30 日 Trend 結果另存 trend cache。
- 當即時資料暫時不可用或近期資料不足時，可顯示上次成功計算的趨勢並明確標示為快取。
- Daily Draw 的 Luna Rune 選項亦保存 cache，避免 Lots 資料短暫讀取失敗時無法操作。

### Cache 治理

- cache 必須保存 `schema_version` 與 `saved_at`。
- cache 是讀取加速與離線 fallback，不是 canonical source。
- API／Registry／Google Sheet 成功取得的新資料優先於 cache。
- Canon、mother data、Registry 不得由瀏覽器 cache 反向覆寫。
