# Deployment Ownership

## Current deployment

LOC 是 Next.js static-export application。main 是 Current source branch；GitHub Pages deployment workflow 由 main build 產生公開靜態輸出。

主要 workflow：

- .github/workflows/deploy-pages.yml
- .github/workflows/next-architecture.yml
- .github/workflows/branch-freeze.yml

## Runtime data

Static frontend 的 Current canonical data 來自 Supabase PostgreSQL。公開功能透過 provider-neutral Data API boundary 讀取，不從 repository Markdown、JSON snapshot 或 local corpus file 載入 Current content。

## Authority split

- main：Current code/documentation。
- Next filesystem：route authority。
- Scope registry：deployment／navigation metadata。
- silver.manage：data Scope 與 table mapping。
- PostgreSQL canonical tables：runtime data authority。
- Management auth／RLS：write authority。

## Deployment rule

一次變更應盡量形成一次主要驗證結果。完成並 merge 的工作 branch 必須 freeze，不再從舊 branch 延伸新工作；新工作以最新 main 為起點。
