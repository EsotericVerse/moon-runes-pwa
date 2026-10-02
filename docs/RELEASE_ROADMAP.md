# LOC Release Roadmap

## Current — 0.8.4-rc

0.8.4-rc 是目前 Current candidate。此版封存共用架構、模組化與 Ponytail code review 收尾；LunaRunes 功能／語意另行驗收，不回退已完成的共用架構。Current 已具備：

- Neon SSOT。
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

## 0.8.4 RC follow-up verification

0.8.4 RC 的共用架構與 code review 已完成；以下屬後續功能／人工驗收，不重新建立另一套架構。

Current 0.8.4 RC follow-up：

- 獨立驗收 LunaRunes interpretation sentence 的一致性。
- 完成 LunaRunes keyword library 與治理；Rune special semantics 只留在 LunaRunes。
- 完成 LunaRunes Game 的規則呈現、互動與最終 UI。
- 完成 Governance／Admin management 的最終人工檢查。
- 把 public Search／Statistics／Culture availability 正確接到 Current DB feature flags，同時維持 management canonical visibility。
- 整理大型 corpus stress test，維持精準 query 與分頁，不引入第二份 corpus authority。

## 1.0 Release

1.0 之前仍需完成：

- image multimedia integration 與關係資料。
- governed import workflow。
- 完整 responsive／loading／failure-state regression。
- Scope extension 與 Admin configuration 的實際驗證。
- Current 文件、Canon、KM 與 runtime contract 一致。

## Release rule

不以新增 RC 數字掩蓋未完成的責任。每一版只描述 Current 實際存在的功能與已確認的下一階段工作。
