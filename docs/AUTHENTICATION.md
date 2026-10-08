# Authentication Architecture

## Current boundary

管理登入使用 Google OAuth，由 Supabase Auth 建立可供資料 API 驗證的 JWT；PostgreSQL 權限與既有 RLS 決定可讀寫範圍。登入提供者可替換，資料庫端只要求可驗證的 JWT 身分。

## Public data

公開 Search、Culture、Statistics、Rune reference 等功能經由 provider-neutral Data API 取得允許公開的 canonical data。Supabase 是優先的公開讀取來源；只有匿名公開 SELECT 讀取失敗時才嘗試 Neon 唯讀備援，並標示備援資料。來源之間可能存在同步延遲；同一分頁讀取鏈固定使用已選定來源，不混合資料。

這項備援不涵蓋登入、Scope 管理、寫入或權限驗證；這些操作不得自動改向 Neon。公開讀取不因此取得 management write authority。

## Management roles

Current 應用層**只有兩種正式管理角色**，由 `silver.manage.role` 判定，與 `app/loc/use-account.js` 的 `z.enum(['admin','scope'])` 一致：

| role | 權限範圍 |
| --- | --- |
| `admin` | 全域管理，`canManageGlobalSync()` 成立，也可管理各 Scope |
| `scope` | 只能管理 `silver.manage` 明確授權的 Scope（同一使用者可有多筆 Scope mapping），不具全域管理權限 |

沒有 `group`、`editor`、`owner`、`guest` 等其他管理 role。**Scope Group 是 Registry 階層／成員關係，不是權限角色。** 登入、未登入、public read、Scope 的 Search／Statistics／Culture 功能開關、`searchable` 與 Theme 都不是 role；登入但沒有有效 `silver.manage` 權限時，也不會自動取得管理角色。

## Management data

Management UI 只有在已登入且 Current permission check 通過後才提供寫入操作；PostgreSQL 既有 RLS／write policies 仍是最終授權邊界。

- `scope` 只能管理已授權 Scope；`admin` 具全域管理能力。
- Admin authority 與 Scope public feature flag 是不同責任。
- public searchable=false 不代表管理頁不可見。
- Scope 的 Search／Statistics／Culture public flag 關閉，也不代表 canonical record 從管理頁消失。

## Credential rule

Browser 不保存 Postgres owner password 或 service role key。Runtime 使用 Supabase publishable key 與使用者 JWT；資料庫授權由 PostgreSQL role、RLS 與 application permission contract 控制。

任何新增 write path 都必須沿用既有 auth boundary，不得以文件、local file、JSON 或 client-side hidden flag 取代資料庫權限。
