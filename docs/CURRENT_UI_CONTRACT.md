# Current UI Contract

**Version:** 0.9.1-rc.1

## Identity

Homepage title: LOC月典  
Homepage explanation: 語言架構框架（Language Architecture Framework）  
LunaRunes explanation: 符號式語言（Symbolic Language）

## Navigation

全站只有一套正式 NAV。GlobalNav 使用 ScopeNav；Page 內的選單、抽牌模式、圖鑑分類與管理選單都屬局部 UI，不建立第二套全站 NAV。

Current 共用功能固定為：

- Statistics
- Culture
- Governance
- Search

LunaRunes 首頁主流程固定為：

1. Hero 主視覺：LunaRunes artwork、單卡抽籤與每日符文主入口。
2. 次要功能列：符文圖鑑、符文遊戲、每日符文紀錄。
3. 月之符文籤詩系統介紹。
4. 基本判讀順序。
5. 其他指定張數抽牌。
6. 判讀與回測結果。

LunaRunes 的首頁只開放 Hero 文字透過 `silver.lrunes_blocks`（`page_name=hero`）使用 BlockNote 編輯；治理頁（`page_name=governance`）維持既有 BlockNote。首頁其他段落及抽牌、解籤、遊戲頁不開放 BlockNote 編輯，也不以 Blocks 作為 Canon／抽牌規則來源。`index` 現有判讀說明資料不刪除、不挪用。

Hero、功能列與內容段落依層級分工，不重複建立同一組主入口。雙卡／三卡／五卡保留既有牌陣結構；4／6／7／8／9／10 張使用指定抽牌數量 select；11 張維持 OW3gs。

NAV URL 由 Current Scope registry 產生。既有具名 Scope 維持 Next filesystem route；DB 新建的一般 Scope／Scope Group 使用固定 `/scope/.../?scope=<id>` static shell，因此新增 Scope 不需要新增 filesystem route。

## Scope presentation

- LOC 使用 loc.lo3rwang.cc。
- LunaRunes canonical domain 為 lrunes.lo3rwang.cc，並可由 loc.lo3rwang.cc/lrunes 進入。
- Author canonical mount 為 loc.lo3rwang.cc/lo3rwang。
- Admin 使用 admin.lo3rwang.cc。
- DB 新建的一般 Scope／Scope Group 立即使用 `loc.lo3rwang.cc/scope/?scope=<id>` 與同一組 Search／Statistics／Culture／Governance／Manage static shell；Registry 的 Domain／Directory 仍保存其部署／導引 metadata。

一般 Scope 不因缺少設定而繼承 LunaRunes 的關鍵詞、Style、Canon 或特殊 route 定義。

## Analysis presentation

Homepage 與共用分析以 Culture、Statistics、Search 為主：

- 單 Scope Culture 顯示時間、密度、來源與 Anchor；**LOC (`loc`) Culture 顯示交會時間長河、各 Scope 數量、綜合來源時間長河與個別 Scope 文化入口**。其他 DB 新建的 Scope Group Culture 才只提供 Registry Overview 與導引。
- 單 Scope Statistics 顯示自己的數量、來源、時間趨勢與圖表；**LOC (`loc`) Statistics 保留跨 Scope 合併總數、Scope 比例與時間趨勢**，可使用既有折線、長條、圓餅呈現。其他 DB 新建 Scope Group 的 Statistics 僅做 Overview／導引。
- 單 Scope Search 顯示精準文字／metadata 結果；**包括 LOC 在內的 Scope Group Search** 僅做 Scope Overview／導引，不同時搜尋所有子 Scope。Scope ID／中文名／英文名精確命中時只顯示對應 Scope 首頁入口並停止；風格關鍵詞精確命中時，先顯示時期設定中的短介紹，再列出一般相關結果。
- Governance 說明規則與管理責任。

不再以固定八模組圖作為 Current UI 架構定義。

## Theme

八組 Theme 必須各自提供完整 palette。切換 Theme 時不得從上一組或其他 Theme 繼承缺少的 palette token。共用 geometry 與 typography 可以共用；palette、surface、state、background 與 shadow 由 Theme 自己負責。

## CSS／DIV ownership（0.9.1 RC）

- LOC 與作者首頁的正式 DOM 只由 `ScopeEditableBlocks` 配合 `LocHomeBlockDisplay` 產生；一個 canonical Page Block 對應一個主要 frame，不另包一套作者首頁 section/Hero。
- 共用首頁 frame、圖片與標題幾何由 `app/styles/loc-about-original.css` 負責；`home-content.css` 保留真正使用中的標題組件與作者子頁排版，不能復活舊版 `author-home-hero`。
- `uiux.css` 保留全域語意風格；`responsive.css` 只保留有對應現行 DOM 的 RWD 調整，不得以增加 `!important` 或新 wrapper 取代已有組件。
- `app/modular/theme-registry.js` 的 43 個底層 Token 仍是現行 DB palette contract。本次 CSS 減法不修改它們；若未來提供八個上層語意控制項，必須作為既有 Token 的治理投影，不能增設第二個 palette authority。
- 編輯器與共用 Feature Hero 仍走原有 `ScopeEditableBlocks`；CSS 清理後須通過桌面／手機 Playwright 測試，並保留使用者人工外觀驗收。

## Localization boundary

固定 UI copy 可集中管理，但下列內容不得因 UI localization 被改寫：

- Galaxy／作品正文
- 歌詞、文章與創作文字
- LunaRunes rune name／English name
- LunaRunes Canon 語意
- 抽牌方向與籤詩 canonical data

## Keyword Library

Statistics 登入管理後的關鍵詞設定以 Class 為第一層。每個 Class 自己保存 Group、是否參與 Class 判定、項目名稱、判別原理與關鍵詞；整套 Class 可以複製成另一套獨立分類庫。Keyword Library UI 不依賴 LunaRunes Canon 才能顯示或編輯分類結構。

關鍵詞分析門檻屬於 Scope 自己的設定，不是 Admin 全域設定。lo3rwang 的 `keyword_min_chars` 預設為 32；正文去除空白後必須 **大於** 此值才進入關鍵詞分析。小於等於門檻的作品不分析，也不列入未分類母數。符合資格文章必須 **大於** `keyword_min_documents`（預設 100）才啟用關鍵詞統計。

每套 Keyword Class 使用 UUID，Scope 以 `current_keyword_class_id` 指向目前採用版本，並以 `keyword_class_share_enabled` 控制分享授權。規則修改後不即時計算；Scope 管理者明確執行一次批次分析，系統依時間順序完成分類並把結果寫入 Galaxy Attr：`class_id` 保存唯一 1–8 Class，`group_lists` 保存命中項目與次數；`false` 表示不參與分析，空 object 表示有參與但未命中。完全平手只在候選 Class 間依當下累積文章數動態分配，最後不保留 tie 狀態。

批次完成後以 `staticstime` 定錨；平常 Statistics／Culture 只讀文章 Attr 與定錨 metadata，不重新讀全文或關鍵詞庫跑分類器。關鍵詞設定以獨立管理頁 `/lo3rwang/statics/keywords/`（一般 Scope 使用 `/scope/statics/keywords/?scope=<id>`）提供；只有授權使用者進入該頁並手動操作才啟動設定／批次分析。統計頁不載入管理器，vis-network 只有選擇「視覺圖譜」才掛載。

## Admin Scope establishment and enforcement

- 新增 Scope 只填 Scope ID、必填管理者 Email、預設語系；Directory／Domain 為互斥 radio，Registry 路由資訊由 ID 推導。Parent 固定 `loc`，建立時複製一次 Rune66（66 rows 與全新 Class UUID）。
- 新 Scope 的 Theme 使用 `system-default`：現有系統日間 `theme-7`／夜間 `theme-1` 自動切換，並非固定 `theme-7`。Scope 設定仍允許手動選擇八組 Theme。
- Scope 節點的主要操作固定為「儲存／設定隱藏（或取消隱藏）／刪除」三項。隱藏只切換 `silver.scope_registry.active`，仍保留所有 canonical 資料；移除公開 Registry 導引，不代表資料本身變成私密。
- 「複製符文66風格」在每個 Scope 節點常駐：每次經管理權限檢查後複製來源目前 66 筆項目為新 UUID 的獨立 Class，不覆蓋既有 Class，也不自動切換目前使用的 Class。
- 「刪除」僅允許全域 Admin 永久移除非內建 Scope；前端必須再次輸入相符 Scope ID。資料庫執行層仍檢查全域權限、保護 `loc`／`lrunes`／`lo3rwang`／`admin`，以 `RESTRICT` 拒絕意外依賴，避免不受控 cascade。
- `silver.email_blocklist` 是全域 Email 黑名單，僅全域 Admin 可維護。任何命中的 OAuth Email（包含 `scope` 與 `admin`）都不得取得管理授權；資料庫 `silver.can_manage_scope`／`silver.can_manage_global` 是寫入時的權限邊界。前端明確提示「此帳號已列入系統黑名單，無法登入 LOC 管理功能」。黑名單限制管理登入／寫入，並不自動封鎖公開內容或撤銷第三方 OAuth 身分本身。

## Management visibility

管理頁必須能看到 canonical records，即使：

- Scope 的 public Search／Statistics／Culture flag 關閉；
- Galaxy searchable=false。

Public visibility 與 management visibility 是不同責任。

Admin 可建立 Scope、建立 Scope Group，以及修改 Registry 的顯示名稱、Domain／Directory、Parent、排序與 Active；Scope ID 與 Kind 建立後固定。Scope Group 不建立 corpus tables。Source Refresh 以 `source_name + source_native_id` 做 bounded delta preview／新增／更新，不掃描整張 Galaxy。
