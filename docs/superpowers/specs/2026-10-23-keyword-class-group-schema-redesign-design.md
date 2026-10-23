# 關鍵詞 Class / Group / Keyword 三層架構改版 — 設計規格

- Status: 待使用者確認（spec review）
- Scope: `silver.{scope}_keywords`（例如 `silver.lo3rwang_keywords`）、`silver.{scope}`（scope config，例如 `silver.lo3rwang`）、`silver.{scope}_galaxy` 的 `group_lists` 格式、`app/loc/model/rune66-keyword-engine.mjs`、`app/loc/keyword-analysis.js`、`app/loc/db-contract.mjs`、`app/loc/KeywordLibraryPanel.jsx`
- 本規格完全來自使用者口述內容的整理，非我方新增的需求或臆測；兩處我方無法從口述內容確定的部分，列在「待確認」一節，不視為已核准。

## 1. 背景與動機

目前 `silver.{scope}_keywords` 的三層結構是：

- **Class**（頂層，整套關鍵字庫版本）：`class_id`（uuid）、`class_name`（text）。例如 符文66、政德文化、Pop、Rock、Hip-Hop、Vocal 這些都是不同的 Class，彼此共存於同一張表。
- **Group**（中層，目前程式碼叫 `class_group`，自由文字）：比對引擎直接拿這個字串當分組 key（`compileCatalog` 的 `row.group=class_group`）。符文66 的 9 個canonical值是 `靈魂/連結/生命/自然/礦物/元素/秩序/無序/特殊`。
- **Item/Keyword**（底層）：`item_no`（數字，CHECK 用於排序與唯一性）、`item_name`、`principle`、`keywords`（jsonb 陣列）、`order_no`、`keyword_sha`（generated column）。

這個命名跟使用者真正想要的三層模型是錯開一層的：使用者口述的「class」實際對應到現在程式碼的 Group（`class_group`，例如「靈魂組」），使用者口述的「group」實際對應到現在程式碼的 Item（例如「靈之符文」）。這次改版要把 schema 跟程式碼都改成使用者的命名與限制，並且要對所有 Class（不只符文66）通用，不能把符文66現有的 67 項、9 組這個特例寫死進判斷邏輯（這正是前一階段已修的 Bug#3 的同一類問題，現在要從「程式邏輯層的 ceiling 檢查」進一步擴大成「schema 層就有專屬欄位」）。

## 2. 新三層結構（使用者口述，以現有 Class 層為基準往下展開）

### 2.1 Class 層（頂層，不變）

維持現狀：`class_id`（uuid）、`class_name`（text）。這層識別「哪一套關鍵字庫版本」（符文66 / 政德文化 / Pop / ...），scope config 的 `current_keyword_class_id` 指向目前啟用的那一個，兩者都不在本次改版範圍內。

### 2.2 新 Class 層（使用者口述的「class」= 目前程式碼的 Group / `class_group`）

取代現有自由文字 `class_group`，改成獨立欄位：

| 新欄位 | 型態 | 說明 |
|---|---|---|
| `class_id` | uid（約 4 位字母數字，仿 `galaxy.uid` 的 `^[A-Za-z0-9]{N}$` 風格），unique | 這一組（例如「靈魂組」）的識別碼 |
| `class_name` | text | 例如「靈魂組」 |
| `class_order` | integer | 純排序用，不是識別碼 |

限制：

- 每個 Class（符文66、政德文化...）底下，這層最多 **8 個一般組 + 1 個預設/current 組 = 最多 9 個**，`class_order` 1–8 給一般組，`class_order=9` 固定給預設/current 組。
- 這是「上限」不是「必須湊滿」：少於 8 個一般組是合法的（符文66目前的靈魂/連結/生命/自然/礦物/元素/秩序/無序＋特殊=8+1=9；但政德文化只有 6 個、Hip-Hop 5 個、Rock/Vocal 3 個，這些都要能正常跑，不能要求湊到 8 或 9）。
- `class_order=9`（預設/current 組）的 `class_name` 可自訂（不強制叫「特殊」），每個 Class 自己決定名稱。
- Schema 要擴充（新增上述三欄），程式碼原本「湊滿 9 組才能跑」的判斷邏輯要改成「最多 9 組（1–9 皆合法）」——這點銜接上一階段已經在 `buildClassMap` 做的 ceiling 修正，這次要把它從「用文字比對 CANONICAL_CLASS_GROUP_ORDER 推出順序」改成「直接讀 `class_order` 欄位」。

### 2.3 新 Group 層（使用者口述的「group」= 目前程式碼的 Item，例如「靈之符文」）

取代現有 `item_no` / `item_name` / `order_no`：

| 新欄位 | 型態 | 說明 |
|---|---|---|
| `group_id` | uid（約 4 位字母數字），unique | 取代 `item_no`（目前是數字） |
| `group_name` | text | 取代 `item_name`，例如「靈之符文」 |
| `group_order` | integer | 純排序用，取代 `order_no` |

限制：**數量不限**。每個新 Class（2.2）底下可以有任意多個新 Group，不設上限（符文66目前 0–66 共 67 項，其他 Class 項數各不相同，維持現狀的彈性）。

### 2.4 Keywords（底層，不變）

屬於某個新 Group 的「關鍵字跟規則」：`keywords`（jsonb）、`principle`、`keyword_sha`（generated）維持現狀，不改名、不改型態。

### 2.5 關鍵詞的本質（設計理念，非 schema 變更）

關鍵詞分類本質上是一個**濾鏡**：短暫、可重跑的分組輔助，不是永久定論的分類。這一點不產生新的欄位或限制，但決定了「重新分類」永遠可以安全地重跑、沒有不可逆的副作用——這也是後面 2.6 `current_keywords` 機制「只能在成功後更新、不能一開始清空」的設計理由。

### 2.6 分析用的異動偵測：`current_keywords`

在 scope 自己的 config table（`silver.{scope}`，例如 `silver.lo3rwang`）新增一欄：

| 新欄位 | 型態 | 說明 |
|---|---|---|
| `current_keywords` | text（sha） | 該 scope 目前啟用的整套關鍵字庫（新 Class 層 + 新 Group 層 + Keywords，連結構一起算）的單一 hash |

行為規則：

- 開始跑「重新分類」時，拿目前即時算出來的 sha 跟資料庫裡的 `current_keywords` 比對，判斷有沒有變動（取代現有 `keyword_meta.shas` 陣列式比對機制）。
- **只有在這次分析成功跑完之後才覆寫更新 `current_keywords`**；絕對不能在分析一開始就清空或覆寫它——這點是使用者明確重申的既有要求（`markCurrentClassificationStale`／`saveAnalysisSettings` 那兩處「不該一開始全部清除」的要求，套用在這個新欄位上同樣適用）。
- 只需要一欄（`current_keywords`），不需要額外的 `last_keywords`：比對時讀到的「資料庫裡现有的值」在語義上就是「上次」的值，更新時機已經保證是「成功後才覆寫」。
- 用途：目前只用在關鍵詞分類統計（`runKeywordAnalysisBatch`／`applyKeywordClassification`）這條路徑。使用者另外提到「文化時間長河」概念上也會用到類似機制，但目前還没套用——本次規格**不**把「文化時間長河」納入實作範圍，只記錄這個關聯供未來參考。

### 2.7 `loc_keywords`（跨 scope 共用關鍵詞庫）

使用者口述：`loc_keywords` 放的是「給其他 scope 分享的共用關鍵詞組」，跟任何單一 scope 自己在跑的 `{scope}_keywords`／`current_keywords` 機制沒有關係。這段口述在過程中幾次被使用者自己推翻又重新定義，最終版本沒有給出欄位細節，只確定了「跟單一 scope 的運作無關」這個邊界。

**本規格把 `loc_keywords` 列為「概念已知、欄位未定，不在本次實作範圍」**——見第 4 節「待確認」。

## 3. 連動影響（使用者口述中沒有直接提到，但是改動的必然後果）

把 Group 層（2.3）的識別碼從數字 `item_no` 換成 uid 字串 `group_id`，會影響：

1. **`silver.{scope}_galaxy.group_lists`**：目前是 `"item_no:hit_count,item_no:hit_count"` 的純文字格式，並有 CHECK 限制只能是數字:數字。換成 uid 之後這個格式與 CHECK 都要跟著改（`^[A-Za-z0-9]{N}:[1-9][0-9]*(,...)*$` 之類）。
2. **比對引擎** `app/loc/model/rune66-keyword-engine.mjs` 的 `compileCatalog`：目前用 `item_no` 當作命中計數的 key，要改成讀 `group_id`。
3. **`app/loc/keyword-analysis.js`** 的 narrowing 邏輯：`changedItemNosOf`／`candidateOrFilter`／`defaultGroupOf` 目前全部以 `item_no` 為單位比對與查詢 (`group_lists.ilike.%itemNo:%`)，要改成以 `group_id` 為單位。
4. **既有資料遷移**：所有 scope（`silver.lo3rwang_galaxy` 等）裡已經寫入的 `group_lists` 都是 item_no 鍵的舊格式，升級時需要一次性轉換成新的 group_id 鍵格式（否則舊資料全部讀不到對應的新 Group）。

這四點都是「改 Group 層識別碼」這個決定必然牽動的下游，不是我方新增的範圍，但實作計畫必須覆蓋到，否則會在資料庫層面直接炸掉現有的分類結果。

## 4. 待確認（兩個開放問題，請使用者裁示）

### 4.1 `loc_keywords` 的欄位與用途

目前口述只確定「跨 scope 共用關鍵詞組，跟單一 scope 運作無關」，沒有給出具體欄位、誰寫誰讀、跟 `silver.{scope}_keywords` 之間怎麼對應。

**建議**：這次改版先不動 `loc_keywords`（不論它現在是否存在），列為獨立的後續題目，等 Class/Group schema 改完、有實際跨 scope 共用需求時再單獨 brainstorm。

### 4.2 `group_lists` 既有資料遷移策略

Group 層識別碼換成 uid 後（第 3 節第 1-4 點），對現有已分類的文章資料有兩種處理方式：

- **方案 A（建議）**：一次性資料遷移。改 schema 的同一個 migration 裡，幫每個現有的 `item_no` 產生對應的 `group_id`（可做一張 `item_no → group_id` 對照表或直接把新 uid 寫回同一行），然後用這個對照表把所有 `silver.{scope}_galaxy.group_lists` 的既有內容從 `item_no:count` 轉寫成 `group_id:count`。好處：資料跟 schema 同步切換，沒有新舊格式並存期。風險：要在遷移腳本里一次處理所有 scope 的所有歷史文章，數量較大（符文66單一scope就有數萬篇），需要在低峰期執行並有回滾方案。
- **方案 B**：保留 `item_no` 欄位但標記為 deprecated，讓新資料寫 `group_id`、舊資料暫時維持 `item_no` 鍵，比對引擎兩種鍵都認得，之後再排時間批次遷移。好處：風險分散，上線當下不用動全部歷史資料。壞處：新舊格式並存期間程式邏輯要同時處理兩套鍵，容易出 bug，且「什麼時候算遷移完成」沒有明確終點。

**我方建議方案 A**，理由：「濾鏡」特性（2.5）代表關鍵詞分類本來就可以安全重跑；一次性遷移加上重新跑一次完整分類（用新 schema 重算 `group_lists`）比維護兩套鍵的過渡期更安全、也更符合「不留技術債」的既有工作風格。

請使用者對 4.1、4.2 兩點給意見，其餘部分（第 2 節全部）已經是口述內容的直接整理，確認無誤後我就會呼叫 writing-plans 排出實作計畫（包含 migration SQL、程式碼改動清單、資料遷移腳本、驗證方式）。
