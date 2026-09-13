# LOC TODO Ledger

## Done

- [x] Culture 說明加入首頁；LOC 架構本身不改。
- [x] Culture 頁正式名稱與 ERA authority 收斂。
- [x] 符文圖鑑固定 canonical 群組順序與 01–66 編號順序。
- [x] Rune Graph 節點與關係固定排序。
- [x] 抽牌核心改為 Next.js 直接讀本地 canonical `runes.json`，不等待 Render。
- [x] `lots.json` 與 Graph 名冊延後載入，不阻塞抽牌與關鍵詞。
- [x] 個人設定集中到 `/my-style`；群組設定內嵌於個人設定頁。
- [x] 抽牌等待預設 4 秒，可在個人設定切換為即時反應（0 秒）。
- [x] 符文圖鑑固定每頁 8 枚，不提供修改。
- [x] 一般列表預設每頁 10 筆，可在個人設定修改。
- [x] 抽籤紀錄採本機 IndexedDB；只有使用者主動按「記錄」才保存。
- [x] 每日模式記到「每日紀錄」，其他模式記到「一般抽牌」，兩類都可刪除。
- [x] 「一般列表每頁筆數」已套用到 Search、Library、Context、Culture、Statistics 等 Next.js 列表；符文圖鑑維持固定每頁 8 枚，排行榜與群組統計維持統計型展示。

## Next

- [ ] 設定新增「頁面語系／Locale Theme」：中文、台語、英文、日文四種；設定入口只存在於 LOC／月典 shell。
- [ ] 建立共用 locale dictionary／變數層，統一 Header、Footer、NAV、Page title、Section title 與常用介面文字，避免各頁硬編碼標題。
- [ ] 將各 Next.js page metadata/title 改為由共用 page-title key 產生，讓切換語系時可使用同一組頁面識別而不是重寫路由。
- [ ] locale 與 shell 分離：LOC、LunaRunes、個人網站可有不同預設／鎖定策略，但底層共用同一套字典與元件；LunaRunes 與個人網站不提供設定入口。
- [ ] locale 設定先存本機，設計時保持可直接遷移到未來正式 App 的 local settings storage；PWA 不建立另一套網頁專用狀態模型。
- [ ] 自動語意顯示：分析結果直接控制字級、字重與連結。
- [ ] 顯示優先層級：保留／品牌詞 → 系統核心詞 → 群組 → 文字／符文／複合語意 → 例外保護 → 爭議層。
- [ ] Protected Phrase 設定層，避免單字切割污染（例如公司名、人名、專名）。
- [ ] Group Entity 與 Text Compound 同時顯示，不互相覆寫。
- [ ] 跨群組詞彙與文化／脈絡詞彙解析。
- [ ] Style Groups 分離 classification keywords 與 display keywords，加入 display priority。
- [ ] Search 加入群組優先卡與正式群組描述。
- [ ] Semantic enhancer 維持單向、每層一次，避免 DOM recursive re-enhance。
- [ ] 每批完成後檢查 Repository Governance 與 Pages build。
