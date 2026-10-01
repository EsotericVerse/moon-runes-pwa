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

Current 流程：

1. 先從各 Scope Time data 找共同時間範圍。
2. 交會永遠取 intersection。
3. 取得交會區間後，再對 Galaxy 做聚合。
4. 作品列表使用分頁／incremental loading。
5. 點來源後再查該來源內容，不預先載入全部正文。

Anchor：

- 出生時間可作預設定錨資料。
- 系統可以提出 Anchor suggestion。
- 資料量不足時不提出過度解讀；Current suggestion threshold 為至少 20 筆 eligible data。
- Anchor 必須由使用者確認後建立。
- 缺生日或 Anchor 的 Scope 應 skip，不得阻塞其他 Scope。

## Statistics

Statistics 即時計算 Current canonical data，可使用自訂日期區間。統計不保存 work_count、ranking snapshot 或第二份 materialized corpus。

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
