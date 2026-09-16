# LOC 全站功能分布與治理說明

> 本文件描述網站功能放置、資料責任與權限邊界。首頁 LOC 架構圖說明「LOC 是什麼」；本文件說明「功能放哪裡、資料如何流動、誰能修改」。Governance 頁則集中呈現不同文化、系統與作者脈絡中已存在的治理理念與規則，三者不要混為同一層級。

## 全站配置原則

- 各功能頁頂端 `Overview`：公開說明用途、狀態與使用方式。
- 功能頁以 Read / Use 為主；共享資料的管理能力不因登入而散落到每個公開頁面。
- Governance 是治理理念與既有治理規則的集中展示／索引，不是 Control Plane、架構層或 CRUD 後台。
- OAuth 是受保護寫入能力的授權條件之一；未授權使用者維持唯讀。
- Settings 只處理個人 UI、偏好與個人同步，不管理共享 Canon / corpus。
- 每個文化有自己的治理。LOC 記錄並比較各自的語言、脈絡、規則、歷史與來源，不以 LunaRunes Canon 判定其他文化的對錯或優劣。

## 功能分布

| 區域 | 公開功能 | 受保護／管理功能 | 資料責任 |
| --- | --- | --- | --- |
| LunaRunes | 抽牌、每日符文、符文資料、範例 | 共享每日資料由受授權管理流程維護 | Canon/Base66 唯讀；個人紀錄 local-first |
| Context | Graph、事件與關係 Overview / 使用 | 事件與關係共享狀態由受授權管理流程維護 | Context shared state |
| Statistics | 排行、統計、來源狀態 | 不放 corpus CRUD | derived projection |
| Culture | 時期、軌跡、文化觀察 | ERA / shared state 由受授權管理流程維護 | temporal/cultural projection |
| Search | 查詢與結果 | 不放資料 CRUD | search projection |
| Library | 典籍、作品、全文/摘要/metadata 展示 | 典籍維護由受授權管理流程處理 | corpus/library projection |
| Governance | 各文化／系統／作者治理理念、規則與歷史的集中展示及索引 | 不以 Governance 名義承接全站 CRUD | governance discourse / references |
| Settings | 個人設定與同步狀態 | 個人 OAuth/Drive 授權 | user-owned state |
| Management | 不作為一般公開功能入口 | 已授權的共享資料維護與管理操作 | protected write operations |

## 資料處理鏈

共享資料若需要匯入、驗證、分類、掃描、索引與發布，這些是資料處理與管理流程，不代表它們屬於 Governance：

`Source → Validate → Content Level → Provenance / Version → Keyword Scan → Index / Statistics → Publish`

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
- Search / Statistics：由已確認來源產生的 projection，不是 source of truth。

## 權限

公開使用者可 Read / Use / Observe。共享資料的 Create / Update / Delete / Publish / Rescan 只允許受授權管理者執行。敏感的內部路徑、repo 檔名與管理資訊不投影到公開 Search。

## Governance 的文化邊界

Governance 頁可以同時索引 LunaRunes、LOC、作者或其他文化／系統的治理內容，但「被展示在 Governance 頁」不表示從屬於 Governance。比較不同治理時應保留各自來源、版本、歷史與爭議；若目標文化沒有既定治理，只描述目前可觀察到的資料與不確定性，不替它創造規則。
