# LOC Canon 1.3

**Status:** Current Canon  
**Date:** 2026-09-16  
**Supersedes:** LOC Canon 1.2 for Current Scope/Feature architecture. Older Canon remains Historical and must not be rewritten.

## 1. Identity
LOC（月典）是可公開、可移植的語言模組框架（Language Module Framework）。LunaRunes（月之符文）是具有自己 Master Data、Canon 與治理權威的符號式語言模組，也是參考實作；它不等於 LOC 全域。Canon 定義原則、權威、責任與邊界，不綁定 Next.js、Vercel、Cloudflare、資料庫或其他 implementation。

## 2. Scope Model
治理判定順序為 **Scope → Authority → Currentness → Resolution**。Scope 是可新增、拆分、合併、重新命名、階層化及交叉引用的資料與治理邊界，不是寫死的網站類型，也不存在永久唯一的 Scope 清單。

Scope 可以有 parent、children 與明確的 readable references。父 Scope 可依治理設定聚合 descendants；跨分支 refs 可讓 Context、Statics、Culture、Search 讀取被引用資料，但不轉移來源 ownership。Governance write authority 不因 parent、aggregation 或 refs 自動繼承。

新增 Scope 的最小資料為：中文名稱、英文名稱、輸入名稱／Scope ID、管理者首頁。建立後即可套用共通 Feature Model；parent、refs、特殊首頁與其他治理設定可再擴充。

## 3. Feature Model
共通功能為 **Context（脈絡）、Statics（統計排行榜）、Culture（文化）、Governance（治理）、Search（搜尋）**。核心公式為：

**Scope × Feature → Page Composition**

Feature 提供共用 UI、行為與 canonical feature copy；Scope 注入名稱、資料範圍與治理狀態。因此修改一份共通功能說明，所有使用該 Feature 的 Scope 同步更新，不維護重複頁面。

LOC 的聚合顯示名稱為「所有」，因此形成「所有脈絡／所有統計排行榜／所有文化／所有搜尋」。LunaRunes 則形成「月之符文脈絡／月之符文統計排行榜／月之符文文化／月之符文搜尋」。Governance 始終治理當前 Scope 自身權威，不以「所有治理」取得其他 Scope 寫入權。

## 4. Hierarchy example: LunaRunes
LunaRunes 可作為父 Scope，其九組可直接成為 Child Scope：靈魂、連結、生命、自然、礦物、元素、定序、無序、系統特別。子 Scope 仍可繼續分支，例如「自然 → 樹／花／葉／草／根／種／實／枝」。

同一 Feature 可交叉套用任何節點。例如 `自然 × Statics → 自然統計排行榜`；其資料預設只包含自然 Scope 與依治理設定納入的 descendants。這是 Scope 模型的實例，不要求為每個節點複製功能頁。

## 5. LunaRunes homepage and Duel example
LunaRunes 首頁的內容面只提供「符文圖鑑」與「抽牌／Duel」；Context、Statics、Culture、Governance、Search 由 NAV 進入共通 Feature Model，不在首頁重複建立功能卡。

LunaRunes Scope-specific route example：`list` 為符文圖鑑；`duel` 為玩法入口；其下包含 `one` 單卡、`daily` 每日、`two` 雙卡、`three` 三卡、`five` 五卡、`ow3gs` 11 卡模式，以及 `fight` 卡牌拓展桌遊。這些是同一 LunaRunes 資料在不同玩法模型中的應用。

## 6. Homepage copy governance
只有 Scope 首頁開放一般文字治理；可編輯範圍限制為五個共通大項：脈絡、統計、文化、治理、搜尋的 canonical feature copy。修改共通 copy 必須透過 Feature Model 傳播，而不是逐頁覆寫。頁面結構、Scope 關係、ownership、authority、aggregation、refs 與 route semantics 不屬於自由文字編輯範圍。

## 7. Search, statistics, culture and context
各 Scope 保有資料歸屬。Context、Statics、Culture、Search 使用相同 Feature Model，但依 Scope 取得不同 dataset/corpus。LOC 可作 federated/aggregate Scope；其他 Scope 預設 local，除非治理資料明確指定 aggregation/refs。首次完整分析後採差異更新，避免無變更資料反覆全文重算。

## 8. ERA and Governance
ERA 屬於各自 Scope。Context 可顯示／分析 ERA；Governance 修改該 Scope ERA。跨 Scope 比較保留來源與 Scope identity。OAuth Authentication 不等於 Scope Authorization；寫入必須同時通過 Scope 權限。治理變更應保留對象、Scope、操作者角色、前後值、理由、證據、時間、審核狀態與替代紀錄。

## 9. Current and Historical
Current 只使用目前有效名稱、定義、規則與資料狀態。Historical 不改寫；更正以新紀錄 supersede。已廢止的 LOC1–8 只能存在於明確 Historical 資料，不得回到 Current 架構、導覽、欄位或責任識別。

## 10. LunaRunes boundary
LunaRunes 由 Master Data／Base66、Current Canon／Spec 與 Registry 治理。符文分類依「詞性／句內語意角色 → 群組主體性 → 符文語意歸屬」逐層判定；關鍵詞是證據，不是直接命中。LunaRunes 的 Current/Historical、ERA、搜尋、統計與治理保持自己的 Scope identity。

## 11. Navigation
LOC 只有一條正式 NAV。NAV 由目前 Scope 生成；切換 Scope 後立即使用新 Scope NAV。頁內入口、架構圖與快捷選單不是第二套 NAV。

## 12. Copyleft
LOC 基本方法論依 Copyleft 原則開放使用與研究，衍生時保留必要來源、作者、歷史與修改標示；衍生商業使用須取得同意。此治理意圖不自動等同 GPL、AGPL、CC BY-SA 或其他既有 license。
