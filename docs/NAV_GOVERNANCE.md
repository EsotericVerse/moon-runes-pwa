# LOC Navigation Governance

## One global NAV

全站只有一套正式 NAV：

- `app/AppShell.jsx` — global shell 與 Scope-aware NAV renderer
- `app/modular/scope-registry.js` — deployment/navigation metadata 與 canonical URL builder

Page-local menu 不算第二套 NAV。

## Authority split

- Next filesystem：route authority。
- Scope registry：canonical domain、mount、shared feature URL 與路由 metadata（`display_name` 不作全站 NAV 名稱）。
- `silver.manage`：data Scope／table mapping；`"Title_TW"` 為 Scope NAV 名稱唯一資料來源，透過既有唯讀 `silver.read_scope_page_copy` 取得。
- PostgreSQL canonical tables：資料內容。

Registry 不管理資料表真相，也不替 PostgreSQL 再建立一份 Scope data registry。

## Current deployment scopes

- `loc` — loc.lo3rwang.cc
- `lrunes` — lrunes.lo3rwang.cc
- `lrunes` alternate mount — loc.lo3rwang.cc/lrunes
- `lo3rwang` — loc.lo3rwang.cc/lo3rwang
- `admin` — admin.lo3rwang.cc

## Shared features

- Statistics / statics
- Culture / culture
- Governance / governance
- Search / search

Feature URL 由 registry builder 產生；是否存在由 Next route shell 決定。

## LunaRunes special routes

LunaRunes 的 game、list、duel/*、daily/* 等特殊 routes 由 Next filesystem 擁有，不另建 route allowlist 或第二份 route registry。

一般 Scope 不因 LunaRunes 有特殊 routes 就建立同樣 allowlist，也不建立 Scope ID grammar、reserved-word policy 或關鍵詞 fallback。

## UI copy

NAV 固定功能文字與 LOC 首頁導引使用 `app/i18n/ui-copy.js`；具名 Scope 的 NAV 標題讀取 `silver.manage."Title_TW"`，讀取前暫用原有 UI label，不能拿 Registry 的 `display_name` 覆蓋。UI copy registry 不處理 Galaxy authored content 或 LunaRunes Canon。

## Shared workspace navigation (2026-10-10)

- Upper NAV = "我的最愛". Three legacy scopes are initially selected; authenticated users may save a custom list in the existing `api.user_settings` scalar text_value column.
- Floating bottom dock = six immutable controls in this order: 首頁 / 文化 (hourglass) / 統計 / 搜尋 / 治理 / 設定. It uses six separate Theme-derived backgrounds and shadows.
- First five controls resolve within the active Scope or Scope Group, preserving the existing canonical feature routing; Settings is global to the current site origin, never Scope-owned.
- Homepage preference defaults to LOC. Account-selected homepage is validated against existing management Scope permissions. The native startup redirect runs only once per WebView session; explicit LOC navigation remains possible.
- OAuth entry and signout UI are in Settings. Existing management RLS and role boundaries are unchanged.
- iOS navigation uses bundled static local routes; browser navigation keeps canonical Scope domains. Other private iOS Local File features and Daily table migrations are out of scope.
