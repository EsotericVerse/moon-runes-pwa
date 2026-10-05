# LOC Language Theory

## Current definition

LOC 是 Language Architecture Framework。它不把一套固定語義強加給所有文字，而是提供資料組織、搜尋、時間分析、統計與治理結構。

LunaRunes 是 Symbolic Language。它擁有自己的 Rune Canon、群組、四方向與組合 Grammar；這些特殊定義只作用於 LunaRunes。

## Language architecture

LOC 將下列責任分開：

- **Content**：原始文字、作品與媒體。
- **Relation**：source_id、target_id、ref_id 與 Galaxy/media linkage。
- **Time**：CreateTime、UpdateTime、Time records、period 與 Anchor。
- **Search**：精準文字與 metadata 查詢。
- **Statistics**：指定範圍內的即時分布。
- **Culture**：時間交會、密度、來源與作品軌跡。
- **Governance**：定義誰可以設定、修改、公開或管理資料。

這些責任可以組合，但不得互相冒充資料來源。

## Search and semantics

Current LOC Search 不做語意渲染。文字是否命中由實際欄位與字詞決定，不由 LunaRunes Canon／關鍵詞自動改寫。

搜尋責任分成兩層：PostgreSQL 處理資料權威、Scope、固定 eligibility/numeric filters 與分頁。FlexSearch 僅是可選的小範圍詞彙索引；全量掃描成本高時，改用資料庫數值彙總與寫入時驗證。

LunaRunes 可以在自己的 Scope 進行符號式語意分類，但：

- 不作為一般 Scope 的預設 keyword。
- 不作為其他文化的判定標準。
- 不把 rune character 的字面出現直接當成 rune semantic hit。
- 不把 analysis output 反向改寫 Base66 Canon。

## Culture

Culture 是時間中的資料結構，不是單一 Style 標籤。作品、來源、事件、時期與語意變化都可以放回時間軸觀察，但系統只描述可重現的變化，不替使用者命名人生意義。

## Governance

Governance 優先處理 authority boundary：

- code routing 由 Current main / Next filesystem 決定。
- deployment metadata 由 Scope registry 決定。
- data mapping 由 silver.manage 決定。
- canonical content 由 PostgreSQL canonical tables 決定。
- LunaRunes Canon 由 LunaRunes canonical source／tables 決定。
- KM 與文件不能反向創造 runtime authority。

## No cross-scope special defaults

除了 LunaRunes 自己的符文特殊定義外，一般 Scope 不建立特殊 grammar、reserved word、keyword fallback 或隱性例外。沒有明確資料時保留空值／未設定狀態。

## Human agency

LOC 的目標是提高可見性、可追溯性與比較能力，不替人完成價值判斷。

> 系統幫你看見軌跡，但不替你決定你是誰。
