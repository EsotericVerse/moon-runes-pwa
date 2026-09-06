# LOC8 Google Sheet API (Apps Script)

## 目前部署資訊

- Deployment ID: `AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei`
- Web App: `https://script.google.com/macros/s/AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei/exec`
- Apps Script Library: `https://script.google.com/macros/library/d/1Cx8KjqchTriYNa4fkwtuJDP4C-u22U0sPGOIhLdhgzT_MN9Xo_8TPytm/6`

> 注意：Library URL 是 Apps Script 程式庫版本連結，不是 LOC8 的 Google Sheet 資料庫網址。實際資料仍在 LOC8 Google Sheet 的 `User` / `Event` / `Relation` 分頁。

這個 Apps Script 將 `life.html` 與 LOC8 Google Sheet 的 `User` / `Event` 分頁連起來。

## 部署

1. 在 LOC8 Google Sheet 開啟「擴充功能 → Apps Script」。
2. 將 `Code.gs` 全部貼入。
3. 專案設定的時區設為 `Asia/Taipei`。
4. 「部署 → 新增部署作業 → 網頁應用程式」。
5. 執行身分選「我」；測試階段存取權限選可從網頁呼叫此 Web App 的範圍。
6. 複製部署後的 `/exec` URL。
7. 將正式部署的 `/exec` URL 寫入 `life.html` 的 `SHEET_API_URL`。前端使用者不需要設定或輸入後端網址。

## API

- `GET ?action=health`：健康檢查
- `GET ?action=events&user_id=lo3rwang`：取得指定使用者事件
- `GET ?action=users`：取得使用者
- `GET ?action=relations&user_id=lo3rwang`：取得指定使用者關聯
- `POST action=event`：新增事件
- `POST action=update_event`：依 `id` 更新既有事件
- `POST action=archive_event`：依 `id` 將事件標記為 `archived`
- `POST action=delete_event`：依 `id` 刪除事件
- `POST action=relation`：新增關聯
- `POST action=update_relation`：依 `id` 更新關聯
- `POST action=delete_relation`：依 `id` 刪除關聯
- `POST action=user`：新增使用者

事件會依 `Event` 第一列欄位寫入；使用者依 `User` 第一列欄位寫入。

> 目前是單人 MVP。OAuth 與正式權限邊界之後再接；在此之前，不要把 Web App URL 當成安全授權機制。


## v0.3 編輯流程

`life.html` 的 Timeline 每筆事件都有「編輯」與「封存」。編輯會把既有 Event 帶回表單，儲存時使用 `update_event` 覆寫同一筆 `id`；封存只更新 `status=archived`，不刪除歷史。


## Shared reference fields

The `Event` sheet now includes four shared cross-LOC reference columns:

- `system_id`: canonical language-system ID. Current default: `lo3rwang`.
- `primary_loc`: canonical owner of the record. LOC8 Events default to `LOC8`.
- `related_locs`: other LOC domains that consume or interpret the event.
- `era_id`: stable ERA reference such as `ERA-P8`.

These fields follow `data/shared/LOC_SHARED_SCHEMA.json` and should remain references rather than duplicated canonical definitions.

The current shared-registry foundation is tracked in `data/shared/LOC_SHARED_MANIFEST.json`.


## Frontend endpoint policy

`life.html` uses one application-owned Apps Script Web App endpoint. The endpoint is infrastructure configuration, not user data, so it is not exposed as an editable field in the UI.

Multiple users or language systems should share the same application endpoint and be separated by record identifiers such as `user_id` and `system_id` (with proper authentication/authorization added before multi-user production use). A separate Google Sheet per user is not the intended client-side configuration model.

Browser `localStorage` is used only as a cache/fallback for recently loaded records; it no longer chooses or stores the backend endpoint.


## Relation Library / Graph-ready model

LOC8 v1.0 將 Relation 提升為一級資料，不再只依賴 Event 的 `state_before` / `state_after` 串成線性時間線。

`Relation` Sheet 欄位：

```text
id
user_id
date
source_type
source_id
target_type
target_id
relation_type
direction
summary
evidence
confidence
era
era_id
primary_loc
related_locs
status
created_at
updated_at
visibility
```

建議 relation types：

- `transitions_to`
- `evolves_from`
- `extends`
- `reframes`
- `contradicts`
- `integrates`
- `expresses`
- `belongs_to`
- `influences`
- `references`
- `corresponds_to`
- `causes`

Timeline 是時間投影；Trajectory 讀取 Relation edge；未來 Graph View 可直接使用同一批 Relation 資料。

### 部署注意

GitHub 中的 `loc8_api/Code.gs` 更新後，既有 Apps Script Web App 不會自動變更。必須將新版 Code.gs 同步到 Apps Script 並建立/更新 deployment，`life.html` 的 Relation CRUD 才會連到 v1.0 API。
