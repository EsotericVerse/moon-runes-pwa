# LOC 導覽治理原則

**Status:** Current  
**Updated:** 2026-09-17

## 最高路由原則：Domain First

Domain 是最高路由與 Scope 治理邊界。正式 Domain 一旦確立 Scope，Directory / Path 只能在該 Domain 內解釋，不得反向覆寫 Domain。

固定判定順序：

`Domain → Scope → Directory / Path → Feature → Page Composition`

Current 主要 Domain：

- `loc.lo3rwang.cc`：月典 / LOC Domain。
- `lrunes.lo3rwang.cc`：LunaRunes / 月之符文 Domain。
- `lo3rwang.lo3rwang.cc`：管理者首頁 Domain。

Path-based Scope detection 只可作為沒有 governed host 時的 compatibility fallback，不得讓 `loc.lo3rwang.cc/runes/...` 反向取得 LunaRunes Domain 的治理權。

## 單一 NAV

每個介面只有一條正式導覽列（NAV）。頁內目錄、本地功能入口、返回連結、架構圖與快捷選單可以存在，但都不是另一套 NAV。Current 文件與程式只使用「NAV」這個名稱。

## NAV 可變治理

NAV 是 **Page Composition 的可變介面**，不是 Canon，也不是 Frozen Interface。當 Current Scope、Feature、頁面組成或正式入口改變時，可以直接調整 NAV；不需要先解除凍結，也不要求另立第二／第三套 NAV。

NAV 變更必須同時維持：

- 每個介面只有一條正式 NAV。
- NAV 繼承目前 Domain 所確立的 Scope，不得因共用 route 串到錯誤 Scope。
- Current canonical identity 與 host 不得回退成 retired identity。
- `app/nav-route-map.js`、ScopeNav、文件與 NAV contract 必須同步。
- 頁內快捷選單、返回連結與功能入口仍不是第二條 NAV。
- 功能級導覽一律使用正式階層 route；不得用 `#hash` 承擔頁面結構、功能切換或管理入口。

## Scope 規則

NAV 必須繼承目前 Scope。脈絡、統計、文化、治理與搜尋是共用功能名稱，但資料與結果永遠由目前 Scope 決定；不得因共用 route 名稱跨到其他 Scope。

- LOC Scope：月之符文｜脈絡｜統計｜文化｜治理｜搜尋｜管理者首頁｜回月典首頁
- LunaRunes Scope：語彙｜脈絡｜統計｜文化｜治理｜搜尋｜管理者首頁｜回月之符文首頁｜回月典首頁
- lo3rwang Scope：風格詞｜脈絡｜統計｜文化｜治理｜搜尋｜管理者頁面｜回 lo3rwang｜回月典首頁

搜尋包含文字輸入方塊與搜尋按鈕。

第一個項目是該 Scope 已治理的保留入口，不得由共用 route 規則覆寫。其餘共用功能依 Scope 自動解析目的地。未來新增 Scope 時，應由 Scope 設定衍生共用功能 route，不逐頁手動複製 NAV。

## LunaRunes 正式入口

LunaRunes 的正式 Domain 是 `lrunes.lo3rwang.cc`。

- 月之符文首頁：`https://lrunes.lo3rwang.cc`
- 語彙／符文圖鑑：`https://lrunes.lo3rwang.cc/list`
- 月典首頁：`https://loc.lo3rwang.cc`
- 管理者首頁：`https://lo3rwang.lo3rwang.cc`

舊有 `loc.lo3rwang.cc/runes/...` 僅可作相容路徑或轉址，不得再作為 LunaRunes Scope 的最高判定依據。

## LunaRunes 首頁媒體組成

LunaRunes 首頁只允許一個 iframe，角色固定為「月之符文介紹／說明 Reels」。

占卜／抽牌示範 Reels 不得嵌入首頁；若需要從首頁導流，只提供連結到示範內容或其正式頁面。不得挑其中一支占卜示範作第二個首頁 iframe。

## lo3rwang 與管理入口

`lo3rwang.lo3rwang.cc` 是管理者首頁入口。LunaRunes 與 LOC NAV 中的管理者入口不得誤指向月典首頁，也不得以 `lo3rwang.cc` 取代此固定管理者首頁 Domain。

`admin.lo3rwang.cc` 仍是全站最高層 control plane；它與「管理者首頁」不是同一層入口。

## 階層 route

頁面階層由正式 route 表達，不由 hash 表達。Route / Page Registry 以 parent / child 關係建立樹狀結構，完整 URL 由節點階層衍生，但任何 path 都必須先受目前 Domain 所決定的 Scope 約束。

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
