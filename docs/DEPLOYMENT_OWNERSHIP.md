# Deployment Ownership

## Current deployment

LOC 是 Next.js static-export application。main 是 Current source branch；GitHub Pages deployment workflow 由 main build 產生公開靜態輸出。

主要 workflow：

- .github/workflows/deploy-pages.yml
- .github/workflows/next-architecture.yml
- .github/workflows/branch-freeze.yml

## Domain vs Directory Registry

- Scope Registry 的 `domain` / `directory` 必須二選一，表示預期對外入口類型，不代表 DNS、Hosting 或 Next.js 路由已完成。
- `lrunes` 的正式入口為 `lrunes.lo3rwang.cc`（Domain）；既有網站轉址至 `loc.lo3rwang.cc/lrunes/`，此目錄只是實際服務路徑。Registry 應存 Domain，不應因轉址而與作者 Scope 混用 Directory。
- `lo3rwang` 使用 `loc.lo3rwang.cc/lo3rwang/`（Directory），不要求新增作者子網域的 DNS CNAME。
- 新增動態 Scope／Group 的可用 Next.js static-export 通用入口目前是 `https://loc.lo3rwang.cc/scope/?scope=<id>`。Registry 自動產生的 `/<id>` 或 `<id>.lo3rwang.cc` 是對外路由登記，不會自動建立靜態路徑、DNS 記錄或反向代理。對外啟用前需另行完成網站路由與 DNS／託管設定。
- Global Admin 的 Registry 管理只記錄路由配置；Scope 的關鍵詞 Class／符文66複製應由 Scope Keyword Library 負責。

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
