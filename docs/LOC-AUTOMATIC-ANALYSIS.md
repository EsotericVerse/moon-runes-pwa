# LOC Automatic Analysis

## Identity

- LunaRunes — Symbolic Language
- LOC — Language Architecture Framework
- Lucas Oscar Wang 政德 — Language Architect｜語言建築師

## Principle

LOC 自動分析負責找出可觀察的資料變化，不替使用者定義事件意義、人格或價值。

**觀察 → 統計 → 比較 → 提示 → 使用者確認**

## Culture

Culture 使用 Time River 表達時間分布。

Current 單 Scope 流程：

1. 先解析目前選定的單一 Scope，以及其 Time／Galaxy／Galaxy Media 資料責任。
2. 由該 Scope 的 Period、Anchor 與 Time 條件決定可比較的時間範圍；需要時間交會時以 intersection 為準，不把 union 當成交會。
3. 限定時間後，才對該 Scope 自己的 Galaxy／Galaxy Media 執行精準、bounded query 與資料彙整。
4. 時間長河與作品列表分層取得資料；作品列表採分頁／incremental loading，不因建圖一次載入全文。
5. 使用者打開來源或作品後才查詳情；沒有資料時保留空狀態，不推論缺失的脈絡。

**LOC（`loc`）是保留比較分析的例外，並非純導引頁。** LOC Culture 取得受管理 Scope 各自的 Time／目前開放時期，將共同觀察起點定為有效起點的最晚值（intersection），然後在交會期間分別對各自 Galaxy／Galaxy Media 做來源及媒體類別的 bounded 日分布查詢。結果呈現「交會時間長河」、各 Scope 作品／媒體量，以及「綜合來源時間長河」。相同來源分類指平台／來源類別相交，不代表把不同作者的作品誤認為同一作品。

**LOC 專屬符韻／作者交會（唯讀）**：Culture 在原跨 Scope 總覽前增加「每日符文 × 個人作品」，將 `silver.lrunes_daily` 的每次符文、方向、紀錄或推算月相，與 `lo3rwang` Galaxy／Galaxy Media 作品／媒體依日期放到同一時間長河。符韻、個人作品與正式定錨點保留獨立河道；有同日每日符文時，定錨點顯示對應紀錄。列表按日期交錯展示兩個原始來源，嚴格每頁最多 20 筆，按需查作者原始公開作品 metadata，不載入全文。每日符文不納入 Galaxy 作品量，也不回寫到其他 Scope。缺少符文的日期只顯示原有作品，缺少作品則只顯示符文，不推論兩者有因果關係。

**一般 DB 新建的 Scope Group** 只提供 Registry Overview 與各 Scope 導引，不自動繼承 LOC 的比較能力。LOC 的聚合只是一種 read-only 分析呈現，沒有第二份混合 corpus、跨 Scope 寫入或 Scope 權限合併。

Anchor：

- 出生時間可作預設定錨資料。
- 系統可以提出 Anchor suggestion。
- 資料量不足時不提出過度解讀；Current suggestion threshold 為至少 20 筆 eligible data。
- Anchor 必須由使用者確認後建立。
- 缺生日或 Anchor 的 Scope 應 skip，不得阻塞其他 Scope。

## Statistics

Statistics 即時計算 Current canonical data。單 Scope 保留自己的自訂日期範圍與分類；LOC (`loc`) 另可比較所管理 Scopes 的合併總數、各 Scope 占比與一年／一月／一週時間趨勢。統計不保存 work_count、ranking snapshot 或第二份 materialized corpus。

Statistics 與 Culture 回答不同問題：

- Culture：什麼時間、哪些來源／作品出現變化。
- Statistics：在指定範圍內，各類資料如何分布。

## Search

Search 是精準文字／metadata query，不做語意渲染，也不以 LunaRunes 語意替一般 Scope 補值。

沒有設定就是空；沒有資料就是空。LunaRunes keyword／Canon 只在 LunaRunes 自己的功能中使用。

## Multimedia

Multimedia 是 first-class data。純媒體不需要虛構正文；meta_tags、source、source_native_id、url 與 Galaxy relation 可供 Search、Culture、Statistics 使用。

## 4D interpretation

LOC 的時間維度使作品、來源、分布與關係能放在同一時間軸觀察。4D 在 Current 架構中代表資料關係加上時間，不代表系統必須把所有畫面做成真正三維場景。

## Human governance

分析層可以提示「哪裡發生變化」，但最後是否建立 Anchor、如何命名事件、如何理解自己的文化，仍由使用者決定。

> 系統幫你看見軌跡，但不替你決定你是誰。
