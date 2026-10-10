# LOC Current TODO

**Current version:** 0.9.2-rc.2

**Release policy:** 0.9.2 RC 先定版，後續以修 bug／回歸驗證為主；Import 的真實來源測試由使用者暫緩，**Pending / 尚未驗收**。本表的 `[x]` 表示對應程式交付或已取得明確驗證證據，不能推論其他人工檢查也完成。

## 0.9.2 RC — 已進入程式基線／自動化回歸

- [x] LOC／作者／符韻首頁 Hero 的字級統一與各自固定身分識別（X／光之定錨點／黃色圓點）；不依賴 Scope Group。
- [x] 四大功能 Hero 依 Scope 載入八張 JPG：LOC 專用四張；作者與符韻共用四張。
- [x] LOC／作者的功能 Hero 文字移至圖片垂直中段；符韻沿用原有布局；已加入 desktop／mobile Playwright 回歸。
- [x] 0.9.1 CSS／DIV 收斂、既有語意與共用排版契約繼續保留。
- [ ] **0.9.2-rc.2 本身**的 `verify`／public DB／build／desktop-mobile CI：在對應 commit 執行完成後才登記結果，不以先前 PR 的 CI 代替。

## RC2 驗收紀錄與剩餘待辦

- [x] Scope 新增與初始化核心流程：使用者已在正式站確認正常；六張 Scope 表、Registry、Manage、Rune66 初始化及 PostgREST schema cache 相容性修正已納入 RC2 基線。
- [x] Scope 刪除／節點管理核心流程：使用者在 RC2 升版前已確認正常；vis-network／Attr 入口、ID 確認、RPC 及 Registry 驗證流程均已納入 RC2 基線。
- [ ] 其他細部／跨裝置邊界回歸：Scope 視覺階層、Domain／Directory、NAV／頁面文案及語系摘要在更多裝置／異常資料情境下的一致性。此項不是 Scope 核心新增／刪除尚未驗收。
- [x] iOS Capacitor 靜態封裝與 unsigned IPA 建置管線已完成，PR #479 已合併 main；已完成的 CI 編譯**不等同**使用者實機完成 App Local File 驗收。
- [ ] iPhone 安裝／更新版 IPA 的實機回歸與私密資料 Local File 驗收：等網站 NAV／功能選單確認後進行，不因 main 更新就反覆重新安裝。

## LOC App — 2026-10-10 獨立工作線

**現行決策：** 網站是 NAV／功能選單的第一驗收環境；App 與網站共用同一套 React UI。網站確認前**暫不產生／要求重新安裝新版 IPA**。App 私密檔案另以原生環境能力隔離；Supabase 為公開／授權 Scope 資料主庫，不是私人 Local File 儲存位置，Neon 也不參與本機檔案儲存。

### 已完成的程式基線

- [x] PR #479 合併 main：Capacitor iOS wrapper、實機 unsigned IPA 建置流程與 iOS-only 符文卡牌 ASCII 靜態資源；已能在 iPhone 安裝使用此前基線。
- [x] PR #502 合併 main：上方 NAV「我的最愛」（初始月之符文／作者首頁／月典首頁）與下方固定六鍵「首頁／文化（時間漏斗）／統計／搜尋／治理／設定」；前五鍵依 Scope／Theme 切換，第六鍵為全域設定；六鍵各有獨立圓角背景與陰影、安全區間距。
- [x] 設定頁程式四項：設定首頁（預設 LOC）、我的最愛、登入（OAuth 統一入口）、每日符文（保留原符韻頁面）；目前已通過網站 build、UI/a11y 與 iOS CI，**尚不等同網站人工驗收**。
- [x] App 與網站的 Native/Web 環境判斷已透過 Capacitor 接入既有 NAV；登入狀態與裝置執行環境是兩個不同判斷，不把 OAuth 登入等同原生 App 權限。

### 可先在分支繼續開發（不需重裝 IPA）

- [ ] **Native Local File 核心：** 只在 Capacitor iOS 原生環境啟用本機檔案選取／匯入／保存／清單／讀取／刪除；未登入也可用；一般網站登入後仍不能啟用此原生檔案功能。
- [ ] 使用 iOS App Sandbox 中真正的檔案路徑保存原始私密檔案及必要的本機清單索引；**不用** Supabase、Neon、`api.user_records`、SQLite／IndexedDB 作為 Local File 的替身；不把整份檔案傳給 API、AI、分析服務或網站雲端同步。
- [ ] 本機匯入第一個驗證案例採 MSN 對話紀錄等個人檔案：優先保留原檔位元組、檔名、大小、時間與格式，避免錯誤轉碼與覆蓋；檔案格式解析、離線搜尋／分類／統計採後續分段驗收，不先假設所有來源格式完全一致。
- [ ] 原生 Filesystem／Document Picker 能力需評估可維護且與 Capacitor 8 相容的正式套件及 iOS 隱私／檔案保護策略；先補建置相容性與環境門檻測試，不在網站端偽裝成已支援 Local File。
- [ ] 確認 App 資料備份／回復政策、卸載時私密本機檔案可能消失的提示，避免把測試檔案誤認為永久備份；任何雲端備份／分享必須獨立明確決策。

### 網站通過後才進入 iPhone 驗收

- [ ] 人工確認上方「我的最愛」與三個既有 Scope 入口、下方六個浮動獨立方塊、Theme 切換（含作者淡紫）、文化時間漏斗、Scope／Scope Group 內容指向，以及全域設定不跟著 Scope 改變。
- [ ] 人工確認「設定首頁」預設 LOC、OAuth 登入／登出、使用者收藏與首頁偏好、跨 Scope RLS／權限邊界。不能以 PR 綠燈取代正式登入狀態測試。
- [ ] 完成 App Local File 第一版後，**再**由新版 IPA 實機驗證：離線可匯入／讀取／列出／刪除、重新開啟仍保留、不同來源檔案可辨識、網頁無法打開本機功能、網路請求不含私密檔案內容。
- [ ] 首次完整 App 驗收後再評估 OTA Web 資源更新。OTA 不能取代 iOS 原生外掛變更時的 IPA 更新，也不能取代 AltStore Classic 的定期簽章刷新；私密 Local File 必須在更新失敗時仍受保護。

### App 圖示與範圍邊界

- [ ] LOC／符韻瀏覽器 favicon 已獨立提出 PR #500，尚未合併；與 iOS App launcher icon 分開處理。作者使用既有「作者的話」原圖，不採 AI 繪製的黑曜石獸替代。
- [ ] 未來 Scope Group（例如「XX 的家」）可成為自選首頁／我的最愛的空間；群組文件與個人本機檔案的存取邊界不可混用。Group 自有文件／統計／搜尋屬另外的資料功能工作線，不夾入本階段 App Local File 測試。
- [ ] 每日符文原頁保留，Daily 專用資料表多人共用（非一人一表）；`silver.lo3rwang_daily` 與 `silver.lrunes_daily` 的 Table／VIEW 方案須獨立驗證後才動 Supabase，不塞進 `api.user_records`，也不與 App Local File 混在一個 PR。
  
## 0.9.2 RC — 待確認／Bug-fix backlog（沿用先前未完成人工驗收）

### Public basic functions

- [ ] LOC 首頁與共用 Navigation 人工 smoke test。
- [ ] Search：一般查詢、media mode、空結果與錯誤狀態人工確認。
- [ ] Statistics：LOC 跨 Scope 合併總數、Scope 占比與一年／一月／一週趨勢，以及單 Scope 各種圖表的人工確認；一般新建 Scope Group 才驗收 Overview／導引。
- [ ] Culture：LOC 跨 Scope 時期交會、交會時間長河、各 Scope 作品／媒體數量及綜合來源時間長河，以及單 Scope 分類、作品列表、Anchor 建議人工確認；一般新建 Scope Group 只測導引。
- [x] **LOC Culture｜正式項目交會（程式已實作；待人工驗收）：** 在 LOC → 文化可切換「時期交會／項目交會」。項目交會由使用者自由指定兩條 Scope＋來源河道，預設僅作示範但不寫死比較對象；支援不同人的 Facebook／Threads 等文字來源、Galaxy Media 指定媒體類型及符韻專屬每日符文。原時期交會、作品列表及 LOC 首頁不動。刪除 PR #505 固定「每日符文 × 個人作品」功能及其模組，不留隱藏的平行實作。
- [ ] **LOC Culture｜正式項目交會人工驗收：** 驗證兩條不同 Scope 不同來源（例：lo3rwang Facebook／另一人 Threads）的同軸對比、各自每日計數與相對密度、0 筆日、三個日曆月上限、20 天分頁、可讀取權限、資料不足及 bounded query；無法取得的 Scope 由 DB RLS 決定讀取範圍，不能用跨 Scope 權限繞過限制。完成人工實測前不宣稱 UI 驗收完成。
- [ ] Governance：LOC／LunaRunes／個人 Scope 公開內容人工確認。
- [ ] LunaRunes 首頁與 Hero／次要入口人工確認。
- [ ] LunaRunes 單卡／每日／雙卡／三卡／五卡／指定張數／OW3gs 人工 smoke test。
- [ ] 每日符文紀錄：Calendar、主抽／補抽、前次同符文比較人工確認。
- [ ] 符文圖鑑：總覽、九組、單符與長文字閱讀人工確認。
- [ ] LunaRunes Game：首頁、遊戲文件、開始新遊戲與基本回合流程人工確認。
- [ ] Author 公開頁與主要 desktop／mobile responsive 人工確認。

### Management / Admin

- [ ] **其他管理工作區與例外情境驗收：** Scope 核心新增／刪除已由使用者驗收；Admin Registry 的進階 Group／Mapping 與各 Scope 的 Settings、Data、Period／Culture、Keyword／Statistics、Publish、Import 等入口仍視實際測試逐項核對，不建立平行編輯器或 Scope 特例。
- [x] Keyword Attr 批次寫回與進度百分比修正已合併至 0.9 RC 之後的 Current main（含 SQL chunk WHERE 修正）；不等於所有真實 corpus 壓力測試已簽核。
- [ ] Scope 核心管理已完成操作驗收；Governance／其他 Admin／Scope Manage 子功能的尚未覆蓋情境繼續核對。
- [ ] 其他 CRUD 與異常邊界：0-row 例外、searchable=false canonical visibility、Theme、Scope config 與權限行為（不含已驗收的 Scope 核心新增／刪除）。
- [ ] **Import — PENDING（使用者尚未安排人工測試）：** 真實來源檔、自訂 JSON 欄位格式、巢狀資料路徑、多檔逐檔預覽、25–200 筆有界分批寫入、進度、重複 UID／原生 ID 與中斷後重新比對，均待實際執行；程式入口與自動化測試不等於資料庫端 round-trip 已驗收。
- [ ] 驗證管理預覽、Import、Data、Period、Keyword 等工作區的實際使用流程。
- [ ] 文化：時期設定與時間河道，實際驗證切換時期、錨點、河道範圍與儲存結果。
- [ ] 統計：關鍵詞設定，實際驗證 Class／Group／Item 編輯、重新分析與分頁後 Group 排行。
- [ ] LOC 首頁 Hero：使用者已確認目前文字大小與整體呈現；仍須於不同螢幕寬度實機檢查 16:9、換行與對比。現有資料庫文案維持不變，不以 JSX 種子覆蓋。

### Performance / data scale

- [ ] 以大型 corpus 進行 Search／Culture／Statistics stress test；維持精準 query + bounded pagination。
- [ ] 實際確認 Culture／Search incremental loading 與 Statistics 查詢速度、loading、empty、failure state。
- [x] Source Refresh core：以 `source_name + source_native_id` 做 bounded delta preview／新增／更新；OAuth 只作來源 adapter，不改 Refresh contract。

## 0.9 Scope Group（已進入 RC 程式基線，人工驗收仍依上述清單）

- [x] Scope Group 成員以 `scope_registry.parent_scope_id` 為 authority；不新增第二套 table resolver。
- [x] 一般新建 Scope Group 的 Search／Statistics／Culture 採 Registry Overview＋導引；LOC (`loc`) 特別保留跨 Scope Culture 時期交會、綜合來源與 Statistics 數量／比例／趨勢。Group Search 不跨 Scope 全文搜尋；各 Scope 的 canonical corpus、精準查詢與分頁契約維持獨立。
- [x] Audit／Runtime 對新增 Scope 使用通用 `/scope/.../?scope=<id>` resolver contract，不新增具名 Scope route/table 清單。
- [x] Scope 建立流程採先複製再獨立編輯；Rune66 預設 Class 以新 UUID／66 筆獨立複製，不回寫來源 Scope。
- [x] Scope Registry／Group hierarchy／固定 canonical 更新已收斂到網站 Admin／Manage；AI 不作為必要 write path。

## 1.0

- [x] 深度功能介紹取代新手操作教學作為 1.0 的主要文件定位；維持獨立 Feature Deep Dive，不重複 Canon authority。
- [ ] Import 與其他剩餘管理工作區驗收後，核對 Feature Deep Dive 與正式 UI／資料流程一致性。
- [ ] 整合既有來源中的 image multimedia。
- [ ] 保持 image/media 為 first-class media data，不製造空白 Galaxy text。
- [ ] 完成 governed import workflow 與來源 provenance。
- [x] 普通 Scope extension 使用固定 DB 五件套＋通用 static shell，不需要新增 bespoke core architecture。
- [ ] 完成 responsive、loading、failure-state 與 deployment regression。
- [ ] 讓 Current Canon、README 與 runtime verifier 保持一致。

## Near-term — Managed Auth / Clerk（規劃中；不列入 0.9.1 RC 驗收門檻）

**目的：** Scope Group／Scope Node 延伸為家庭、小型組織時，認證、邀請、成員管理委託成熟模組（優先評估 Clerk Auth + Organizations），減少每新增一個 Scope／Group 就要反覆處理 OAuth 與 Google Cloud 設定的維護負擔。**優先級提高為近期可獨立實施的認證整合任務，可先於私人 App／Import 驗收進行；必須獨立開發、回歸驗證，不變動 0.9.1 RC 既有驗收結論。此項尚未實作。**

- [ ] 核對前次已啟用的 Next.js Server／Render 執行環境及正式域名部署：目前 `main` 的 `next.config.mjs` 仍為 `output: 'export'`、GitHub Pages 靜態輸出；釐清正式動態 Server Runtime 是否另行部署、由哪個服務承載，以及切換／回退方式，再決定使用 `@clerk/nextjs` 或 `@clerk/react`。未完成部署確認前，不啟用 Clerk 登入接管。
- [ ] 評估 Clerk Auth／Organizations 的 Next.js、iOS SDK、價格與 Supabase/Neon 整合；優先使用現成登入、Session、邀請、成員與撤銷 UI，避免自製 Auth 與第二套組織管理。
- [ ] 保留 LOC 的 `scope_registry`、Scope Group／Node、Scope 建立／更新、資料表與 canonical 設定；Clerk 僅負責身分與組織成員資格，透過穩定身分／組織 ID 映射到既有 Scope，不能取代 Scope CRUD／資料權威。
- [ ] 設計現行 Supabase Auth／`silver.manage` 的遷移與回退：Supabase 第三方 JWT／RLS 相容性、`silver.can_manage_scope`／`silver.can_manage_global`、舊帳號綁定、權限撤銷；不得只靠前端控制或 email 字串認證。
- [ ] 新增 Scope／Group 不應要求另外建立 Google OAuth Client ID；選擇 Google 登入時仍須遵守正式環境提供者憑證規定，若目標為零 Google Cloud 設定可評估 Email OTP／Passkey。
- [ ] 個人本機 App 保持可不登入、私密資料不自動上雲；只有 Workgroup／共享才要求認證。確認新私密 Scope **不沿用**既有部分公開 Scope 的 anonymous `SELECT USING (true)` 政策。
- [ ] Workgroup 驗收：組織建立／邀請／加入／移除／撤銷、跨 Scope 權限隔離、裝置遺失／Session 失效、舊登入轉換與回退；新增 Scope 後認證流程無需重複人工配置，且不得破壞原有已驗收功能。

## Guardrails

- 不自行新增 table、cache、projection、RLS 或 grant。
- 不建立 JSON／JS 第二份 corpus authority。
- 不 select all 後在 JS slice。
- 不為一般 Scope 發明特殊定義。
- Rune special semantics 只留在 LunaRunes。
- 新工作以最新 main 為起點；完成 branch merge 後 freeze。
