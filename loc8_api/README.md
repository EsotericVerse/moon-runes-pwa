# LOC8 Google Sheet API (Apps Script)

這個 Apps Script 將 `life.html` 與 LOC8 Google Sheet 的 `User` / `Event` 分頁連起來。

## 部署

1. 在 LOC8 Google Sheet 開啟「擴充功能 → Apps Script」。
2. 將 `Code.gs` 全部貼入。
3. 專案設定的時區設為 `Asia/Taipei`。
4. 「部署 → 新增部署作業 → 網頁應用程式」。
5. 執行身分選「我」；測試階段存取權限選可從網頁呼叫此 Web App 的範圍。
6. 複製部署後的 `/exec` URL。
7. 打開 `life.html`，在「Google Sheet API」設定欄貼入 URL，按儲存並測試。

## API

- `GET ?action=health`：健康檢查
- `GET ?action=events&user_id=lucas`：取得指定使用者事件
- `GET ?action=users`：取得使用者
- `POST`：以 JSON / text/plain body 寫入事件（預設）或使用者

事件會依 `Event` 第一列欄位寫入；使用者依 `User` 第一列欄位寫入。

> 目前是單人 MVP。OAuth 與正式權限邊界之後再接；在此之前，不要把 Web App URL 當成安全授權機制。
