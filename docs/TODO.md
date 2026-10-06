# LOC Current TODO

**Current version:** 0.8.6-RC

## 0.8.6 RC acceptance

### Public basic functions

- [ ] LOC 首頁與共用 Navigation 人工 smoke test。
- [ ] Search：一般查詢、media mode、空結果與錯誤狀態人工確認。
- [ ] Statistics：預設一年、單 Scope 時間範圍與圖表顯示人工確認。
- [ ] Culture：時間長河、分類、作品列表、Anchor 建議人工確認。
- [ ] Governance：LOC／LunaRunes／個人 Scope 公開內容人工確認。
- [ ] LunaRunes 首頁與 Hero／次要入口人工確認。
- [ ] LunaRunes 單卡／每日／雙卡／三卡／五卡／指定張數／OW3gs 人工 smoke test。
- [ ] 每日符文紀錄：Calendar、主抽／補抽、前次同符文比較人工確認。
- [ ] 符文圖鑑：總覽、九組、單符與長文字閱讀人工確認。
- [ ] LunaRunes Game：首頁、遊戲文件、開始新遊戲與基本回合流程人工確認。
- [ ] Author 公開頁與主要 desktop／mobile responsive 人工確認。

### Management / Admin

- [ ] 在公開基本功能確認後，再開始 Governance／Admin／Scope Manage 的實際操作驗收。
- [ ] 驗證 CRUD、0-row 例外處理、searchable=false canonical visibility、Theme、Scope config 與權限行為。
- [ ] 驗證管理預覽、Import、Data、Period、Keyword 等工作區的實際使用流程。

### Performance / data scale

- [ ] 以大型 corpus 進行 Search／Culture／Statistics stress test；維持精準 query + bounded pagination。
- [ ] 實際確認 Culture／Search incremental loading 與 Statistics 查詢速度、loading、empty、failure state。
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
- [ ] 讓 Current Canon、README 與 runtime verifier 保持一致。

## Guardrails

- 不自行新增 table、cache、projection、RLS 或 grant。
- 不建立 JSON／JS 第二份 corpus authority。
- 不 select all 後在 JS slice。
- 不為一般 Scope 發明特殊定義。
- Rune special semantics 只留在 LunaRunes。
- 新工作以最新 main 為起點；完成 branch merge 後 freeze。
