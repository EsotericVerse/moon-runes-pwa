# LOC Current TODO

**Current version:** 0.9.1-rc.1

## 0.9.1 RC acceptance（承接 0.9.0 RC1 尚未完成人工驗收的項目）

### Public basic functions

- [ ] LOC 首頁與共用 Navigation 人工 smoke test。
- [ ] Search：一般查詢、media mode、空結果與錯誤狀態人工確認。
- [ ] Statistics：LOC 跨 Scope 合併總數、Scope 占比與一年／一月／一週趨勢，以及單 Scope 各種圖表的人工確認；一般新建 Scope Group 才驗收 Overview／導引。
- [ ] Culture：LOC 跨 Scope 時期交會、交會時間長河、各 Scope 作品／媒體數量及綜合來源時間長河，以及單 Scope 分類、作品列表、Anchor 建議人工確認；一般新建 Scope Group 只測導引。
- [ ] Governance：LOC／LunaRunes／個人 Scope 公開內容人工確認。
- [ ] LunaRunes 首頁與 Hero／次要入口人工確認。
- [ ] LunaRunes 單卡／每日／雙卡／三卡／五卡／指定張數／OW3gs 人工 smoke test。
- [ ] 每日符文紀錄：Calendar、主抽／補抽、前次同符文比較人工確認。
- [ ] 符文圖鑑：總覽、九組、單符與長文字閱讀人工確認。
- [ ] LunaRunes Game：首頁、遊戲文件、開始新遊戲與基本回合流程人工確認。
- [ ] Author 公開頁與主要 desktop／mobile responsive 人工確認。

### Management / Admin

- [ ] **0.9 主要交付：** 完成 Scope 管理選單的既有模組整合與操作體驗；Admin 負責 Registry／Group／Mapping，各 Scope Manage 負責自身設定、資料、時期／文化、關鍵詞／統計、發表與 Import，避免平行編輯器或 Scope 特例。
- [x] Keyword Attr 批次寫回與進度百分比修正已合併至 0.9 RC 之後的 Current main（含 SQL chunk WHERE 修正）；不等於所有真實 corpus 壓力測試已簽核。
- [ ] 在公開基本功能確認後，再開始 Governance／Admin／Scope Manage 的實際操作驗收。
- [ ] 驗證 CRUD、0-row 例外處理、searchable=false canonical visibility、Theme、Scope config 與權限行為。
- [ ] Import：使用真實來源檔測試自訂 JSON 欄位格式、巢狀資料路徑、多檔逐檔預覽、25–200 筆有界分批寫入、進度、重複 UID／原生 ID 與中斷後重新比對；程式實作不等於資料庫端實測已通過。
- [ ] 驗證管理預覽、Import、Data、Period、Keyword 等工作區的實際使用流程。
- [ ] 文化：時期設定與時間河道，實際驗證切換時期、錨點、河道範圍與儲存結果。
- [ ] 統計：關鍵詞設定，實際驗證 Class／Group／Item 編輯、重新分析與分頁後 Group 排行。
- [ ] LOC 首頁 Hero：16:9 版面下檢查既有資料庫文字的換行、字級與可讀性；文案如要更改，等待作者指定新文字後再編輯，切勿以舊 JSX 種子覆蓋。

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
- [ ] Scope 管理工作台與 Import 真實驗收後，核對 Feature Deep Dive 與正式 UI／資料流程一致性。
- [ ] 整合既有來源中的 image multimedia。
- [ ] 保持 image/media 為 first-class media data，不製造空白 Galaxy text。
- [ ] 完成 governed import workflow 與來源 provenance。
- [x] 普通 Scope extension 使用固定 DB 五件套＋通用 static shell，不需要新增 bespoke core architecture。
- [ ] 完成 responsive、loading、failure-state 與 deployment regression。
- [ ] 讓 Current Canon、README 與 runtime verifier 保持一致。

## Near-term — Managed Auth / Clerk（規劃中；不列入 0.9.1 RC 驗收門檻）

**目的：** Scope Group／Scope Node 延伸為家庭、小型組織時，認證、邀請、成員管理委託成熟模組（優先評估 Clerk Auth + Organizations），減少每新增一個 Scope／Group 就要反覆處理 OAuth 與 Google Cloud 設定的維護負擔。**優先級提高為近期可獨立實施的認證整合任務，可先於私人 App／Import 驗收進行；必須獨立開發、回歸驗證，不變動 0.9.1 RC 既有驗收結論。此項尚未實作。**

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
