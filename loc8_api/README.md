# LOC8 Google Sheet API (Apps Script)

## 目前部署資訊

- Deployment ID: `AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei`
- Web App: `https://script.google.com/macros/s/AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei/exec`
- Apps Script Library: `https://script.google.com/macros/library/d/1Cx8KjqchTriYNa4fkwtuJDP4C-u22U0sPGOIhLdhgzT_MN9Xo_8TPytm/6`

> 注意：Library URL 是 Apps Script 程式庫版本連結，不是 LOC8 的 Google Sheet 資料庫網址。實際資料仍在 LOC8 Google Sheet 的 `User` / `Event` / `Relation` 分頁。

這個 Apps Script 將 `life.html` 與 LOC8 Google Sheet 的 `User` / `Event` / `Era` / `Runes` / `History` / `Relation` 分頁連起來。現行 health schema 為 `loc8-mvp-1.1`。

## 部署

1. 在 LOC8 Google Sheet 開啟「擴充功能 → Apps Script」。
2. 將 `Code.gs` 全部貼入。
3. 專案設定的時區設為 `Asia/Taipei`。
4. 「部署 → 新增部署作業 → 網頁應用程式」。
5. 執行身分選「我」；測試階段存取權限選可從網頁呼叫此 Web App 的範圍。
6. 複製部署後的 `/exec` URL。
7. 將正式部署的 `/exec` URL 寫入 `life.html` 的 `SHEET_API_URL`。前端使用者不需要設定或輸入後端網址。

## API

### GET

- `GET ?action=health`：健康檢查；現行應回傳 `schema: loc8-mvp-1.1`。
- `GET ?action=diagnostics`：只讀診斷；檢查 User / Event / Era / Runes / History / Relation 分頁是否存在，以及必要 header 是否齊全，不讀出資料列。`ready: true` 代表所有 required Sheet 契約完整。
- `GET ?action=smoke_test&confirm=LOC8-CRUD-SMOKE`：自清理 CRUD smoke test。只建立 `SMOKE-*` 測試資料，對 Event / Era / Runes / Relation 執行 create → update → verify → delete，最後一定嘗試清除測試列，不碰正式資料。
- `GET ?action=events&user_id=lo3rwang`：取得指定使用者事件；會排除已分流至 Runes 的每日抽牌紀錄。
- `GET ?action=users`：取得使用者。
- `GET ?action=eras`：取得 Era 分頁資料；Era 分頁不存在時回傳空陣列。
- `GET ?action=daily_draws&user_id=lo3rwang`：取得每日抽牌紀錄。
- `GET ?action=history&user_id=lo3rwang`：取得 History 分頁資料；分頁不存在時回傳空陣列。
- `GET ?action=relations&user_id=lo3rwang`：取得指定使用者關聯。

### POST

- `action=user`：新增使用者。
- `action=event`：新增事件；若 payload 被辨識為 daily draw，會改寫入 Runes。
- `action=update_event`：依 `id` 更新既有事件。
- `action=archive_event`：依 `id` 將事件標記為 `archived`。
- `action=delete_event`：依 `id` 刪除事件。
- `action=era`：新增 Era。
- `action=update_era`：依 `era_id` 更新 Era；若 repository-governed Era 尚未存在於 Sheet，現行程式會 upsert 建立資料列。
- `action=delete_era`：依 `era_id` 刪除 Era。
- `action=daily_draw`：新增每日抽牌紀錄。
- `action=update_daily_draw`：依 `id` 更新每日抽牌紀錄。
- `action=delete_daily_draw`：依 `id` 刪除每日抽牌紀錄。
- `action=batch_update_daily_draws`：批次更新每日抽牌。
- `action=batch_delete_daily_draws`：批次刪除每日抽牌。
- `action=migrate_daily_draws`：將 Event 中的舊每日抽牌紀錄複製到 Runes；會依 `id` 避免重複。
- `action=relation`：新增關聯。
- `action=update_relation`：依 `id` 更新關聯。
- `action=delete_relation`：依 `id` 刪除關聯。

各資料列依對應 Sheet 第一列 header 做欄位映射。第一列可保留空白欄位位置，但正式資料欄應使用明確且不重複的 header 名稱。

> **部署版本治理：** GitHub 的 `loc8_api/Code.gs` 是程式碼來源，但 Apps Script Web App 不會因 GitHub commit 自動更新。每次 `Code.gs` 變更後，都必須同步至 Apps Script 並更新 deployment；只有線上 `?action=health` 回傳 `loc8-mvp-1.1`，才能確認目前部署至少符合 v1.1 health contract。


### 部署後驗證

更新 Apps Script deployment 後，建議依序開啟：

1. `?action=health`：確認 `ok: true` 且 `schema: loc8-mvp-1.1`。
2. `?action=diagnostics`：確認 `ready: true`；若為 `false`，查看各 Sheet 的 `missing_headers`。
3. `?action=smoke_test&confirm=LOC8-CRUD-SMOKE`：確認 `passed: true`，代表 Event / Era / Runes / Relation 的 create / update / cleanup 都可用。
4. 再回 `life.html` 測試真實 UI 的 Event / Era / Daily Draw / Relation 讀寫。

`diagnostics` 不會新增、修改或刪除 Sheet 資料。`smoke_test` 只操作自己建立的 `SMOKE-*` 測試列，並在 `finally` 階段清理。

## v0.3 編輯流程

`life.html` 的 Timeline 每筆事件都有「編輯」與「封存」。編輯會把既有 Event 帶回表單，儲存時使用 `update_event` 覆寫同一筆 `id`；封存只更新 `status=archived`，不刪除歷史。


## Shared reference fields

The `Event` sheet now includes four shared cross-LOC reference columns:

- `system_id`: canonical language-system ID. Current default: `lo3rwang`.
- `primary_loc`: canonical owner of the record. LOC8 Events default to `LOC8`.
- `related_locs`: other LOC domains that consume or interpret the event.
- `era_id`: stable ERA reference such as `ERA-P8`.

These fields follow `data/json/registries/LOC_SHARED_SCHEMA.json` and should remain references rather than duplicated canonical definitions.

The current shared-registry foundation is tracked in `data/json/registries/LOC_SHARED_MANIFEST.json`.


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
