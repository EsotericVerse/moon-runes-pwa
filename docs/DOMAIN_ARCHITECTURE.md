# Domain Architecture

## Current deployment surfaces

| Surface | Canonical location | Responsibility |
| --- | --- | --- |
| LOC | https://loc.lo3rwang.cc/ | framework homepage and shared analysis/navigation |
| LunaRunes | https://lrunes.lo3rwang.cc/ | Symbolic Language product/runtime |
| LunaRunes mount | https://loc.lo3rwang.cc/lrunes/ | alternate ingress to the same `lrunes` Scope |
| Author | https://loc.lo3rwang.cc/lo3rwang/ | author Scope |
| Admin | https://admin.lo3rwang.cc/ | management/admin surface |

不存在第二套 Current whoami、manage、app 或 api domain architecture 定義。

## Responsibility

Domain/mount 是 deployment identity，不是資料表名稱。

Current route authority 是 Next filesystem。`app/modular/scope-registry.js` 只保存 deployment/navigation metadata，用來解析 canonical domain、mount 與 shared feature URL。

Data Scope 與 Galaxy／Time 對應由 Supabase PostgreSQL 的 `silver.manage` 管理。既有部署範例包含：

- `lo3rwang` — role admin
- `lrunes` — role scope

上述是範例而不是完整 Scope 清單；透過 Admin 新增的一般 Scope 也應由相同 mapping contract 解析，不在文件中維護另一份固定可用 Scope 名冊。Scope Group 成員關係則由 `silver.scope_registry.parent_scope_id` 維護。**一般新建 Group** 只提供 Overview／導引；既有 LOC (`loc`) 的 Culture／Statistics 例外保留跨 Scope 唯讀交會與有界分布比較，不產生第二份 corpus。

Current deployment 與 data Scope 都使用 canonical id `lrunes`；不保留 `lunarunes` runtime alias。

## Shared feature paths

Current shared features：

- /statics
- /culture
- /governance
- /search

LunaRunes 另外擁有自己的特殊 route，例如 game、list、duel/*、daily/*。這些特殊 route 由 Next filesystem 擁有，只屬 LunaRunes，不建立一般 Scope 的預設 route allowlist。


## Deployment, environment and write authority

- 網站是 Next.js 靜態輸出，由最新 `main` 執行 `.github/workflows/next-architecture.yml` 驗證、`.github/workflows/deploy-pages.yml` 發布。
- iOS 版使用同一套靜態輸出經 Capacitor 8 封裝；原生導覽使用 App 內部路由，網站保留 canonical domain。
- `silver.scope_registry` 的 Domain／Directory 二擇一；`display_name` 是 Registry 顯示資料，不可覆蓋 `silver.manage."Title_TW"` 的 NAV／網頁標題責任。
- Scope Registry 管路由身份、親屬關係及部署 metadata；`silver.manage` 管資料 Scope 與資料表映射；PostgreSQL canonical tables 管內容；OAuth JWT、Scope 授權與 RLS 控制寫入。
- Supabase PostgreSQL 是主要資料庫。僅允許匿名公開讀取失敗時使用 Neon 唯讀備援，且必須標示備援及同步延遲。管理、登入、資料寫入與 RLS 檢查不得切換到 Neon。
- 網頁版管理匯入進入授權 Scope 資料庫；原生 App 設定中的一般 File Import 使用私有 Local File，依 Capacitor 執行環境判斷，而**非**依螢幕大小或使用者手動選資料庫。
- 新一般 Scope 由固定 `/scope/?scope=<id>` static shell 解析；請勿另建立固定 Scope 清單或與 DB 平行的 runtime registry。

## Runtime configuration ownership

## Manage / Scope ownership

- `silver.manage`: global-Admin-only changes (owner mapping, administrative permissions, public Nav/browser labels `Title_TW`/`Desc_TW`). Do not move Scope-owned toggles, current Theme selection or local settings here.
- `silver.<scope_id>`: writable by the Scope's own authorized manager (chosen Theme, locale, search/statistics/culture enabled flags and other Scope-specific settings).
- `silver.loc_theme`: global Admin manages the eight shared palette definitions and their numeric keys 1..8. Scope Admin only chooses an existing Theme via their own configuration table.
- The Scope's `theme` setting is a reference to the shared palette, not a duplicate of its 43 token values. It remains unchanged during this migration.


### Static export boundary
A GitHub Pages / Next.js static export cannot embed the **current** live value of `display_name` in the original response HTML without server rendering or rebuilding from a database snapshot. Consequently the client sets `document.title` from canonical database data after hydration. This is a delivery limitation, not an additional user-editable naming field.
