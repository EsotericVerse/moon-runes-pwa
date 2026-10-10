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

## First-row NAV and personal directories (2026-10-10)

- Upper NAV is a **single full-width first row in normal document flow (not fixed/sticky)**, not a floating pill/card. It has no visible 「我的最愛」 heading.
- Left: direct favorite Scope and Scope Group shortcuts plus user-owned folder triggers. The rail scrolls horizontally; `<<` / `>>` controls render only when there is horizontal overflow. Disabled at the ends.
- Right: permanent, non-scrolling `回月典首頁` link, independent of selected favorites or any folder.
- Clicking a folder reveals **one second row** inside the top-of-page NAV; clicking it again or × collapses the row. Folder children are regular Scope shortcuts, with the same Title_TW naming and Scope authority rules.
- Global Settings > 我的最愛 includes create/rename/delete folder and assigning each favorite to either direct first row or one folder. Deleting a folder returns its shortcuts to the first row; LOC remains pinned right and cannot be put in a folder.
- Folder configuration is encoded *plain text* in existing `api.user_settings.text_value` under `loc-favorite-folders-v1`; no JSONB, local browser corpus copy, new DB table or Scope Group mutations. The folders only organize links; they **do not** change Scope roles, RLS, actual Group structures or route registry.
- Lower six-key floating feature dock does not change. No IPA release until the user finishes website navigation acceptance.


## NAV horizontal alignment (2026-10-10)

- Top NAV keeps normal document flow, but its own outer bounds now match the shared content frame: `width:min(var(--loc-ui-max),calc(100% - clamp(1rem,4vw,4rem)))` with centered margins; on mobile it matches the existing `calc(100% - 1rem)` content width.
- Left and right page gutters stay visible on wide and narrow displays; this does not introduce a rounded/floating container. The permanent LOC link is aligned to the right edge *inside* the content frame.
- The top row's horizontal scrolling and optional second-row folders, and the bottom floating six-key dock, are unchanged.
