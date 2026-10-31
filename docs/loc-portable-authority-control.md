# LOC 獨立 Authority 與資料庫復原控制層

此版本提供一套 **與 Supabase／Neon 等業務 SQL 資料庫無關**的管理入口及權限儲存。目前獨立 Cloudflare 控制 Worker 已部署；主站全部 CRUD、Realtime、第三方 JWT／RLS、Neon Data API 及無停機切庫仍未完成端對端驗收，不能聲稱 Supabase 中斷時整站正常。Clerk 是可選的登入提供者（優先使用）；也可另外配置第二個 OIDC 身分提供者。資料庫故障不會阻止復原頁本身開啟，但未部署、未配置身分服務時不能假裝已通過登入。

## 目前已有的可操作元件

- `public/recovery/index.html`：完整獨立靜態管理入口，**不使用 Next.js AppShell、公開 Bootstrap、Supabase SDK、Neon SDK**。固定網址 `/recovery/index.html`。從一般設定頁僅提供文字入口，不在首頁載入 Authority。
- `public/recovery/config.json`：三個**公開**設定值 `publishableKey`、`frontendApiUrl`、`controlUrl`。**Clerk Development 與獨立 Authority Worker HTTPS URL 均已配置。** 此檔不含私鑰，不能當成機密儲存。獨立復原頁可載入 Clerk、登入與顯示 User ID；Authority 已部署於 Cloudflare Worker，實際 JWT／管理員權限仍須透過使用者瀏覽器執行端對端驗證。
- `workers/loc-authority/index.mjs`：獨立 Cloudflare Worker，使用 RSA 簽章、Issuer、Audience/Authorized Party、有效期限及 Root 主體白名單驗證管理員；沒有業務資料庫呼叫。
- `workers/loc-authority/wrangler.jsonc`：控制服務專用 Worker，採 SQLite-backed Durable Object。絕不將其綁到目前 `loc-isr` 的儲存或部署週期。
- 管理員可建立／編輯 PostgreSQL、MySQL、SQL Server 連線目標；密碼用 AES-256-GCM 加密，回傳的清單不包含密碼。更新時留空可沿用原密碼。
- LOC Authority 對每一個已確認的 `provider + subject + scope + action` 保存明確授權，設定有效期限，能立即撤銷；不同 Scope **不自動繼承**。實際 SQL Gateway 必須在每次私人操作前執行獨立授權。
- 根管理權限從 Cloudflare Secrets 的明確使用者 ID 清單判定；**不接受使用者自報角色／郵件**。
- `workers/loc-authority/sql-authorization.mjs`：SQL 引擎無關的 Scope／資源分類與 fail-closed 授權判斷；公開參照表只開放讀取，其他須有對應 Scope 的有效授權。此模組本身不會執行 SQL。

## Clerk Development 與獨立控制 Worker（部署完成；正式站切庫未接通）

1. Clerk Development 應用程式、Publishable Key 與 Frontend API URL 已準備並寫入。仍須核對登入方式與 MFA、取得 JWT 公鑰，以及管理員實際登入後的 Clerk `user_` ID；不能用未驗證的 Email 取代 User ID。
2. `public/recovery/config.json` 前兩項已配置。控制 Worker 建立後，才填入第三項並部署靜態資源：
   - `publishableKey`：已配置 Clerk Development Publishable Key；
   - `frontendApiUrl`：已配置 `https://precise-grackle-3371.clerk.accounts.dev`；
   - `controlUrl`：已設定 `https://loc-authority-control.sopa2306.workers.dev`。
3. 在 **獨立控制 Worker Secrets**（不得放 `NEXT_PUBLIC_` 或 Git）設定：
   - `LOC_CLERK_ISSUER`：簽章 Token 的 Issuer；
   - `LOC_CLERK_JWT_PUBLIC_KEY`：對應的 RSA Public Key PEM；
   - `LOC_RECOVERY_ROOT_CLERK_IDS`：允許管理復原的 Clerk 使用者 ID，多人以逗號隔開；
   - `LOC_CONTROL_ORIGIN`：網站的精確 HTTPS origin；
   - `LOC_CONTROL_ENCRYPTION_KEY`：32 位元組隨機密鑰的 Base64；**必須安全備份**，否則已加密的連線設定無法解開。
4. 獨立 `loc-authority-control` Worker 已部署並啟用；根管理員 subject allowlist 與 AES-GCM 加密 Secret 已存放 Cloudflare Worker Secrets。需要實際 Clerk JWT 驗證，才可完成管理驗收。**不需遷移文章或停用現有 Supabase／Neon。**

### 可選第二登入來源（不強制安裝）

可另外使用 OIDC RSA 簽章的 ID/Access JWT（必須是已驗證的、具指定 Audience 的 Token）。獨立設定 `LOC_SECONDARY_ISSUER`、`LOC_SECONDARY_JWT_PUBLIC_KEY`、`LOC_SECONDARY_AUDIENCE`、`LOC_RECOVERY_ROOT_SECONDARY_SUBJECTS`。第二身分可從受信任的客戶端呼叫同一控制 API；目前靜態頁優先實作 Clerk UI，**尚未提供第二 OIDC 的 GUI 登入元件**。Clerk 並非 Authority 資料的擁有者。

## 復原行為與尚未閉合之處

- `GET /v1/identity` 只回應已完成密碼學驗證的身分，不賦予資料管理權。
- `GET /v1/me`、`GET /v1/state`、`PUT /v1/targets/:id`、`POST /v1/primary`、`GET|PUT /v1/grants`、`POST /v1/revoke` 需 Root 管理員權限。
- Durable Object 內部 RPC `mayAccess` 對每次動作進行獨立 Scope 授權判斷；`getPrimaryProfileForGateway`／`getProfileForGateway` 只能透過**可信 Worker 的 Durable Object 綁定**取得解密連線設定，絕不能向瀏覽器提供。
- 選定新的復原目標會更新 Durable Object 的 `primary_id`，**不會自動修改目前網站的 Supabase／Neon 路由，也不代表新 SQL 已登入、可用或 Schema 完整**。
- 要達到真正無部署切庫，仍需要**可信的動態 SQL Gateway**從 Durable Object 讀取目前目標、連線、確認必要 Schema，並在每次私人 CRUD 執行前套用 Authority，再把 LOC 正式資料流切換到該 Gateway。現有 `supabase/functions/loc-kysely`、`app/loc/providers/configured.mjs` 依然包含 PG/RLS/Supabase/Neon 路由，**尚未完成全 SQL Portable 的正式路由切換**。
- 所有公開 Guest 網站仍用現有資料路徑；Clerk、控制 Worker 的故障不應增加首頁依賴。
- 本階段沒有替你申請 Clerk、沒有部署新 Worker、沒有寫入正式業務資料庫、沒有修改 Cloudflare 現有專案設定。

## 無需 Clerk 帳號即可驗證

- `npm run check:syntax`
- `npm run test:authority`：測試 JWT 簽章／簽發者／授權來源／受信任管理員、第二 OIDC、非管理員拒絕、Scope 授權與撤銷／TTL、加密資料不外洩、靜態入口不依賴 AppShell。
- `node --test scripts/test-portable-sql-authority.mjs`：測試跨 SQL 引擎權限分類與未授權資料隔離。

上述是測試**指令**，不是已執行完成的證明；正式交付前應在裝妥依賴的 workspace 執行。Clerk／Cloudflare 的真實整合驗收需等平台設定完成。

## Development 與 Production

目前為 Clerk `pk_test_` Development instance，適合測試登入與確認 `user_` ID，**不得當成正式 Production 身分服務**。正式上線前必須切換 Clerk Production instance 的 Publishable Key／Frontend API 網域、合法設定憑證與 HTTPS Domain，重新配置 Control Worker JWT issuer／公鑰和受信任管理員 ID；不能把 Development 的帳號／權限自動認為 Production 已驗證。
