# LOC 全站功能分布與治理說明

> 本文件描述網站功能放置、資料責任與權限邊界。首頁 LOC 架構圖說明「LOC 是什麼」；本文件說明「功能放哪裡、資料如何流動、誰能修改」。Governance 頁則集中呈現不同文化、系統與作者脈絡中已存在的治理理念與規則，三者不要混為同一層級。

## 全站配置原則

- 各功能頁頂端 `Overview`：公開說明用途、狀態與使用方式。
- 功能頁以 Read / Use 為主；共享資料的管理能力不因登入而散落到每個公開頁面。
- Governance 是治理理念與既有治理規則的集中展示／索引，不是 Control Plane、架構層或 CRUD 後台。
- OAuth 是受保護寫入能力的授權條件之一；未授權使用者維持唯讀。
- Settings 只處理個人 UI、偏好與個人同步，不管理共享 Canon / corpus。
- 每個文化有自己的治理。LOC 記錄並比較各自的語言、脈絡、規則、歷史與來源，不以 LunaRunes Canon 判定其他文化的對錯或優劣。
- **最高原則：所有可分析內容在第一次完成關鍵詞解析時，必須同步建立其 Search / Statistics / Culture 所需的第一層衍生資料，包括軌跡；不得要求之後再以人工方式補做同一批基礎分析。**
- **時期（Period / ERA）屬人工治理資料，可補充、增減、修訂；軌跡（Trajectory）屬系統依內容、關鍵詞、時間與作品關係自動推導的衍生資料，可重新計算與更新，但不可由人工直接編輯或刪除。**
- **最高原則：任何新的系統論點、治理原則、語法規則或模組定義，必須附至少一個可重現、可對照、可檢查的實例，才允許升級為正式更新。只有抽象論述而沒有實例者，維持假說／草案狀態，不得直接寫成 Canon。**

## 月之符文的特質化模板定位

月之符文目前作為 LOC「特質化模板／組合化模組」的代表實例：每一個符文保留自己的個別特質，但真正的表達能力來自這些特質依位置、數量、脈絡與語法被重新組合，而不是單張符文各自孤立地提供答案。

### 實例：雙卡、三卡、五卡、OW3gs 11 卡

- **雙卡**：作為最小因果模組，描述「原因／條件 → 結果／回應」的單純關係。
- **三卡**：採「源・轉・合」模板。它不是尋找某個神秘的『最佳時機』，而是先建立推論座標：源＝起點條件；轉＝變化條件；合＝在指定時間基準、階段與作用範圍下可能形成的整合方向。未來仍保持不確定性。
- **五卡**：把雙卡因果模組與三卡源轉合模組組合成有限複雜度情境；其中不確定變數保持精簡，讓條件與轉折仍可追溯。
- **OW3gs 11 卡**：作者特化的完整情景模組，透過多個因果／轉折片段建立較完整情境，並以第 7–11 張作核心判定。此模板是『個別特質可組合成高階模組』的現行代表實例，不宣稱是唯一可能的 11 卡語法。
- 其他創作者可以在其他張數、位置或用途建立自己的自訂註解與 grammar；但要升級成正式共享模板，同樣必須先提供可重現的實例與規則說明。

此實例說明：LOC 的模組化不是把每個特質磨平，而是保留個別特質後，再以可組合語法建立更高階的表達能力。

## 功能分布

| 區域 | 公開功能 | 受保護／管理功能 | 資料責任 |
| --- | --- | --- | --- |
| LunaRunes | 抽牌、每日符文、符文資料、範例 | 共享每日資料由受授權管理流程維護 | Canon/Base66 唯讀；選擇保存的個人紀錄進入 Neon user_records |
| Context | Graph、事件與關係 Overview / 使用 | 事件與關係共享狀態由受授權管理流程維護 | Context shared state |
| Statistics | 排行、統計、來源狀態；首次關鍵詞解析時同步形成軌跡基礎資料 | 不放 corpus CRUD；不得手動編輯軌跡 | derived projection / trajectory derivation |
| Culture | 時期、軌跡、文化觀察；以脈絡＋時期提供第一層進階解釋 | ERA / shared state 可由受授權管理流程維護；軌跡不可人工 CRUD | temporal/cultural projection |
| Search | 查詢與結果 | 不放資料 CRUD | search projection |
| Library | 典籍、作品、全文/摘要/metadata 展示 | 典籍維護由受授權管理流程處理 | corpus/library projection |
| Governance | 各文化／系統／作者治理理念、規則與歷史的集中展示及索引 | 不以 Governance 名義承接全站 CRUD | governance discourse / references |
| Settings | 個人設定與同步狀態 | Neon Managed Auth / RLS | authenticated Neon user state |
| Management | 不作為一般公開功能入口 | 已授權的共享資料維護與管理操作 | protected write operations |

## 資料處理鏈

共享資料若需要匯入、驗證、分類、掃描、索引與發布，這些是資料處理與管理流程，不代表它們屬於 Governance：

`Source → Validate → Content Level → Provenance / Version → Keyword Scan → Search / Statistics / Trajectory Projection → Culture Projection → Publish`

### 第一次關鍵詞解析原則

第一次對內容進行正式關鍵詞解析時，必須在同一分析版本內一次完成可由該次分析直接推導的第一層資料，包括：

- 關鍵詞與其基礎統計。
- Search projection。
- Statistics projection。
- 依時間、關鍵詞、作品／衍生關係可推導的 Trajectory projection。
- Culture 所需的第一層脈絡資料；Culture 只做中立、描述性、可驗證的初步解釋，不替作品建立不可驗證的深層意義。

不得將「軌跡」設計成人工逐筆補登欄位。當來源、關鍵詞、時間或作品關係變更時，系統應重新推導相關軌跡。

### 時期與軌跡的治理邊界

- **時期（Period / ERA）**：由人定義的文化／時間切分，可新增、補充、合併、拆分、修訂或刪除；變更後觸發相關 Culture / Statistics projection 重算。
- **軌跡（Trajectory）**：由系統根據已確認資料自動發現的時間序列／主題變化／作品關係結果，不是作者手寫敘事。
- 軌跡可以因資料新增、定義更新、關鍵詞重算而產生新版本，但**不可人工直接改寫內容，不可人工刪除特定不喜歡的軌跡結果**。
- 若軌跡有錯，修正其來源資料、分類規則、關鍵詞或演算法後重新計算；不得直接修飾輸出結果。
- 歷史軌跡版本可依版本治理保留，以便重現當時資料與規則下的推導結果。

### Content Level

- `full`：保存完整原文，可做全文搜尋與段落級分析。
- `summary`：只有摘要或 retrieval projection，不得宣稱全文已分析。
- `metadata`：只有來源、日期、識別資訊等。

### 更新與例外防治

- 關鍵字掃描完成即形成同一版本的 Search / Statistics / Trajectory projection，不再要求第二次人工「更新排行榜」或「建立軌跡」。
- 任何新論點若無至少一個實例，不得直接升級為正式 Canon／共享規則；先留在 hypothesis / draft，待實例完成再審核。
- `summary → full` 是合法升級。
- `full → summary` 不得自動覆蓋，必須阻擋並列入例外。
- hash 未變更則不重處理。
- Schema 不合、來源缺失、重複 ID、版本倒退、掃描成功但發布失敗都必須保留上一個已發布版本。
- 原始來源不可被衍生分析覆寫。

## 資料層

- Canon / large corpus：經治理後進入 Neon Current projection；大型資料維持 manifest/shard 與按需讀取。
- Shared Current data：Neon Data API / `api.runtime_json_documents`，公開唯讀。
- Personal data：Neon `api.user_records` / `api.user_settings`，透過 Managed Auth + RLS 隔離。
- Search / Statistics / Trajectory：由已確認來源產生的 projection，不是 source of truth。
- Period / ERA：人工治理的 temporal definition；可修改，但修改只改變切分／解釋框架，不得直接覆寫自動推導的軌跡資料。

## 權限

公開使用者可 Read / Use / Observe。共享資料的 Create / Update / Delete / Publish / Rescan 只允許受授權管理者執行。敏感的內部路徑、repo 檔名與管理資訊不投影到公開 Search。

對 Trajectory 的管理操作僅允許 `Recompute / Rebuild / Version / Publish`；不提供人工 `Edit / Delete trajectory content`。

## Governance 的文化邊界

Governance 頁可以同時索引 LunaRunes、LOC、作者或其他文化／系統的治理內容，但「被展示在 Governance 頁」不表示從屬於 Governance。比較不同治理時應保留各自來源、版本、歷史與爭議；若目標文化沒有既定治理，只描述目前可觀察到的資料與不確定性，不替它創造規則。
