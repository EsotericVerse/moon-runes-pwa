# LOC Release Roadmap

## Current — 0.9.2-rc.1 (2026-10-09)

0.9.2 RC 是以已合併的四功能 Hero 圖片與文字定位、首頁字級、固定 Scope 標誌，以及 0.9.1 CSS 減法為基線的**穩定／修 bug 候選版**，不宣稱所有人工驗收已完成。

- LOC 四功能 Hero 使用 `pics/LOC-*.jpg`；作者與符韻四功能 Hero 共用 `pics/scope-*.jpg`，保留現有文案、編輯入口與字型規則。
- LOC／作者四功能 Hero 文字垂直置中；符韻保留既有排版。三站首頁的 X／光之定錨點／黃色小圓為固定 Scope 身分識別，不受 Scope Group 變動影響。
- 既有 Scope／Group、搜尋、文化、統計、治理及管理模組不因升版另造平行結構。**後續工作以修 bug、相容性和既有功能回歸為主，不擴張新的功能範圍。**
- **Import：Pending（未人工實測）**。本版不將自訂 JSON／巢狀欄位、多檔預覽、有界分批寫入與中斷重跑標記為驗收通過；待使用者安排真實來源檔測試。
- 桌面／手機自動化、公開 DB probe、建置由對應版本 commit 的 CI 確認；未執行的實機人工 smoke、CRUD／Auth 權限及大型資料壓力測試保留於 `docs/TODO.md`。

## Previous — 0.9.1-rc.1 (2026-10-09)

0.9.1-rc.1 是在已完成 0.9.0 RC1 後、以 Current `main` 為底的 **CSS 減法與版面穩定性候選版**；沿用原有資料權威、Scope／Theme／Hero 架構，不增加平行 DOM、主題系統或新功能。

### 本次相對於 0.9.0 RC1 的調整

- LOC／作者首頁共用 Block Renderer 保留；清除已退役的作者 Hero DOM 路徑與僅服務於舊頁面的樣式。
- 整理 `home-content.css`、`responsive.css`、`uiux.css`、`features.css` 中可證實未使用的歷史覆寫；不改變主題色彩和符文遊戲樣式。
- 保留 DB-backed 的 43 個底層 Theme Token 與當前管理合約；改變底層 Token 或將八個語意控制項落地，**不是本次 CSS 減法的交付項目**。
- 加入 CSS／DOM 收斂的回歸 contract，維持既有 Next Build、public DB、Playwright 桌面／手機驗證門檻。
- 原 0.9 RC1 後的 Keyword Attr 分批寫回與 SQL 修正由 Current 承接，不回填舊版 tag 或歷史紀錄。

### 驗證與未完成責任

版本必須以對應 commit 的 CI 成功為自動化依據；目前仍有人工 smoke、匯入 round-trip、管理權限與大型 corpus 性能等項目，詳見 `docs/TODO.md`。0.9.1 RC 不是 1.0 完成宣告。

## Previous — 0.9.0-rc.1 (2026-10-08)

0.9.0-rc.1 以 2026-10-08 的 Current `main`（發版工作起點 `64ccad0b2bd4376fae1b41c882c7b55ca16433ad`）為程式基線，正式將已在主線實作的 Scope／Scope Group 能力納入 Release Candidate。本次定錨只變更版本、文件與候選版發布流程；不引入新的產品功能、CSS 特例、資料庫結構或 Canon 規則。

### 已納入程式基線

- LOC／月典與 LunaRunes／月之符文的獨立治理；共用 Statistics／Culture／Search／Governance 與各自的專屬頁面。
- `silver.scope_registry.parent_scope_id` 是 Group 成員關係 authority；一般 DB 新建 Scope Group 以 Registry Overview 與導引為主，**LOC (`loc`) 特別保留跨 Scope Culture 交會時間長河與綜合來源、Statistics 合併數量／比例／趨勢**。各 Scope 仍以 PostgreSQL 精準 query 與有界結果負責自身 corpus；LOC 沒有另存混合 corpus。
- 既有具名路由與固定 `/scope/.../?scope=<id>` 通用 static shell；Scope Registry 負責動態解析，一般 Scope 不增加 bespoke filesystem routes。
- 新 Scope 的 Config／Galaxy／Galaxy Media／Time／Keywords 五件套，以及以獨立 UUID copy-on-create 的 Rune66 預設 Keyword Class；不回寫來源 Scope、不使用 LunaRunes Canon 作通用 Scope fallback。
- Admin／Manage 的 Scope、Scope Group、Keyword Class 與 Time 編輯、Source Refresh bounded delta、權限與 canonical visibility 均有 Current 實作與自動化 contract。
- LunaRunes 的 Draw、Daily、Directory、Game、OW3gs 等既有路徑和九組符文 Canon 維持原有責任。
- 共用 Hero／Theme／Navigation、區塊式編輯與 Statistics／Culture 管理頁維持既有 Current 架構，不因版本升級增加平行實作。

### 驗證與限制

- 候選版必須以 CI 的 `npm run verify`、public DB probe、Next build/static export 和 Playwright UI checks 成功為自動化證據。
- 既有 `main` 工作流程在定錨前曾成功，但不等於 RC commit 自身已通過；RC 應以正式 tag 所指 commit 的結果為準。
- 公開頁 desktop／mobile smoke、Import 與文章發布／編輯保存回讀、管理 CRUD／權限、真實大 corpus performance、loading／failure state 等人工驗收**尚未全部簽核**。
- 詳細驗收清單以 `docs/TODO.md` 為準；既有 0.9 readiness 記錄見 `governance/reviews/rc09-readiness-20261008.md`。
- 候選版只代表「可進一步驗收與展示」，不是 1.0、不是「所有測試均已完成」，更不宣稱未執行的人工測試已通過。

## Earlier — 0.8.6-RC

0.8.6-RC 是之前以公開基本功能與 LunaRunes Current 功能為範圍的候選基線，包含：PostgreSQL SSOT、FeaturePage／Page Composition、權限與公開功能旗標隔離、Search／Statistics／Culture 精準查詢、LunaRunes 66 符＋第零符德、抽牌與每日紀錄、圖鑑、遊戲，以及 Hero／Theme／Auth／Management 自動化驗證。此版本留下的人工驗收責任**完整承接**到 0.9.0-rc.1，不因版本升級視為完成。

## 0.9 Scope Group architecture

0.9 的主要架構目標已在 Current `main` 實作：由 Registry 與 `silver.manage` 定義 Scope／Scope Group 與資料表責任；一般新建 Group 不自行建立跨 Scope corpus aggregate，但 LOC (`loc`) 保留原有跨 Scope 唯讀 Culture／Statistics 比較；一般 Scope copy-on-create 並使用通用 static shell；固定 canonical 更新由 Admin／Manage 完成，AI 並非必要 write path。後續重點是以實際資料進行操作驗收與錯誤處理回測，而非再擴張一套重複的 Scope system。

## 0.9 RC 後續收尾（2026-10-09）

0.9.0-rc.1 的固定 tag 仍是既有展示候選版。其後 Current `main` 已合併 Keyword Attr 分批寫回、進度百分比與 SQL WHERE 條件修正；這些是 **tag 之後** 的修正，不追溯改寫 RC1 發版紀錄。

0.9 管理工作台以既有 Admin Registry、Scope Settings、Import、Period、Keyword 模組為基礎；Current 主要責任是**既有入口的實際操作驗收與 bug 修復**，不是擴充第二套工作台或資料權威。Import 已有程式入口，但尚未完成真實資料 round-trip 驗收（Pending）。

## 1.0 Release

### 文件定位

1.0 對外功能文件以 `docs/FEATURE_DEEP_DIVE.md` 作為深度能力介紹：分析目的、資料機制、跨功能關係、具體情境及治理限制。不再以新手操作教學作為主要文件交付；現有已校閱的網站文案與 Canon 不因文件改版而覆寫。Scope 管理與 Import 驗收完成後，再比對深度介紹與最後 runtime 行為。

1.0 之前仍需完成：

- image multimedia integration 與正確的關係／provenance；media 保持 first-class，不製造空白 Galaxy text。
- governed import workflow 與文章發布／編輯 round-trip 實測。
- desktop/mobile responsive、loading、failure-state、deployment regression。
- Scope extension、Admin configuration、權限與大型 corpus 的實際驗證。
- 保持 Canon、README、Roadmap、runtime contract 與實際資料權威一致。

## Release rule

不以提高版本號掩蓋未完成事項。每一版只描述 Current 已實作的功能、已取得的驗證證據與尚未完成的責任；release branch 由最新 `main` 建立，合併後 freeze。
