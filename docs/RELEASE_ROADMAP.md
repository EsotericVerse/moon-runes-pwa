# LOC Release Roadmap

## Current — 0.9.0-rc.1 (2026-10-08)

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

## Previous — 0.8.6-RC

0.8.6-RC 是之前以公開基本功能與 LunaRunes Current 功能為範圍的候選基線，包含：PostgreSQL SSOT、FeaturePage／Page Composition、權限與公開功能旗標隔離、Search／Statistics／Culture 精準查詢、LunaRunes 66 符＋第零符德、抽牌與每日紀錄、圖鑑、遊戲，以及 Hero／Theme／Auth／Management 自動化驗證。此版本留下的人工驗收責任**完整承接**到 0.9.0-rc.1，不因版本升級視為完成。

## 0.9 Scope Group architecture

0.9 的主要架構目標已在 Current `main` 實作：由 Registry 與 `silver.manage` 定義 Scope／Scope Group 與資料表責任；一般新建 Group 不自行建立跨 Scope corpus aggregate，但 LOC (`loc`) 保留原有跨 Scope 唯讀 Culture／Statistics 比較；一般 Scope copy-on-create 並使用通用 static shell；固定 canonical 更新由 Admin／Manage 完成，AI 並非必要 write path。後續重點是以實際資料進行操作驗收與錯誤處理回測，而非再擴張一套重複的 Scope system。

## 0.9 RC 後續收尾（2026-10-09）

0.9.0-rc.1 的固定 tag 仍是既有展示候選版。其後 Current `main` 已合併 Keyword Attr 分批寫回、進度百分比與 SQL WHERE 條件修正；這些是 **tag 之後** 的修正，不追溯改寫 RC1 發版紀錄。

0.9 的主要剩餘功能交付是 **Scope 管理選單的工作台整合與操作驗收**，優先重用既有 Admin Registry、Scope Settings、Import、Period、Keyword 等模組，不建立第二套資料或編輯權威。Import 已有程式入口，但尚未完成真實資料 round-trip 驗收。

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
