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
- 功能級導覽一律使用正式階層 route；不得用 `#hash` 承擔頁面結構、功能切換或管理入口。

## 網域優先

Current URL identity 固定採 **網域優先，目錄其次，頁面最後**：

`Domain Scope → Directory Hierarchy → Page Composition`

專屬 Scope domain 存在時，NAV、canonical、分享連結與正式功能入口一律優先使用專屬 domain；主站目錄只保留 compatibility / fallback，不得反過來成為主要識別。

Current canonical hosts：

- LOC：`loc.lo3rwang.cc`
- LunaRunes：`lrunes.lo3rwang.cc`
- lo3rwang：`lo3rwang.lo3rwang.cc`
- Admin：`admin.lo3rwang.cc`

`lo3rwang.cc` 是目前 Base Domain，不等於 lo3rwang Author Scope。未來 Base Domain 可更換，而 Scope label 與頁面樹不需重構。

`author.lo3rwang.cc` 不存在於 Current 命名。平台治理者、網站維護者與內容作者必須分離，不能以 host 命名暗示整站文章皆屬單一作者。

## Scope 規則

NAV 必須繼承目前 Scope。脈絡、統計、文化、治理與搜尋是共用功能名稱，但資料與結果永遠由目前 Scope 決定；不得因共用 route 名稱跨到其他 Scope。

- LOC Scope：月之符文｜脈絡｜統計｜文化｜治理｜搜尋｜lo3rwang｜回月典首頁
- LunaRunes Scope：語彙｜脈絡｜統計｜文化｜治理｜搜尋｜lo3rwang｜回月之符文首頁｜回月典首頁
- lo3rwang Scope：風格詞｜脈絡｜統計｜文化｜治理｜搜尋｜管理者頁面｜回 lo3rwang｜回月典首頁

搜尋包含文字輸入方塊與搜尋按鈕。

第一個項目是該 Scope 已治理的保留入口，不得由共用 route 規則覆寫。其餘共用功能依 Scope 自動解析目的地。未來新增 Scope 時，應由 Scope 設定衍生共用功能 route，不逐頁手動複製 NAV。

## LunaRunes 雙入口

`lrunes.lo3rwang.cc/{route}` 與 `loc.lo3rwang.cc/runes/{route}` 可指向同一 LunaRunes Scope，但兩者不具同等 canonical 優先權。

- `lrunes.lo3rwang.cc/{route}`：Current canonical / public primary。
- `loc.lo3rwang.cc/runes/{route}`：compatibility / fallback route。
- `loc.lo3rwang.cc/{route}`：LOC 統合 Scope。

即使使用者從 `/runes/...` 入口進入，NAV 與正式跨頁連結仍應優先投影至 `lrunes.lo3rwang.cc/...`。

## lo3rwang 個人入口

`lo3rwang.lo3rwang.cc` 是 lo3rwang 個人 Scope 的 canonical host。`lo3rwang.cc` 僅作 Base Domain／相容入口，不再作 Author Scope canonical identity。`author`、`whoami` 與其他衍生名稱不得作為 Current Author Scope ID 或 hostname。

## Admin 最高管理入口

`admin.lo3rwang.cc` 是全站最高層管理入口；`manage.lo3rwang.cc` 退役，不再作為 Current host。

Admin 是 control plane，不是一般內容 Scope，也不承載治理理念說明。它負責跨 Scope 的全站級控制，例如 Route / Page Registry、頁面管理入口指派、權限、Audit、全域 visibility / projection override、全域凍結、storage / sync 與 migration 狀態。

各 Scope 的日常內容管理仍留在各自正式管理 route。Admin 可以記錄並導向這些 manager routes，但不複製各 Scope 的編輯器。

## 階層 route

頁面階層由正式 route 表達，不由 hash 表達。Route / Page Registry 以 parent / child 關係建立樹狀結構，完整 URL 由節點階層衍生。

例如：

- `/context`
- `/context/manage`
- `/culture`
- `/culture/manage`
- `/admin/routes`
- `/admin/audit`

新增上層等同插入 parent node；新增下層等同建立 child node；移動節點等同變更 `parent_id`。Route、頁面、NAV、sitemap、canonical、搜尋結果與管理入口必須同步，不得只改顯示連結。

## 本地入口

頁內功能入口與快捷選單不是 NAV，但若它們代表獨立功能狀態，仍應使用正式 route，不以 hash 充當次級路由。純內容文件中的段落 anchor 不具有功能 route 身分。
