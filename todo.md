## 2026-10-27｜目前有效待辦（使用者最新決定）

- **結案：** LOC-TODO-01、03、12；LOC-PLACE-01 的 DB 工作。
- **取消：** LOC-TODO-07、15、35；LOC-PLACE-02。ID 不重用，歷史可查 Git。
- **暫緩：** LOC-TODO-11（Facebook 地址／樓層）、LOC-PLACE-05（文章 `place_id` 批次關聯，等 Trace ID 整理完）、LOC-PLACE-06（LOC 來源 `scopeid` 顯示，不急）。雲端 ISR／R2／DO 繼續停用。
- **縮限：** LOC-TODO-10 以 React Select 地名候選為主，縣市非必填，不做樓層；LOC-PLACE-03 部分已有，04 沿用 React Select，不重複造介面。
- **ISR：已開啟，保持現狀，不要切換或重新部署。** Cloudflare／GitHub 自動部署仍不開；功能在 `main` 集中修完、自測後，由使用者決定一次手動部署。LOC 1.2 Release 門檻：穩定且已部署後，使用者自己操作五分鐘比較 ISR／功能／流量／成本。
- **#580：** 衝突源自已移除的 TODO 字串，不是程式衝突。

### 動態優先序（AGENTS.md 1–9，依目標/依賴/嚴重度/成本判斷，非固定排序）

1. **9／高：** 空間點線面與痕跡圖的程式／資料互動缺口。禁止自動部署。
2. **8／高：** TIME-01～05 動態時期與時間錨點（沿用隔離分支，不動文化／統計／搜尋）。
3. **7／高：** LOC-TODO-08／09 與空間整合（Frame／Queue、四層、Current、選站）；LOC-PLACE-03／04 補完。
4. **6／中高：** LOC-TODO-06 搜尋，及文化／統計／管理資料路徑（17～22、34）；ISR 關閉下四大功能要正常。
5. **5／中：** TODO2 匯入、LOC-TODO-25～29 手機／SQLite，及 TODO1 框架契約。
6. **4／中低：** LOC-TODO-05、23、24 等 UI／語系／快取修整。
7. **3／低：** LOC-PLACE-06、LOC-TODO-16。
8. **2／有空再想：** LOC-TODO-30、31、33（符文特效／3D 桌遊／《語文爭霸》），不急不做都可以。LOC-TODO-32 若不再發生就不追。
9. **1／暫緩：** LOC-TODO-11、LOC-PLACE-05。

> Security ≫ Portable > Loading = UI > Code 是工程權衡，不是用來反覆卡進度的理由。已完成待驗收的不再排進未完成清單。

---

## 2026-10-26｜Hero 對應與資料庫歸屬修復（PR #587，已合併main，待驗收）

- [x] 痕跡 Hero 名稱去重，保留 `group_trace/BRP7JEFQ`，刪掉重複的 `group_governance/997BFF13`。
- [x] 管理 Hero 各自獨立 `page_name`（TimeAnchor／ScopeKeyword／SpaceAnchor／ScopeAdvSearch／GalaxyManage／Groupkeyword／GroupSpace／GroupArticle）。
- [x] Hero 圖片補齊 `block_image`；Scope 四項共用 `scope-gn.jpg`，Admin 五項共用 `LOC-admin.jpg`。
- 證據：main SHA `d8020bc6`，CI [#40352344908](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40352344908) success。
- [ ] 待驗收：Admin 真實寫入/讀回、各入口路由與圖片顯示、使用者手動部署後確認正式站。
- [ ] 待判定：`group_manage` 還有 `E090E4CA`、`MGHERO06` 兩筆舊資料，是否整併暫未決定，不擅自刪。

---

## 2026-10-26｜Admin 選單整併（人員首頁／名單管理／網路設定）

- [x] **ADMIN-NAV-20261026**（PR [#586](https://github.com/EsotericVerse/moon-runes-pwa/pull/586)，main `53f7c2b7`）：Admin 預設「人員」，五個選單人員/名單管理/網路設定/區塊/配色；舊深連結 `?section=` 保留映射。CI [#40347854676](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40347854676) success（期間/定錨 8/8、Bootstrap 聚焦 9/9、文化分組 5/5、Build 257/257）。
- [ ] 待驗收：正式版 SHA、Admin 預設、舊連結導向、網路快取三模式、名單寫入、RLS、手機版。
- 分支清理：PR 已關閉；GitHub 連接器無刪分支功能，遠端分支標 `MERGED / NEVER REUSE`。

---

## 2026-10-26｜Admin「區塊」合併與管理 Hero（PR #585，已合併main，待驗收）

main `8ae9c3f2`，CI [#40341015031](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40341015031) success。

- [x] 區塊選單移除「頁面控管」，管理類別只留「系統管理」「個人設定」。
- [x] 文化/統計/痕跡/搜尋各新增對應「管理」子項（TimeAnchor/Keywords/SpaceAnchor/AdvancedSearch）。
- [x] 管理 Hero 沿用 `scope_manage` 共用圖，寫入 `silver.loc_blocks`。
- [ ] 待驗收：Admin 儲存→讀回→重進頁、無權限拒絕寫入、桌機/手機。
- 邊界：未開 ISR/自動部署；`time`/`trace`/`keywords` 表結構沒動，合併構想僅討論未授權執行。

---

# LOC 1.1 RC｜功能完整與無 ISR 依賴

## 集中驗收看板

> 工程完成、CI 通過、合併 main 的功能先放這裡集中列；使用者手動部署成功、工程端確認生效後才算「已部署待使用者驗收」；使用者整批驗收使用感，不逐項看 CI。急迫的安全/資料問題走快速通道，不用等集中批次。

### 已合併main、待集中手動部署

- [x] **Admin 系統管理五選單整併**（`ADMIN-NAV-20261026`，main `53f7c2b7`，[CI](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40347854676)）
- [x] **Admin 全站三段快取模式**（`task/isr-three-mode-admin-cache` → [PR #584](https://github.com/EsotericVerse/moon-runes-pwa/pull/584) → main `2c73439c`，[CI](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40342012352)）：ISR 設定三模式 off/cache/isr，存 `silver.loc_cache_runtime`；驗收路徑 Admin→ISR設定→切換/儲存/讀取。

---

## ISR 歷史擴充構想｜已開啟，仍禁止自動部署

這些是未來可做的延伸，不是現在的必做項：

- 全域共用快取擴充（公開圖片進邊緣快取、文化/統計/搜尋摘要恢復 ISR）：逐類審核 TTL/失效/Scope 隔離，不快取私有資料。
- ISR 故障時的手動切換模式（isr/off 兩種），不得把快取失敗誤報成資料庫連結失敗。
- Neon 單次整批對齊：只在 Supabase 全部完成後、使用者明確授權才做一次單向對齊，不雙向同步，不藉此啟動部署。

---

## 待查證｜「頁面控管」Hero 四組文案與單圖（2026-10-26）

> 保留現有七種 Hero 類別（文化/統計/痕跡/搜尋各自 Scope Group/ID 圖文；Admin/Manage/Setting 三個獨立）。只擴充原 `scope_manage`：四個文字框（時間定錨/關鍵詞/空間定錨/進階搜尋）共用原本一張圖。commit `1d7d91f` 已進main，但畫面還沒生效，未驗收。

- [ ] Scope 四個入口切換文案、共用同一圖片路徑。
- [ ] LOC 管理入口（系統管理/人員作品管理/關鍵詞/痕跡圖管理/文章管理）是另一套路由文案，不跟 Admin/Manage Hero 混。
- [ ] 修正 `scope_manage` Hero CSS，MapLibre 初次載入不能撐大版面。
- [ ] 其他獨立故障：ZIP 選取仍顯示舊的 512 MiB 提示；PR #580 仍是 Draft 未合併。

---

## 目前主要目標

LOC 的空間定錨點、痕跡圖、其他系統三條線，各自完成功能並整合，讓文化/統計/搜尋/痕跡四大功能順手可用，即使 ISR 關閉也要正常。完成的標準包含真實資料、持續操作、重讀、效能、權限——不是「有畫面/有函式/CI 綠燈」就算。

ISR 現已開啟，保持現狀不動；先完成工程自測合併 main，再由使用者手動集中部署並做五分鐘實測。

追蹤範圍：本檔未取消的 LOC-TODO/LOC-PLACE/TIME 項目。已結案 01/03/12 不再列；07/15/35、LOC-PLACE-02 已取消；11、LOC-PLACE-05 暫緩。TRACE-01～25 是歷史細項，被 2026-10-27 的最新決定覆蓋。

## 一、工作原則

- 三線可獨立實作/自測，但共同對齊四大功能目標；不是每個小項都要使用者驗收。
- AI 自行負責解法與品質：選合適 skill、自行完成資料串接、權限測試、CI；沒有現成 skill 不是不做的理由，但找 skill 不等於取得安裝授權。
- 使用者在三線整合後的完整使用情境中驗收「使用感覺」，不是每改一個按鈕、每跑一次 CI 就驗收。
- TODO 可由 AI 自行完成、驗證並更新為 `[x]`（註明證據），不用逐項請簽收；`[x]` 代表工程自證，不代表使用者已驗收。體驗有問題再依證據重開。
- 避免靜態敷衍：要檢查「改設定→立即生效→儲存→重讀→切換 Scope/時間/關鍵詞→再用」的完整路徑，載入慢到不順手不算交付。
- 權限與資料保護：Supabase 為權威主庫，公開資料 All Read，寫入另驗權；手機 SQLite 獨立契約；Neon 不逐項同步。不刪資料、不破壞 schema、不擅自部署。依風險決定要不要開隔離分支。

## 二、跨線主目標

- [ ] **TODO1｜我的最愛框架**：手機免費版基本設定、收費版完整自訂，設定要直接影響實際呈現（不是純展示選單）。延伸：框架設定要能改變文化/統計首頁布局；切到本地 SQLite 時框架與痕跡觀看仍正常。依賴：LOC-TODO-08/09/13/20/21/22/25～29。

- [ ] **TODO2｜匯入**：使用者只需提供關鍵 JSON，自動解析、對應、建立關聯，不手動補資料；不憑空補造欄位/地址/時間/錨點。
  - **已進 main（2026-10-26，commit `586bf37`）：** [x] fflate/streamparser 共用 ZIP 解析＋來源辨識；[x] 檔名線索與格式辨識 fallback；[x] Facebook/Threads/ChatGPT 轉 Galaxy 欄位；[x] ZIP 內 JPEG/PNG 唯讀 EXIF GPS/時間解析（不存圖）；[x] 專屬回歸測試已併入 bootstrap。
  - 仍待補：完整 bootstrap/build、真實大量 ZIP 解析、重複匯入/中斷重試、EXIF 對應準確性、不同 Scope 一致性。

## 三、三條工作線

### A｜空間定錨點

目標：地名可搜尋選取，React Select 自動完成，縣市選填不處理樓層，既有資料完整作痕跡圖站點來源。

有效範圍：LOC-TODO-10/13/16、LOC-PLACE-03/04（11/12/15 已結案或暫緩）。

**A 線已完成：**
- [x] 程式整合至 main（PR [#576](https://github.com/EsotericVerse/moon-runes-pwa/pull/576)，commit `9a16b163`）。
- [x] 地址/樓層/UID 基本程式與隔離測試（`test-spatial-anchor-references.mjs`）。
- [x] 跨 Scope 公開位置參考唯讀路徑（585 筆已存錨點可查）。
- [x] Facebook JSON/ZIP 打卡解析（巢狀 place、文字解碼、media/訊息過濾）。
- [x] CI 基準比對（[#40289943249](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40289943249)：bootstrap 175/175、build 257/257）；原 6 項回歸失敗已查因修正（PR [#579](https://github.com/EsotericVerse/moon-runes-pwa/pull/579)，main `57bf4732`，[CI](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40294025869) 263/264）。
- [ ] 尚未閉環：正式 UI 寫入/重讀、地圖站點選取、Queue 互動、冷熱載入效能，還沒部署到公開站點。

- [ ] **LOC-TODO-10｜錨點地名自動完成** [P1]：React Select，縣市非必填不限制搜尋，不做樓層；常用前十名，按＋加入 Queue。
- [ ] **LOC-TODO-11｜Facebook 備份打卡** [暫緩]：地址/樓層辨識暫不做，JSON/ZIP 解析成果保留。
- [x] **LOC-TODO-12｜`source_place` 錯誤映射** [已處理]。
- [ ] **LOC-TODO-13｜地點周邊文章與時間密度連動** [P1]：依已存地點/打卡時間查附近文章，連動 TimeRiver，不從座標推算造訪時間。
- [ ] **LOC-TODO-16｜2001–2013 歷史地點整理** [P2]：去重但保留不同造訪時間，不捏造缺漏日期。

A 線舊版 TRACE-01～14（必填縣市/樓層辨識/3D樓層）已取消為驗收要求，資料保留但不列新 UI 門檻；僅供歷史比對，不再逐條列出。

**A 線分支生命週期（LOC-PLACE-01～06）：**
- 隔離分支 `fix/loc-place-id-layout-20261026`，PR [#580](https://github.com/EsotericVerse/moon-runes-pwa/pull/580)（Draft，未合併）。狀態 `FROZEN / UNVERIFIED`：與正式資料庫尚不相容，CI [#40344096224](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40344096224) failure（移除了 5 項既有回歸測試，被 baseline 門檻攔下）。
- 下一步：merge 最新 main、補回被移除的回歸測試、核對 UID 遷移映射，全部驗證過才合併關閉 #580。

**唯一命名契約（2026-10-27 最新）：** `silver.<scopeid>_trace.id varchar(4)` 是唯一 Trace 主鍵，不留 `uid`/`trace_uid`/`trace_id` 並行欄位；`trace_type='anchor'|'map'` 區分空間定錨點與痕跡圖；`galaxy.place_id varchar(4)` 指向同 Scope 的 anchor `id`；`galaxy.uid`/`source_place` 不變。欄位 `anchor_uids` 已正式更名為 `anchor_list`（遷移 `20261027001000_trace_anchor_list_column.sql`，正式 Supabase 尚未執行 DDL，CI [#40356720053](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40356720053) 仍 failure，門檻同上）。LOC-PLACE-02 舊 UID 遷移已取消；03/04 沿用既有流程＋React Select；05 暫緩；06 只需顯示來源 scopeid。

- [x] **LOC-PLACE-01｜Scope 四碼 Trace/Galaxy ID（DB）**：已結案。
- [ ] **LOC-PLACE-03｜文章打卡整理入口** [P1]：補齊既有「整理定錨點」功能的實際缺漏互動。
- [ ] **LOC-PLACE-04｜React Select 地點候選** [P1]：不選縣市不處理樓層，有歧義才顯示候選。
- [ ] **LOC-PLACE-05｜place_id 關聯回填** [暫緩]：等 Trace ID 整理完再談。

### TIME-ANCHOR-RANGES-20261027｜時間定錨與動態不連續時期（2026-10-27 定案，尚未實作）

核心：先有定錨點才能定時期；時期沒有獨立日期，全部動態從 `time.uid` 對應日期計算；改動定錨點後重算所有引用它的時期。一個時期可以只有一個定錨點，也可以是多個不連續區段（例：`[[A001],[B001,C001],[D001,E001]]`）。使用者可選區段順序，不需要 `display_order`。

- [ ] **TIME-01｜四碼身份命名**：`silver.<scopeid>_time.record_id` 改名遷移為 `uid varchar(4)`；`record_type→type`、`label→title`、`note/style_description→description`；`resource_id` 零損失遷移對照後移除。`_trace` 主鍵另為 `trace.id`，兩表不混。
- [ ] **TIME-02｜移除冗餘欄位**：移除 `display_order`、`date_status`、`year_value`、`visibility`、`created_at`、`updated_at`；風格標籤退場（既存 `style_comment` 要先備份才能刪）。
- [ ] **TIME-03｜多區段時期陣列／動態重算**：`anchor_ids` 為有序錨點/區段集合，只用真實 anchor 的四碼 uid 解析每段起訖；改動錨點日期後全部重算，不用 `display_order` 或 `status='current'`。
- [ ] **TIME-04｜刪改完整性**：被引用錨點失效時，對應連線自然失效，不級聯刪除時期、不沿用舊日期、不靜默重配。備份舊 UUID→新 uid 對照與原陣列順序。
- [ ] **TIME-05｜全程式與 SQLite 對齊**：同步 `CultureTimelineEditor`/`culture-query`/`Culture`/`Statistics`/`Search`/Galaxy 時間查詢/SQLite/RPC/RLS/CI，全部測過才合併 main。

**實作隔離：** 分支 `fix/time-dynamic-periods-20261027`，基準 main `bc1672f0`，狀態 `IMPLEMENTING / NOT FOR MERGE`。安全界線：對正式資料的不可逆欄位刪除要先完整備份；舊時期不能遺失。驗證完整套實作與回歸後才合併最新 main。

### B｜痕跡圖

目標：用空間錨點建立/管理/觀看具名痕跡圖 Frame；選 Current、入列、改序、刪除、重讀都正常；地圖/文章/時間/風格聯動。分類骨架重用既有關鍵詞的分層模型，不另造平行體系。

**分類模型（2026-10-26 已確認）：** 四層「大分類 → Class → Group → Item（具名痕跡圖 Frame）」，例：旅遊（大分類）→ 夜市（Class）→ 北部（Group）→ 某張痕跡圖（Item）。痕跡圖本身是 Item，不是 Queue 裡的單一站點；Item 內部另有依順序排列的空間錨點 UID Queue。沿用 `app/loc/model/class-group-items.mjs` 與關鍵詞既有分類能力；現有 `trace-route-classes.mjs` 只承載部分層級，需整合為共用骨架。現狀：需求已確認，實作尚未完整驗收（現有畫面仍是三層）。

額外目標：痕跡圖能引用既有關鍵詞組做風格呈現，需要先核實資料模型，避免把痕跡圖 Item、作品 Class、關鍵詞群組混成同一物件。

- [ ] **LOC-TODO-08｜具名痕跡圖 Frame 與四層分類** [P1]：沿用關鍵詞分層骨架；Frame 只引用該 Scope 自己的空間錨點，`anchor_list` 可編排；站點按順序直連，不要求道路通達。
- [ ] **LOC-TODO-09｜Current Frame／預設切換** [P1]：單一選取，起始只取輕量索引；空 Scope 正常顯示不當成錯誤。
- [ ] **LOC-TODO-14｜雙空間×雙時間四錨交叉分析** [P2]：空間範圍×時間範圍×關鍵詞密度交叉查詢，連動 TimeRiver/統計。

B 線舊版 TRACE-15～23（四層分類、Queue、Current、每站時間、3D 呈現、文章同頁列表、PELT 建議錨點）大部分仍是「部分已有、尚未整體完成」狀態，併入上面三項追蹤，不再逐條重複列。

### C｜其他系統

目標：讓文化/統計/搜尋/設定/匯入/手機 SQLite/權限/快取可用、順手、不拖垮整站；負責 TODO1/TODO2 的設定與匯入入口。

共同驗收：ISR 關閉時四大功能正常；文化第二河道不卡；統計動態正確；搜尋連續操作可用；手機框架與本地 SQLite 能用。Cloudflare 成本清理是既有工作，不等於要重新部署/開 ISR 才算完成。

**C1｜系統成本、快取與搜尋：**
- [x] **LOC-TODO-01｜Cloudflare 歷史部署清理**：已結案。
- [ ] **LOC-TODO-02｜移除 ISR 強制依賴** [P0]：PR #569 已合併main（`7038d42`），移除 R2/DO ISR 綁定，獨立回歸 24/24 通過。未執行：完整 build/正式網站/iOS 實機讀取、重開站後 R2 零寫入驗收。**2026-10-26 故障後已修復並重新部署**（GitHub Pages run [40284884702](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40284884702)，commit `d0577149`：Bootstrap 135/135、build 256/256 成功）；後續 headless Chrome 實測四頁無資料庫連結失敗（[run 40285855308](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40285855308)）。剩餘：長時間連續使用、登入/Admin、舊分頁 SW 更新待驗收。
- [x] **LOC-TODO-03｜Cloudflare 成本根因**：已結案。
- [ ] **LOC-TODO-04｜文化第二河道首次載入卡頓** [P1]：PR [#575](https://github.com/EsotericVerse/moon-runes-pwa/pull/575)，main `9cbd0404` 已解除 ISR 綁定，展開不額外查 SQL（[CI](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40287876436)：bootstrap 138/138、682ms、0 新增 RPC）。剩餘：五分鐘持續操作、10/100人併發、正式部署後驗證。
- [ ] **LOC-TODO-05｜Service Worker 與公開 Blocks 快取** [P1]：核實 Cache First 行為、冷熱讀取、過期失效。
- [ ] **LOC-TODO-06｜全域搜尋與自動完成** [P1]：不要求選 scopeid、不曝光全 Scope 清單。

**C2｜文化、統計、分類與管理：**
- [ ] **LOC-TODO-17｜`silver.manage`/`silver.loc` 職責** [P1]：依現行 schema 核對唯一 Registry；`silver.loc_config`/`scope_registry` 已退休。
- [ ] **LOC-TODO-18｜`txt_class` 取代 `sources`/`statistics_*`** [P1]：維持單層字串陣列，不新增階層目錄。
- [ ] **LOC-TODO-19｜作品分類/個人分類選單命名** [P1]：Admin「作品分類」、Scope「個人分類」。
- [ ] **LOC-TODO-20｜文化來源×Class/Group 河道顯示** [P1]：原地展開不跳頁。
- [ ] **LOC-TODO-21｜統計圖表分頁** [P1]：原有分頁邏輯已驗證（`StatisticsMultiChart.jsx`：單獨項目 8/頁、混合 10/頁，PR #577 已併入 bootstrap 175/175）；剩餘：多頁真實資料環境下的連續切頁、各類圖表、零資料驗證。
- [ ] **LOC-TODO-22｜深度進階統計兩層選擇器** [P1]：PR [#577](https://github.com/EsotericVerse/moon-runes-pwa/pull/577)，main `5746bcde` 已做「全部/作品來源/多媒體/關鍵詞」頁簽＋兩層選單（[CI](https://github.com/EsotericVerse/moon-runes-pwa/actions/runs/40292920980) 通過，86ms）。剩餘：真實空關鍵詞 Scope、手機實機、五分鐘持續切換。
- [ ] **LOC-TODO-23｜時間編輯內嵌表單** [P2]：河道在上、輸入框在下，不跳浮動視窗。
- [ ] **LOC-TODO-24｜繁中/簡中/英文/日文語系** [P1]：涵蓋編輯模式/文化/統計/搜尋/痕跡/設定。

**C3｜手機 APP、SQLite 與匯入：**
- [ ] **LOC-TODO-25｜雲端/本地來源切換** [P1]：可勾選的本地 SQLite 開關，切回雲端保留原檔。
- [ ] **LOC-TODO-26｜SQLite 下四大功能可用** [P1]：本地與遠端同一功能契約但不混成同一資料表。
- [ ] **LOC-TODO-27｜SQLite 本地匯入/匯出** [P1]：只在手機端顯示，匯出只輸出本地檔案。
- [ ] **LOC-TODO-28｜Markdown 匯入與繁簡編碼** [P1]：兼容 UTF-8/Big5，不強迫使用者判斷編碼。
- [ ] **LOC-TODO-29｜手機設定頁響應式** [P1]：修正左右欄擠壓、管理選單手機分頁。

**C4｜符文、每日記錄與遊戲：**
- **LOC-TODO-30｜66 枚符文特效一致性** [有空再想/可不做]：抽取對象 1–66，不可 9 個共用粗糙特效代替。
- **LOC-TODO-31｜3D 桌遊發牌/卡背** [有空再想/可不做]：卡背用符文專屬視覺，不用單一「月」字代替。
- [ ] **LOC-TODO-32｜每日符文紀錄不能新增** [P1]：唯讀查證顯示表單/後端/RLS 都存在且正常，近 24 小時 API 日誌未見新增請求，**故障未重現**。下一步：授權測試 session 重現完整表單→INSERT→讀回。
- **LOC-TODO-33｜3D 多人連線桌遊** [有空再想/可不做]。

**C5｜發行與品質：**
- [ ] **LOC-TODO-34｜LOC 1.1 RC 全站驗收** [P1]：Guest/Admin 首頁/文化/統計/搜尋/痕跡/設定/管理讀寫、RLS、回歸、瀏覽器與 iOS 實機；合法空 Scope 不能 400/500。條件不足就維持 RC，不發 1.1。

**C 線跨線項：**
- **TRACE-24｜Facebook 備份文字打卡匯入**：JSON/ZIP 解析已通過隔離測試；地址/樓層延伸暫緩（歸 LOC-TODO-11）。
- **TRACE-25｜AGENTS/Markdown/Galaxy 一致性**：Markdown 統整中，Galaxy 本次未授權修改（歸 LOC-TODO-34）。

## 四、整體驗收（七項同一個目標，不是七次零碎驗收）

ISR 五分鐘實測仍是 1.2 Release 門檻，但 ISR 已開啟不需再開一次；功能穩定後使用者自行集中手動部署，一人操作五分鐘。

- [ ] 1. 空間定錨點易觀看、易用於排痕跡圖。
- [ ] 2. 痕跡圖基本管理順利（大分類→Class→Group→Item），Frame 與站點 Queue 分離。
- [ ] 3. 痕跡圖可加入關鍵詞組作風格呈現，不混淆資料身份。
- [ ] 4. 觀察 Supabase logs 查詢數，辨別重複查詢/空轉/過量下載。
- [ ] 5. 觀察 Cloudflare 流量，不因檢視就重啟服務。
- [ ] 6. LOC 1.2 ISR 五分鐘實測：功能穩定後使用者手動部署，一人連續操作五分鐘核對功能與成本。
- [ ] 7. 文化/統計/搜尋/痕跡四大功能正常使用，依下表分級驗證。

### 40/60/100 分動態驗收水準

先在 ISR 關閉狀態驗證。

| 分數 | 標準 |
|---|---|
| 40（最低及格） | 單人五分鐘內連續切換四大功能，一般操作 5 秒內回應（大量匯入除外）。 |
| 60（多人及格） | 10 人同時使用維持相同標準，不因多人造成失敗或異常資源消耗。 |
| 100（最高） | 100 人同時使用仍維持正常回應。 |

大量匯入單獨驗證（不受 5 秒限制，但要有進度提示和正確筆數）。使用者可單人完成基本驗收，不要求召集 10/100 位真人；工程端可做受控併發模擬，但要跟真實多人實測分開標示。

## 五、其他設計界線

- 符文佔領地圖、3D 時空雷達：創意構想，非已交辦功能。
- 路線只表示錨點行經順序，不要求道路連通。
- 相同地點可在不同旅程重複引用；時間定錨與空間定錨是不同物件。
- 公開內容 All Read，寫入需 RLS 授權。

## 六、維護與工程交付原則

1. 先對照目標與現有條件，優先解決安全/資料完整/操作順暢/成本的真問題，不機械逐張開分支。
2. 完成一項要有真實操作/動態資料/失敗空結果/回歸證據，CI 綠燈不是唯一標準。
3. 高風險/跨檔功能用同一 task branch 做完整交付，驗證完就合併並清理分支；未完成的標 `FROZEN/UNVERIFIED/NOT FOR MERGE`，低風險文件改動可直接進乾淨 main。
4. 保護原始資料：不無授權清資料、不跨 Scope 合併 UID、不啟動 Cloudflare/Vercel ISR。
5. ID 不回收；已取消/已結案的項目不重新列入。

## 最後的可選作業：Neon 單次整批對齊（非必要）

只在 Supabase 全部完成且使用者明確授權時，做一次單向對齊（schema/RLS/函式/逐列核對），不雙向同步，不因此啟動部署。

---

## UI／Hero 修正與後續驗證（2026-10-26）

- [ ] 管理模式 Hero 單圖與獨立文字：以「待查證」節最新規格為準，已提交程式不等於畫面通過驗證。
- [ ] 實際視覺回歸：正式站逐一打開 Scope 四種、LOC 五種入口，確認 Hero 圖 cover 填滿、地圖不撐版，涵蓋桌機/手機/權限/重新載入。
- [ ] 資料發布一致性：Admin 儲存後核對 Supabase 與已發布的 `group_manage.js` 快照一致。

---

## 2026-10-27｜空間點線面／3D 文字密度／《語文爭霸》（使用者交辦，追蹤中）

設計紀錄：[`md/2026-10-27-loc-spatial-anchors-3d-language-conquest.md`](./md/2026-10-27-loc-spatial-anchors-3d-language-conquest.md)；Galaxy `uid=E5C74D0E`（個人開發文件，不公開不列統計）。

- [ ] **空間優先** [P0]：`space_anchor`（點）/`space_period`（有序路線/線）/`space_trace`（多路線組合/面）接通 Supabase/MapLibre/CRUD；現有 `anchor/map` 與 `anchor_list` 欄位仍不一致，`NOT FOR MERGE`。
- [ ] **文章對應** [P0，隨空間]：Galaxy `place_id`/`group_lists`/`createtime` 串回地點/路線/痕跡的文章列表；同日多地點分清已確認與推定關聯。
- [ ] **立體文字密度**：「我的最愛」時間/地點/關鍵詞群組作 X/Y/Z 可變 3D 軸，按密度單元點開對應文章列表。
- **《語文爭霸》**（有空再想/可不做）：自己的 Galaxy 文章作據點，66 符文與同盟為勢力，時間地點選戰場，關鍵詞密度決定版圖。
- 限制：不改動原始打卡/文章；空間時間兩線平行；不自動啟用 Cloudflare/ISR，未完成不送 main。
