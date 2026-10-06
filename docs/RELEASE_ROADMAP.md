# LOC Release Roadmap

## Current — 0.8.6-RC

0.8.6-RC 是目前 Current candidate。此版以「公開基本功能可驗收＋LunaRunes Current 功能完整」作為候選基線。

Current 已具備：

- Supabase PostgreSQL 為主要資料來源；Neon 保留 public-read 備援。
- Search／Statistics／Culture／Governance 維持同一套 FeaturePage 與 Page Composition；功能名稱與共用視覺系統不因 Scope 任意改寫。
- public Search／Statistics／Culture availability 已由 Current DB feature flags 控制；management canonical visibility 保持獨立。
- Search／Statistics／Culture 使用 PostgreSQL 精準 query、固定 eligibility filter、COUNT 與 bounded pagination。
- LOC aggregate Statistics 預設最近一年；單 Scope 可使用自身時間範圍控制。
- FlexSearch runtime 已移除；Rune66 使用統一 canonical keyword library、literal classifier 與 Current 管理流程。
- 一般 Scope 不以 LunaRunes keyword、positive_keywords、negative_keywords 或 Rune Canon 作 fallback。
- LunaRunes 66 符＋第零符德、四方向、九組責任維持 Current Canon。
- LunaRunes 單卡、每日、雙卡、三卡、五卡、4／6／7／8／9／10 張與 11 張 OW3gs 路徑完整。
- 每日符文以單一行事曆保存主抽／補抽，並依該筆日期回看真實月相與上一筆同符文紀錄。
- 符文圖鑑含九組、單符資料與延伸長文；長文採正式閱讀版型，不再塞入短提示 bubble。
- LunaRunes Game 已具備首頁、遊戲文件、事件／符文／職業資料、回合流程與互動盤面。
- LOC、LunaRunes、Game、功能頁、細節頁與管理頁已使用分級 Hero；分級只改層級，不建立不同 Feature theme。
- Current build、static export、public DB probe、browser accessibility、Theme、Auth、Management contract 與 Cloudflare Pages checks 皆納入 CI。

### 0.8.6-RC acceptance boundary

本 RC 先驗收公開基本功能：

- LOC 首頁與共用 Navigation。
- Search／Statistics／Culture／Governance。
- LunaRunes 首頁。
- 單卡／每日／多卡／OW3gs 抽牌。
- 每日符文紀錄。
- 符文圖鑑：總覽、群組、單符。
- LunaRunes Game：首頁、文件、開始遊戲與基本回合流程。
- Author 公開頁與主要 responsive／loading／failure states。

Manage／Admin 已有 automated contract、權限與 build 驗證，但尚未完成使用者實際操作驗收；不將「尚未人工使用」誤寫為已驗收。

## 0.8.6 RC follow-up verification

- 完成公開基本功能的人工 smoke test；先確認主要使用路徑，再進入管理功能驗收。
- 完成 Governance／Admin／Scope Manage 的實際操作驗收，包括 CRUD、例外處理、searchable=false canonical visibility、Theme 與 Scope 設定。
- 以大型 corpus 進行 Search／Culture／Statistics stress test，確認 bounded query + pagination 在實際資料量下仍符合預期。
- 檢查 Culture／Search 的 incremental loading 與 Statistics 查詢在實際瀏覽流程中的速度與狀態回饋。
- Source Refresh：OAuth 後的小量來源更新，從可用來源逐步接入。

## 0.9 Direction — Scope Group

0.9 的主要架構方向是 Scope／Scope Group 化。共用 Search／Statistics／Culture／Management／Audit 必須由 Scope mapping 取得資料表責任，不以指定 Scope table name 寫死流程；Scope Group 應組合 Scope，而不是建立另一份 corpus authority。

0.8.6-RC 的公開功能與 LunaRunes 基線是 0.9 的前置條件：先確認 Current 使用流程穩定，再擴充 Scope Group。

0.9 的一般 Scope 延伸採 copy-on-create governance：先複製來源資料，再在新 Scope 內獨立編輯；來源 Scope 保持不變。LunaRunes canonical structure 不列入可自由改寫的 Scope template。

固定、可預期的 canonical 更新由網站管理流程直接處理；AI 不作為必要 write path。

## 1.0 Release

1.0 之前仍需完成：

- image multimedia integration 與關係資料。
- governed import workflow。
- 完整 responsive／loading／failure-state regression。
- Scope extension 與 Admin configuration 的實際驗證。
- Current 文件、Canon 與 runtime contract 一致。

## Release rule

不以新增 RC 數字掩蓋未完成的責任。每一版只描述 Current 實際存在的功能、已驗證的邊界與下一階段工作。
