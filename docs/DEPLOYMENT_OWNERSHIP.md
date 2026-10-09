# Deployment Ownership

## Current deployment

LOC 是 Next.js static-export application。main 是 Current source branch；GitHub Pages deployment workflow 由 main build 產生公開靜態輸出。

主要 workflow：

- .github/workflows/deploy-pages.yml
- .github/workflows/next-architecture.yml
- .github/workflows/branch-freeze.yml

## Scope route identity and labels

- `silver.scope_registry` 的 `domain` 與 `directory` 必須二選一。`lrunes` 以 `lrunes.lo3rwang.cc` 作為 Domain 入口；`lo3rwang` 以 `/lo3rwang` 作為 Directory 入口。站台實際由 LOC 主機服務的 `/lrunes/` 是部署掛載位置，不是 Registry 的 Directory 模式。
- Scope 的正式顯示標籤取自資料庫的 `display_name`；`scope_id` 是固定識別碼，不另外指定網頁標題。
- Domain 採 `<scope_id>.lo3rwang.cc` 時，主機名稱的各段不得重複，建立時必須先拒絕，例如 `aaa.aaa.com.tw`。
- 新的動態 Scope/Group 使用共用 Next 靜態路由 `/scope/?scope=<scope_id>`。
- Scope 關鍵詞 Class／符文66的複製位於 Scope 的 Keyword Library，非全域 Admin。


## Runtime data

Static frontend 的主要 Current canonical data 來自 Supabase PostgreSQL。公開功能透過 provider-neutral Data API boundary 讀取；匿名公開 SELECT 在主來源失敗時可使用 Neon 唯讀備援，畫面須標明備援資料及可能的同步延遲。Authenticated writes、管理、OAuth 與 RLS 權限仍走原本主要路徑，不自動 fail over。

Runtime 不從 repository Markdown、JSON snapshot 或 local corpus file 載入 Current content；備援讀取不形成第二套可編輯 Canon。

## Authority split

- main：Current code/documentation。
- Next filesystem：route authority。
- Scope registry：deployment／navigation metadata。
- silver.manage：data Scope 與 table mapping。
- PostgreSQL canonical tables：runtime data authority。
- Management auth／RLS：write authority。

## Deployment rule

一次變更應盡量形成一次主要驗證結果。完成並 merge 的工作 branch 必須 freeze，不再從舊 branch 延伸新工作；新工作以最新 main 為起點。
