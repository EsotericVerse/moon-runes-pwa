# LOC 全站功能分布與治理契約

> 本文件描述網站功能 ownership。首頁 LOC 架構圖說明「LOC 是什麼」；本文件說明「功能放哪裡、誰能改、資料如何流動」。

## 全站配置原則

- 各功能頁頂端 `Overview`：公開說明用途、狀態與使用方式。
- 功能頁：以 Read / Use 為主，不因管理者登入而把 CRUD 散落到各頁。
- Governance：全站 Control Plane，集中 Ingest / Validate / Classify / Scan / Publish / CRUD / Sync / Exception。
- OAuth：寫入能力 gate；未授權使用者維持唯讀。
- Settings：只處理個人 UI、偏好與個人同步，不管理共享 Canon / corpus。

## 功能 ownership

| 區域 | 公開功能 | OAuth 管理功能 | 資料責任 |
| --- | --- | --- | --- |
| LunaRunes | 抽牌、每日符文、符文資料、範例 | 共享每日資料由 Governance 管理 | Canon/Base66 唯讀；個人紀錄 local-first |
| Context | Graph、事件與關係 Overview / 使用 | 事件與關係 CRUD 集中 Governance | Context shared state |
| Statistics | 排行、統計、來源狀態 | 不放匯入與 corpus CRUD | derived projection |
| Culture | 時期、軌跡、文化觀察 | ERA / shared state 管理集中 Governance | temporal/cultural projection |
| Search | 查詢與結果 | 不放資料 CRUD | governed search projection |
| Library | 典籍、作品、全文/摘要/metadata 展示 | 典籍新增、修改、刪除、替換集中 Governance | corpus/library projection |
| Governance | 原則、架構、狀態、功能分布 | 上傳、CRUD、掃描、同步、發布、例外處理 | control plane |
| Settings | 個人設定與同步狀態 | 個人 OAuth/Drive 授權 | user-owned state |

## Governance pipeline

`Upload / Source → Validate → Content Level → Provenance / Version → Keyword Scan → Index / Statistics → Publish`

### Content Level

- `full`：保存完整原文，可做全文搜尋與段落級分析。
- `summary`：只有摘要或 retrieval projection，不得宣稱全文已分析。
- `metadata`：只有來源、日期、識別資訊等。

### 更新與例外防治

- 關鍵字掃描完成即形成同一版本的 Search / Statistics projection，不再要求第二次人工「更新排行榜」。
- `summary → full` 是合法升級。
- `full → summary` 不得自動覆蓋，必須阻擋並列入例外。
- hash 未變更則不重處理。
- Schema 不合、來源缺失、重複 ID、版本倒退、掃描成功但發布失敗都必須保留上一個已發布版本。
- 原始來源不可被衍生分析覆寫。

## 資料層

- Canon / large corpus：JSON + manifest/version + incremental sync。
- Shared live state：KV / State API。
- Personal data：IndexedDB local-first；Google Drive 可選備份/還原。
- Search / Statistics：由已治理資料產生的 projection，不是 source of truth。

## 權限

公開使用者可 Read / Use / Observe。共享資料的 Create / Update / Delete / Publish / Rescan 只有 OAuth 授權管理者可執行。敏感的內部路徑、repo 檔名與管理資訊不投影到公開 Search。
