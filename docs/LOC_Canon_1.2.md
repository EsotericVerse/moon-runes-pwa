# LOC Canon 1.2

**Status:** Current Canon  
**Date:** 2026-09-16
**Supersedes:** LOC Canon 1.1 for Current terminology and governance. Older Canon remains Historical and must not be rewritten.

## 1. Identity and purpose

LOC（月典）是可公開、可移植的語言模組框架（Language Module Framework）。LunaRunes（月之符文）是具有自己 Master Data、Canon 與治理權威的符號式語言模組（Symbolic Language Module），也是參考實作；它不等於 LOC 全域。

Canon 定義原則、權威、責任與邊界，不指定頁面框架、部署平台、主機、資料庫、快取或其他 implementation。LOC 不依賴 WordPress，也不綁定 Next.js、Vercel、Render、Supabase、KV 或任何特定供應商。

## 2. Scope and authority

治理判定依序確認：

**資料範圍（Scope）→ 權威來源 → Current 狀態 → 衝突處理**

Master Data、Canon、Spec、Registry、來源紀錄與衍生 View 只在各自責任範圍內生效。衍生資料不得反向覆寫上游權威；權威不足或衝突不能判定時，標記待治理，不猜測。

Scope 可新增、刪除、拆分、合併、重新命名或調整關係，不存在永久唯一的 Scope 清單。個人、符文、治理、作品、群組、部門與組織都可以形成獨立或多層 Scope。

每個 LOC instance 的管理權獨立。採用 LOC、讀取公開資料或引用 Canon，不代表 LOC 作者、原專案管理者或其他 instance 可以登入或管理該 instance。

## 3. Current and Historical

Current 只使用目前有效的名稱、定義、規則與資料狀態。歷史紀錄不可改寫；錯誤以更正、修訂或 supersede 新增紀錄，不靜默覆蓋原紀錄。

相應 Scope 的管理者可以治理哪些歷史資料被 Current 採用、分析或公開呈現，並必須留下稽核紀錄。已廢止的 **LOC1–8** 只可存在於明確標示的 Historical 紀錄，不得作為 Current 架構、模組名、欄位、導覽或責任識別。

## 4. Shared governance principles

- 客觀與中立：分析依資料、語境與公開規則，不迎合作者、管理者或預期答案。
- 可解釋：保留規則版本、證據、候選、排除與爭議狀態。
- 治理先於實作：先確定名稱、語意、權威與邊界，再更新程式、介面、索引、搜尋與推演。
- 語意優先：不以單字命中代替詞性／句內角色、主體性及所屬語意的判定。
- 分類一致：需要唯一值時輸出一個 Current 結果；接近候選另標 disputed，不以多值逃避判定。
- 資料歸屬：統合、引用與可讀取不改變來源 Scope 的所有權或寫入權。
- 寫入審核：跨 Scope 寫入或納入統合 Scope 必須由目標 Scope 審核。
- 可移植（Portable）：原則與資料契約不依附特定技術或平台。
- 多層治理：每層 Scope 保有自己的管理、資料與權威。
- 角色分離：作者、資料主體、Scope 管理者與系統管理者不得混同。
- 衝突不猜測：不能證明時保留未知、證據與待治理狀態。

## 5. Search, statistics and integration

個人、LunaRunes、治理與其他 Scope 各自保有資料歸屬、搜尋、統計與排行榜。月典結果是經審核的統合層，不抹除來源，也不使來源 Scope 永久互通。

資料首次進行完整分析；同筆資料未變則跳過，有差異才更新，修正標記只觸發相關局部重算。排行榜保存 Current count 並進行差異更新，避免為每次呈現反覆全文搜尋。

## 6. ERA governance

時期（ERA）屬於各自 Scope，可由該 Scope 治理修改。個人 ERA、LunaRunes ERA、治理 ERA 與其他組織 ERA 不得因使用同一框架而混成單一時間線。跨 Scope 比較必須保留各自識別與來源。

## 7. Navigation

LOC 只有一條正式導覽列（NAV）。架構圖、本地功能入口、頁內目錄與快捷選單不是 NAV2 或 NAV3，也不得以這些名稱重新建立多套導覽治理。

導覽項目的顯示文字可由其所屬 Scope 治理；例如個人首頁第一個 NAV 文字可由個人 Scope 管理者修改。這類設定只在該 Scope／instance 生效，不改寫 LOC 全域 Canon。

## 8. LunaRunes boundary

LunaRunes Scope 由其 Master Data／Base66、Current Canon／Spec 與 Registry 治理。符文分類依詞性／句內語意角色、群組主體性、符文語意歸屬逐層判定。關鍵詞是證據，不是直接命中規則。

LunaRunes 的 Current／Historical、ERA、搜尋、統計與排行榜保持獨立，不混入政德個人文章或個人 ERA。LOC 全域原則約束共同邊界，但不取代 LunaRunes 的權威來源。

## 9. Governance execution and audit

治理空間包含公開原則、具權限的管理者功能與治理紀錄。可執行設定至少涵蓋 Scope 與關係、資料納入／移除、審核、ERA、修正標記、統合、搜尋／統計／排行榜維護及角色權限。

每筆治理變更至少記錄治理對象、Scope、操作者角色、動作、前後值、理由、證據、時間、審核狀態與替代紀錄。

## 10. Copyleft

LOC 的基本方法論依 Copyleft 原則開放使用與研究，使用及衍生時須保留必要來源、作者、歷史與修改標示。衍生商業使用須取得同意；解析介面、推演層及其他受管理服務可以收費。

此段是 Current 治理意圖，不自動等同或改寫為 GPL、AGPL、CC BY-SA 或其他既有 license。第三方內容、私人資料及另有權利限制的資產不因本原則自動重新授權。
