# 月典 App｜設定中的共用符文體驗（LOC8 風格延續）

## 定位

「設定」是全域入口，不是符韻 Scope 專用的管理工具；原生 iOS App 依 LOC8 晝夜畫面構想，把今日符文、抽取操作、行事曆與近期位向分析組成可操作的個人觀測面板。原本 LunaRunes 中的符文母資料、66 張卡牌、規則與 Canon 不移轉所有權；這裡只重用成熟的抽牌／解讀功能。現有全域六鍵 NAV 順序、名稱與功能不變。

### 執行環境 × 權限

| 執行情境 | 設定抽牌 | 寫入裝置 SQLite | 查看 App 晝夜生活面板 | SQLite 匯入／匯出 |
|---|---|---|---|---|
| iOS App 訪客（未登入） | 是 | 否 | 是（不顯示個人紀錄） | 否 |
| 網站訪客（未登入） | 不顯示 | 否 | 不顯示 | 否 |
| OAuth 已登入，但沒有 LunaRunes Scope 權限 | 是 | 否 | 僅 App（不顯示個人紀錄） | 否 |
| OAuth 已登入，且有 LunaRunes Scope 管理權限 | 是 | 是 | 僅 App（本機分析） | App 內可用 |

這個區別**不以 OAuth 是否登入取代 Scope 授權**，亦不能拿 App 與網站環境判斷取代 DB RLS。授權資料依既有 `account.canManageScopeSync('lrunes')`，不另設用戶白名單。

## 手機 App 日／夜儀表板

- 延續 LOC8 原日／夜草圖：夜間深藍月光／湖面、白日晨光／淡紫與山影的視覺方向。實作為即時 CSS 和真實資料圖，而不是把整張 Mockup 當成固定圖片。
- 依 iOS `prefers-color-scheme` 決定日／夜的區域性外觀，不改全站 Scope Theme，也不增加另一套底部導覽列。
- 今日符文：最近保存的符文／位向，以及既有解讀摘要。
- 快捷：每日抽牌、三張、五張、行事曆。
- 有管理權限者：查看本機 SQLite 最近 7／30／90 天的抽符筆數、日期、四向分布及兩類方向占比；少於三筆則顯示資料不足，不宣告實際事件吉凶。
- 沒有 Scope 寫入權限者：可抽但不能保存，面板不虛構個人歷史與統計。

## SQLite 專用備份邊界

- 使用 Capacitor `@capacitor-community/sqlite` 儲存 iOS App Sandbox 內的真實 SQLite 資料庫。
- 匯出另建立一份標準 SQLite binary（以 `SQLite format 3\0` header 驗證），三張表：`rune_draw_history`、`lrunes_daily`、`rune_file_meta`。
- 使用 `sql.js` 解析／輸出 binary，而非輸出或接受改名為 .sqlite 的 JSON 檔。匯入須完整性檢查、schema marker/version 確認、逐筆欄位驗證、預覽和明確確認，採主鍵去重合併；不可寫入任意 SQL。
- 輸出為本機檔案分享／下載；輸入為裝置本機 `.sqlite`／`.sqlite3`／`.db` 選取。沒有伺服器檔案上傳、Supabase/Neon 匯入，也不更新 canonical `silver.lrunes_daily`。
- 已具 Scope 權限者可**讀取既有 canonical 每日紀錄製作離線備份**；其本機 SQLite 匯入不等於同步回 canonical，也不自動覆寫線上資料。
- App 中只有得到 Scope 權限的使用者才會載入裝置歷史，訪客可以自由抽牌但不會偷偷留下追蹤紀錄。
- 這是「每日符文專用 SQLite 備份」試驗，**不是**另案 Native Local File（例如 MSN 原始檔）的一般檔案儲存替身。
- 匯出透過原生 Capacitor Filesystem 在 Cache 生成短期二進位 SQLite 備份，並以 Capacitor Share 呼叫 iOS 分享／儲存到 Files；不經網路或私自寫入 iCloud。檔案選取使用裝置的本機選檔介面。
- 原生 Filesystem／Share 的實機互通、暫存檔壽命及 iOS SQLite 沙盒備份政策必須新 IPA＋實體 iPhone 確認，不能以 CI 代替。

## 驗證界線

- `npm run verify:lrunes-settings`：App／網站四種權限、零筆資料、7／30 天位向分析、真 SQLite byte/header/schema 串接、拒絕假 JSON。
- `npm run verify` 與 Next.js build、iOS compile CI：確認基本技術相容性，不等同 App 端檔案分享／沙盒持久化／正確備份人工驗收。
- 不因本功能增加資料庫 Schema、Scope 欄位、同步排程或改動符韻原本抽牌頁。未明確要求前不自動發布新 IPA。
