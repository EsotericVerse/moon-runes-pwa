# LOC8 Google Sheet API (Apps Script)

## 目前部署資訊

- Deployment ID: `AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei`
- Web App: `https://script.google.com/macros/s/AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei/exec`
- Apps Script Library: `https://script.google.com/macros/library/d/1Cx8KjqchTriYNa4fkwtuJDP4C-u22U0sPGOIhLdhgzT_MN9Xo_8TPytm/6`

> 注意：Library URL 是 Apps Script 程式庫版本連結，不是 LOC8 的 Google Sheet 資料庫網址。實際資料仍在 LOC8 Google Sheet 的 `User` / `Event` 分頁。

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
- `POST action=event`：新增事件
- `POST action=update_event`：依 `id` 更新既有事件
- `POST action=archive_event`：依 `id` 將事件標記為 `archived`
- `POST action=user`：新增使用者

事件會依 `Event` 第一列欄位寫入；使用者依 `User` 第一列欄位寫入。

> 目前是單人 MVP。OAuth 與正式權限邊界之後再接；在此之前，不要把 Web App URL 當成安全授權機制。


## v0.3 編輯流程

`life.html` 的 Timeline 每筆事件都有「編輯」與「封存」。編輯會把既有 Event 帶回表單，儲存時使用 `update_event` 覆寫同一筆 `id`；封存只更新 `status=archived`，不刪除歷史。
