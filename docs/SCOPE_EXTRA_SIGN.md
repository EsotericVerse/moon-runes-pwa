# Scope Extra Sign — 公開個人 IP 標記

**狀態：** 固定、公開的 Scope 身分表記，不是管理權限、會員識別或上線狀態。

## 擁有權與分層

1. `silver.scope_registry` 的 `extra_sign` 是唯一且可為 NULL 的 **Sign Key**。資料庫在建立 Registry 節點（註冊）時，依保留 Scope ID、種類及當時的管理者 Email 映射決定；不接受瀏覽器直接指定 Sign。
2. 已存在的三個保留節點於初次遷移補登記一次。後續正常讀取、登入、登出與一般 Registry 編輯都不會重新判定 Email 或變更 Sign。
3. 登記資格在 `docs/sql/scope-extra-sign.sql` 集中處理。這裡以 `silver.manage` 的 `lo3rwang` Admin Email 為原始擁有者依據；`lo3rwang`、`lrunes` 需有相同 Email 的管理映射。`loc` 是根 Group，不存在自己的管理映射，沿用該原始擁有者判定。
4. 前端公開讀取 `scope_registry.extra_sign`，`app/loc/hero-extra.mjs` 依 Key 與 Scope ID／種類映射固定的文字及小圖標記，`app/styles/extra.css` 管理其全部視覺。Sign 對**所有訪客**可見，不需登入，也不公開管理者 Email。
5. 目前固定清單：`loc/group → codex`（圓環＋中心實心點）、`lo3rwang/scope → anchor`（光之定錨點）、`lrunes/scope → moon`（黃色圓點）。`codex` 僅為既存唯一鍵，畫面不顯示「X」。
6. 新的獨特 IP Sign 需日後視使用者意見**明確追加白名單／擁有權判定與 CSS 表現**；一般新增 Scope 不自動取得 Extra。
7. **不製作兩小時亮綠燈／登入提示／在線狀態。** Extra Sign 無關 Session，無須為它建立活動追蹤。

## 實作邊界

- CSS 僅管理視覺，不能認證擁有權或提供資料權限。
- RLS、Scope Admin、Role、Scope Group 與 Galaxy／Time 查詢都維持原有責任，不因 Extra Sign 修改。
- 目前沒有建立新的 Sign 申請 UI、付費機制、公共註冊政策或動態圖檔儲存。
- 任何未來允許變更／移轉 Sign 擁有權的需求，都必須設計明確的後端管理流程；不可透過操縱頁面 class 或 session 將未登記者變成持有人。
