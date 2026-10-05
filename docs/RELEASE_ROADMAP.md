# LOC Release Roadmap

## Current — 0.8.4-rc

0.8.4-rc 是目前 Current candidate。此版封存共用架構、模組化與 Ponytail code review 收尾；LunaRunes 功能／語意另行驗收，不回退已完成的共用架構。Current 已具備：

- Supabase PostgreSQL SSOT。
- Search／Statistics／Culture shared features。
- canonical management data view。
- searchable=false 仍可管理。
- Galaxy edit UpdateTime。
- Statistics custom date range。
- Culture intersection／Anchor workflow。
- Anchor suggestion data threshold。
- 八組完整 Theme palette。
- 共用 UI copy registry。
- Scope registry responsibility cleanup。
- branch freeze governance。
- 共用 resolver、Scope mapping、Theme bootstrap 與 404 fallback contract 已完成收斂。
- Current 文件已移除 retired V2／parallel authority。
- CSS／JS ownership 與重複責任已進行安全收斂，避免為了刪重複而增加新的平行實作。
- Audit 與 runtime 使用同一套 Scope mapping 概念；一般 Scope 驗證不再硬寫 `lo3rwang_*`／`lrunes_*` table name。
- Current 不啟用 KM；Current authority 只保留 main + Supabase PostgreSQL。

## 0.8.4 RC follow-up verification

0.8.4 RC 的共用架構與 code review 已完成；以下屬後續功能／人工驗收，不重新建立另一套架構。

Current 0.8.4 RC follow-up：

- 獨立驗收 LunaRunes interpretation sentence 的一致性。
- 完成 LunaRunes keyword library 與治理；Rune special semantics 只留在 LunaRunes。
- 完成 LunaRunes Game 的規則呈現、互動與最終 UI。
- 完成 Governance／Admin management 的最終人工檢查。
- 把 public Search／Statistics／Culture availability 正確接到 Current DB feature flags，同時維持 management canonical visibility。
- 整理大型 corpus stress test；Statistics 使用 statistics_able 固定篩選，Rune66 統計評估改用數值彙總與寫入時驗證，避免頁面反覆載入全文。

## 0.9 Direction — Scope Group

0.9 的主要架構方向是 Scope／Scope Group 化。共用 Search／Statistics／Culture／Management／Audit 必須由 Scope mapping 取得資料表責任，不以指定 Scope table name 寫死流程；Scope Group 應組合 Scope，而不是建立另一份 corpus authority。

0.8.4-rc 的一致化與去重複是 0.9 的前置工程：先把 resolver、mapping、query、audit 與概念責任收成單一路徑，再擴充 Scope Group。

0.9 的一般 Scope 延伸採 copy-on-create governance：先複製來源資料，再在新 Scope 內獨立編輯；來源 Scope 保持不變。LunaRunes canonical structure 不列入可自由改寫的 Scope template。

固定、可預期的 canonical 更新由網站管理流程直接處理；AI 不作為必要 write path，避免把重複指定工作轉成持續 API 成本。

## 1.0 Release

1.0 之前仍需完成：

- image multimedia integration 與關係資料。
- governed import workflow。
- 完整 responsive／loading／failure-state regression。
- Scope extension 與 Admin configuration 的實際驗證。
- Current 文件、Canon 與 runtime contract 一致。

## Release rule

不以新增 RC 數字掩蓋未完成的責任。每一版只描述 Current 實際存在的功能與已確認的下一階段工作。
