# LOC Current TODO

**Current version:** 0.8.6-RC

## 0.8.6 RC acceptance

### Public basic functions

- [ ] LOC 首頁與共用 Navigation 人工 smoke test。
- [ ] Search：一般查詢、media mode、空結果與錯誤狀態人工確認。
- [ ] Statistics：LOC Scope Group Overview／導引，以及單 Scope 的一年／一月／一週、折線／長條／圓餅圖人工確認。
- [ ] Culture：LOC Scope Group 導引，以及單 Scope 的時間長河、分類、作品列表、Anchor 建議人工確認。
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
- [ ] 文化：時期設定與時間河道，實際驗證切換時期、錨點、河道範圍與儲存結果。
- [ ] 統計：關鍵詞設定，實際驗證 Class／Group／Item 編輯、重新分析與分頁後 Group 排行。
- [ ] LOC 首頁 Hero：16:9 版面下檢查既有資料庫文字的換行、字級與可讀性；文案如要更改，等待作者指定新文字後再編輯，切勿以舊 JSX 種子覆蓋。

### Performance / data scale

- [ ] 以大型 corpus 進行 Search／Culture／Statistics stress test；維持精準 query + bounded pagination。
- [ ] 實際確認 Culture／Search incremental loading 與 Statistics 查詢速度、loading、empty、failure state。
- [x] Source Refresh core：以 `source_name + source_native_id` 做 bounded delta preview／新增／更新；OAuth 只作來源 adapter，不改 Refresh contract。

## 0.9 Scope Group

- [x] Scope Group 成員以 `scope_registry.parent_scope_id` 為 authority；不新增第二套 table resolver。
- [x] Search／Statistics／Culture 的 Group 頁只做 Registry Overview＋導引；不 fan-out 查詢多 Scope corpus，各 Scope 維持自己的精準 query + pagination。
- [x] Audit／Runtime 對新增 Scope 使用通用 `/scope/.../?scope=<id>` resolver contract，不新增具名 Scope route/table 清單。
- [x] Scope 建立流程採先複製再獨立編輯；Rune66 預設 Class 以新 UUID／66 筆獨立複製，不回寫來源 Scope。
- [x] Scope Registry／Group hierarchy／固定 canonical 更新已收斂到網站 Admin／Manage；AI 不作為必要 write path。

## 1.0

- [ ] 整合既有來源中的 image multimedia。
- [ ] 保持 image/media 為 first-class media data，不製造空白 Galaxy text。
- [ ] 完成 governed import workflow 與來源 provenance。
- [x] 普通 Scope extension 使用固定 DB 五件套＋通用 static shell，不需要新增 bespoke core architecture。
- [ ] 完成 responsive、loading、failure-state 與 deployment regression。
- [ ] 讓 Current Canon、README 與 runtime verifier 保持一致。

## Guardrails

- 不自行新增 table、cache、projection、RLS 或 grant。
- 不建立 JSON／JS 第二份 corpus authority。
- 不 select all 後在 JS slice。
- 不為一般 Scope 發明特殊定義。
- Rune special semantics 只留在 LunaRunes。
- 新工作以最新 main 為起點；完成 branch merge 後 freeze。
