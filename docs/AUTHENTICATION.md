# Authentication Architecture

## Current boundary

管理登入使用 Google OAuth，由 Supabase Auth 建立可供資料 API 驗證的 JWT；PostgreSQL 權限與既有 RLS 決定可讀寫範圍。登入提供者可替換，資料庫端只要求可驗證的 JWT 身分。

## Public data

公開 Search、Culture、Statistics、Rune reference 等功能以唯讀 Supabase Data API 取得允許公開的 canonical data。

公開讀取不因此取得 management write authority。

## Management data

Management UI 只有在已登入且 Current permission check 通過後才提供寫入操作。

- Scope manager 只能管理授權 Scope。
- Admin authority 與 Scope public feature flag 是不同責任。
- public searchable=false 不代表管理頁不可見。
- Scope 的 Search／Statistics／Culture public flag 關閉，也不代表 canonical record 從管理頁消失。

## Credential rule

Browser 不保存 Postgres owner password 或 service role key。Runtime 使用 Supabase publishable key 與使用者 JWT；資料庫授權由 PostgreSQL role、RLS 與 application permission contract 控制。

任何新增 write path 都必須沿用既有 auth boundary，不得以文件、local file、JSON 或 client-side hidden flag 取代資料庫權限。
