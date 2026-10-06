# LOC Release Roadmap

## Current — 0.8.5-RC

0.8.5-RC 是目前 Current candidate。此版在 0.8.4 共用架構基線上完成資料來源可攜性、統計查詢收斂，以及 LunaRunes 抽牌／每日功能封裝。Current 已具備：

- Supabase PostgreSQL 為主要資料來源；Neon 保留 public-read 備援。
- Search／Statistics／Culture 使用 PostgreSQL 精準 query、固定 eligibility filter、COUNT 與分頁。
- LOC aggregate Statistics 預設只查最近一年，不再先載入全部歷史；個人 Scope 才保留自訂時間區間。
- 資料來源狀態移至 footer，不佔用首頁主要資訊層級。
- FlexSearch runtime 已移除；Rune66 分類改由 canonical keyword library 與 Current classifier 負責。
- canonical management data view、searchable=false 管理可見性與 Galaxy UpdateTime contract 維持不變。
- LunaRunes 單卡／每日維持既有字串；雙卡以上只以當次真實月相對應的 `sit_q` 組成籤詩。
- LunaRunes 1–11 張牌數完整覆蓋；4／6／7／8／9／10 張由符文首頁指定張數入口進入，不改原抽牌選項架構。
- 每日符文整合為單一行事曆：月相開始／結束標記、當日 `sit_q + daily_r + daily_g + daily_b`，以及上一筆同符文日期與當時 `sit_q`。
- 舊 Daily Trend client／engine 已退役；每日頁不再做高頻或多日複雜趨勢分析。
- Scope／Feature／Page responsibility、404 fallback、Theme、Audit 與管理例外處理維持 Current 單一路徑。

## 0.8.5 RC follow-up verification

0.8.5-RC 不再擴張抽牌或每日功能；下一個直接問題是 Rune66 canonical keyword library 的 literal matching 與管理流程。

Current 0.8.5-RC follow-up：

- 修正 Rune 自身名稱未被 classifier 當成 literal signal 的問題；例如 `空` 應命中 `天空`、`空間` 等包含字串。
- 完成 LunaRunes keyword library 與治理；Rune special semantics 只留在 LunaRunes。
- 完成 LunaRunes Game 的規則呈現、互動與最終 UI。
- 完成 Governance／Admin management 的最終人工檢查。
- 把 public Search／Statistics／Culture availability 正確接到 Current DB feature flags，同時維持 management canonical visibility。
- 以大型 corpus 進行 Search／Culture／Statistics stress test，維持 bounded query + pagination。

## 0.9 Direction — Scope Group

0.9 的主要架構方向是 Scope／Scope Group 化。共用 Search／Statistics／Culture／Management／Audit 必須由 Scope mapping 取得資料表責任，不以指定 Scope table name 寫死流程；Scope Group 應組合 Scope，而不是建立另一份 corpus authority。

0.8.5-RC 的一致化與去重複是 0.9 的前置工程：先把 resolver、mapping、query、audit 與概念責任收成單一路徑，再擴充 Scope Group。

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
