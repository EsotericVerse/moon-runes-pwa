# Authentication Architecture

## Current boundary

Management authentication 使用 Neon Managed Auth。Browser 透過 Neon client 啟動登入；登入後的 JWT 由 Neon boundary 處理，資料庫權限與 RLS 決定可讀寫範圍。

## Public data

公開 Search、Culture、Statistics、Rune reference 等功能以 read-only Neon query 取得允許公開的 canonical data。

公開讀取不因此取得 management write authority。

## Management data

Management UI 只有在已登入且 Current permission check 通過後才提供寫入操作。

- Scope manager 只能管理授權 Scope。
- Admin authority 與 Scope public feature flag 是不同責任。
- public searchable=false 不代表管理頁不可見。
- Scope 的 Search／Statistics／Culture public flag 關閉，也不代表 canonical record 從管理頁消失。

## Credential rule

Browser 不保存 Postgres owner password。Runtime 使用 Neon client／Managed Auth boundary；資料庫授權由 Neon role／RLS／Current application permission contract 控制。

任何新增 write path 都必須沿用既有 auth boundary，不得以文件、local file、JSON 或 client-side hidden flag 取代資料庫權限。
