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

### Large Data Performance / 千萬字級預防

- [ ] Search 改為 index-first：禁止每次查詢把所有 corpus shards 全部排入下載／parse／全文掃描；先查輕量本機索引，再只讀命中的 shard / document。
- [ ] 建立搜尋索引格式，至少保存 term/token → document/shard id、來源、必要 ranking metadata；原文內容與搜尋索引分離。
- [ ] 為 LOC Search、LunaRunes Search、Personal Search 建立不同 search scope / index profile，但共用同一搜尋引擎與 cache engine。
- [ ] IndexedDB 改為可索引 store；`getLocalRecords(type)` 不得先 `entries()` 讀完整 DB 再 filter，應直接依 type / id / date / source 等 index 查詢。
- [ ] `clearLocalRecords(type)` 改用 IndexedDB index/cursor 定向刪除，避免先 full-scan 全庫再逐筆 delete。
- [ ] 設定 I/O Budget：限制單次查詢最多讀取 shard 數、單次 transaction 筆數、單次 JSON parse 體積與背景 index rebuild 工作量。
- [ ] 建立 memory hot-cache：canonical rune data、manifest、search metadata、常用 registry 在同一 App session 內不得反覆讀磁碟／反覆 JSON parse。
- [ ] 建立 persistent cache version/hash：資料版本未變時不重建本機索引；只重建變更 shard / source。
- [ ] PWA runtime cache 分級：core 小資料可優先快取；大型 corpus / graph / media metadata 只在實際使用時 cache，不做整包 precache。
- [ ] 為大型 cache 設容量與淘汰策略（LRU / last-access / version cleanup），避免 Cache Storage / IndexedDB 無限制成長。
- [ ] Search、Scenario、Library 等輸入搜尋加入 debounce / deferred update；禁止每個 key stroke 對大型資料做完整 `.filter().includes()` 掃描。
- [ ] 大型排序／統計改成增量或預計算 index；避免每次 render 對完整集合重新 `sort/filter/map`。
- [ ] React 大型結果頁採 windowing / virtualization 或 page-by-id；即使資料已在記憶體，也不得同時建立大量 DOM nodes。
- [ ] Graph 若未來超出 LunaRunes 66 節點，改成 adjacency/index 查詢與局部展開；禁止 O(n²) 即時計算所有 pair edges。
- [ ] `prepare-next-public.mjs` 將「部署可用資料」與「預載資料」分級；避免搜尋 corpus 成長後所有 shards 都被視為同等 runtime payload / cache 對象。
- [ ] 建立 large-data benchmark：至少測試 1M、10M、50M 中文字元資料級距，記錄 cold search、warm search、IndexedDB read、JSON parse、memory peak、build/export size。
- [ ] 設效能回歸門檻：CI / benchmark 若超出既定 memory、I/O、搜尋 latency 或 build payload budget，視為性能回歸，不讓資料量成長默默拖慢系統。

### Locale / Theme / Shell

- [ ] 設定新增「頁面語系／Locale Theme」：中文、台語、英文、日文四種；設定入口只存在於 LOC／月典 shell。
- [ ] 建立共用 locale dictionary／變數層，統一 Header、Footer、NAV、Page title、Section title 與常用介面文字，避免各頁硬編碼標題。
- [ ] 建立 Title/Theme Token Layer：所有 H1／主要 H2／頁面大標題改用穩定 semantic key（例如 `page.home.title`、`page.runes.title`、`section.context.title`），不在 JSX 直接寫死顯示文字。
- [ ] Title token 分成內容與風格兩層：locale dictionary 決定文字；style token 決定字級、字重、字距、大小寫、顏色、對齊與間距。切換語系與切換風格彼此獨立。
- [ ] Header、Footer、NAV、Page title、Section title 共用同一套 semantic title keys；同一 key 在 LOC、LunaRunes、個人網站可套不同 shell theme，但不複製內容邏輯。
- [ ] 將各 Next.js page metadata/title 改為由共用 page-title key 產生，讓切換語系時可使用同一組頁面識別而不是重寫路由。
- [ ] locale 與 shell 分離：LOC、LunaRunes、個人網站可有不同預設／鎖定策略，但底層共用同一套字典與元件；LunaRunes 與個人網站不提供設定入口。
- [ ] locale／title style 設定先存本機，設計時保持可直接遷移到未來正式 App 的 local settings storage；PWA 不建立另一套網頁專用狀態模型。

### Semantic Display / Governance

- [ ] 自動語意顯示：分析結果直接控制字級、字重與連結。
- [ ] 顯示優先層級：保留／品牌詞 → 系統核心詞 → 群組 → 文字／符文／複合語意 → 例外保護 → 爭議層。
- [ ] Protected Phrase 設定層，避免單字切割污染（例如公司名、人名、專名）。
- [ ] Group Entity 與 Text Compound 同時顯示，不互相覆寫。
- [ ] 跨群組詞彙與文化／脈絡詞彙解析。
- [ ] Style Groups 分離 classification keywords 與 display keywords，加入 display priority。
- [ ] Search 加入群組優先卡與正式群組描述。
- [ ] Semantic enhancer 維持單向、每層一次，避免 DOM recursive re-enhance。
- [ ] 每批完成後檢查 Repository Governance 與 Pages build。
