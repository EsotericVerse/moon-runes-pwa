# LOC 導覽治理原則

**Status:** Current  
**Updated:** 2026-09-17

## 單一 NAV

每個介面只有一條正式導覽列（NAV）。頁內目錄、本地功能入口、返回連結、架構圖與快捷選單可以存在，但都不是另一套 NAV。Current 文件與程式只使用「NAV」這個名稱。

## NAV 可變治理

NAV 是 **Page Composition 的可變介面**，不是 Canon，也不是 Frozen Interface。當 Current Scope、Feature、頁面組成或正式入口改變時，可以直接調整 NAV；不需要先解除凍結，也不要求另立第二／第三套 NAV。

NAV 變更必須同時維持：

- 每個介面只有一條正式 NAV。
- NAV 繼承目前 Scope，不得因共用 route 串到錯誤 Scope。
- Current canonical identity 與 host 不得回退成 retired identity。
- `app/nav-route-map.js`、ScopeNav、文件與 NAV contract 必須同步。
- 頁內快捷選單、返回連結與功能入口仍不是第二條 NAV。

## Scope 規則

NAV 必須繼承目前 Scope。脈絡、統計、文化、治理與搜尋是共用功能名稱，但資料與結果永遠由目前 Scope 決定；不得因共用 route 名稱跨到其他 Scope。

- LOC Scope：月之符文｜脈絡｜統計｜文化｜治理｜搜尋｜lo3rwang｜回月典首頁
- LunaRunes Scope：語彙｜脈絡｜統計｜文化｜治理｜搜尋｜lo3rwang｜回月之符文首頁｜回月典首頁
- lo3rwang Scope：風格詞｜脈絡｜統計｜文化｜治理｜搜尋｜管理者頁面｜回 lo3rwang｜回月典首頁
- Governance Scope：治理規則｜脈絡｜統計｜文化｜治理｜搜尋｜管理者頁面｜回治理頁面｜回月典首頁

搜尋包含文字輸入方塊與搜尋按鈕。

第一個項目是該 Scope 已治理的保留入口，不得由共用 route 規則覆寫。其餘共用功能依 Scope 自動解析目的地。未來新增 Scope 時，應由 Scope 設定衍生共用功能 route，不逐頁手動複製 NAV。

## LunaRunes 雙入口

`lrunes.lo3rwang.cc/{route}` 與 `loc.lo3rwang.cc/runes/{route}` 是同一 LunaRunes Scope 的兩種入口。兩者的脈絡、統計、文化、治理與搜尋必須保持同一 Scope；`loc.lo3rwang.cc/{route}` 則屬 LOC 統合 Scope。

## lo3rwang 個人入口

`lo3rwang.cc` 是 lo3rwang 個人 Scope 的 canonical host。`author`、`whoami` 與衍生子網域不得作為 Current Scope ID、NAV identity 或 hostname。Current 個人治理入口為 `/lo3rwang/governance`。

## 管理入口

`manage.lo3rwang.cc` 是最高層統一管理功能入口。它不是一般內容 Scope。NAV 中的「管理者頁面」只出現在 lo3rwang 與 Governance Scope；LOC 與 LunaRunes NAV 不增加管理者頁面。LOC 治理頁可以在頁面內容中提供最高管理入口。

## 本地入口

頁內功能入口與快捷選單不是 NAV。LunaRunes 首頁目前允許「抽牌｜符文圖鑑」頁內子選單；這不建立另一條正式 NAV，也不改變 Scope、資料歸屬或管理權。
