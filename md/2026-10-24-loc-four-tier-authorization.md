# LOC 四級使用者與事件觸發授權

- 文件性質：作者設計決策與現況對照（非已完成驗收報告）
- 設計討論：2026-10-23；整理：2026-10-24
- 作者／決策來源：Lucas Oscar Wang（政德），LOC 設計討論
- 狀態：主要行為已定義；現有實作部分可核對，完整端到端權限驗收待完成
- GitHub 正本：`md/2026-10-24-loc-four-tier-authorization.md`
- Galaxy 保存：與本 Markdown 同步；不公開搜尋、不納入文章統計

## 一、目標與邊界

將一般使用者閱讀、OAuth 身分、Scope 管理及全域管理的責任分開，讓公開功能不為了少數管理操作而反覆讀取認證與權限。前端是否顯示入口、是否載入編輯功能，與資料庫實際允許寫入，是兩個不同的安全邊界。

## 二、四種使用者狀態

| 狀態 | 定義 | 主要行為 |
| --- | --- | --- |
| Guest | 未登入 | 公開閱讀與不需帳號的功能；不因此取得管理權 |
| User | 已 OAuth 登入，但沒有任何管理 Scope | 個人設定、帳戶功能、手機友善介面；無 Scope 編輯權 |
| Scope ID | 取得指定 Scope 管理權限 | 僅操作授權 Scope 的資料；不得推定跨 Scope 權限 |
| Admin | 全域管理角色 | 依資料庫授權管理全域與相關 Scope |

四種狀態是產品權責模型，不等於現行程式必須輸出四種同名的 `role` 字串；目前 `use-account.js` 的管理角色主要回傳 `admin`、`scope` 或無管理角色，User／Guest 由是否登入區分。

## 三、權限讀取時機

1. 公開入口使用被動的 SDK 登入事件，不應為了導覽或展示啟動管理權限查詢。
2. 真正進入管理工作區、編輯模式等受保護功能時，再執行授權查核；每次明確進入編輯流程應可要求新鮮驗證。
3. 共用同一個工作階段的權限結果，不在每個畫面重複請求，也不因 focus 重複查詢。
4. 登出、黑名單判定、授權讀取錯誤時必須失效或拒絕管理能力；不得保留過時的編輯權限。
5. 前端快取只服務介面狀態，不能替代資料庫 RLS、RPC 和實際寫入時的權限判斷。

## 四、目前可核實的實作

- `app/loc/use-account.js`：`SESSION_KEY` 與 `MANAGEMENT_KEY` 分開；被動 session、進管理區後查核與 `refresh()`。
- `silver.loc`：從 `manage_email`、`manage_role` 等欄位讀取管理權限；舊 `silver.manage` 已非主要讀取來源。
- `app/loc/SearchManagement.jsx`：使用 `canManageGlobalSync()` 或 `canManageScopeSync(scopeId)` 判斷管理頁資格。
- 資料庫寫入的實際安全邊界仍需與 RLS／management RPC 一併驗收，不可只測前端按鈕。

## 五、後續驗收（尚未簽核）

- Guest／User 能順利公開閱讀，不觸發不必要管理權限查詢。
- User 不可越權管理；Scope ID 不可跨 Scope；Admin 能按既有授權進行管理。
- 重新登入、登出、黑名單、權限撤銷、切換 Scope、刷新與編輯提交皆須測試。
- 手機設定頁操作、載入狀態、錯誤處理與鍵盤／螢幕閱讀器行為應分別驗證。
- 異步權限失效時應 fail closed；不能宣稱已通過未執行的實際驗收。

## 六、與 LOC Authority 的界線

本文描述現行 LOC 四級使用者及觸發式查核策略；更廣的 Scope、Trust、TTL、跨 Scope 授權與外部身分整合，另見 `md/2026-10-24-loc-authority-core-definition.md`。兩者相關但不相同。
