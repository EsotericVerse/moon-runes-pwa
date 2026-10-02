# LOC Current TODO

**Current version:** 0.8.4-rc

## 0.8.4 RC follow-up verification

- [ ] 獨立驗收 LunaRunes interpretation sentence handling，確保 single、Daily、2／3／5／11 card 只使用實際抽到的方向資料。
- [ ] 完成 LunaRunes canonical keyword library 與管理流程。
- [ ] 確保 LunaRunes keyword／positive_keywords／negative_keywords 不成為一般 Scope fallback。
- [ ] 完成 LunaRunes Game 規則呈現、互動與最終 UI。
- [ ] 完成 Governance／Admin management 頁面的最終人工檢查。
- [ ] 將 public Search／Statistics／Culture availability 接到 Current DB feature flags；management visibility 保持獨立。
- [ ] 以大型 corpus 進行 Search／Culture／Statistics stress test；維持精準 query + pagination。
- [ ] 統一 Culture／Statistics／Search incremental loading contract。

## 1.0

- [ ] 整合既有來源中的 image multimedia。
- [ ] 保持 image/media 為 first-class media data，不製造空白 Galaxy text。
- [ ] 完成 governed import workflow 與來源 provenance。
- [ ] 驗證普通 Scope extension 不需要新增 bespoke core architecture。
- [ ] 完成 responsive、loading、failure-state 與 deployment regression。
- [ ] 讓 Current Canon、KM、README 與 runtime verifier 保持一致。

## Guardrails

- 不自行新增 table、cache、projection、RLS 或 grant。
- 不建立 JSON／JS 第二份 corpus authority。
- 不 select all 後在 JS slice。
- 不為一般 Scope 發明特殊定義。
- Rune special semantics 只留在 LunaRunes。
- 新工作以最新 main 為起點；完成 branch merge 後 freeze。
