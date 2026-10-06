# LOC Current TODO

**Current version:** 0.8.5.1-RC

## 0.8.5.1 RC follow-up verification

- [ ] 完成 LunaRunes canonical keyword library 與管理流程。
- [ ] 確保 LunaRunes keyword／positive_keywords／negative_keywords 不成為一般 Scope fallback。
- [ ] 完成 LunaRunes Game 規則呈現、互動與最終 UI。
- [ ] 完成 Governance／Admin management 頁面的最終人工檢查。
- [ ] 將 public Search／Statistics／Culture availability 接到 Current DB feature flags；management visibility 保持獨立。
- [ ] 以大型 corpus 進行 Search／Culture／Statistics stress test；維持精準 query + pagination。
- [ ] 統一 Culture／Statistics／Search incremental loading contract。
- [ ] Source Refresh：OAuth 後的小量來源更新；先從可用來源逐步接入。

## 0.9 Scope Group

- [ ] 以 Current Scope mapping 為基礎建立 Scope Group；不新增第二套 table resolver。
- [ ] Search／Statistics／Culture 以 Scope Group 組合多 Scope，維持各 Scope 精準 query + pagination。
- [ ] Audit 對新增 Scope／Scope Group 使用同一 resolver contract，不新增具名 Scope table 清單。
- [ ] Scope 建立流程採先複製再獨立編輯，確認來源 Scope 不會被個人化修改回寫。
- [ ] 將可預期的 canonical 更新收斂到網站管理流程；AI 不作為必要 write path。

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
