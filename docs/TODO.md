# LOC TODO Ledger

## Done

- [x] Culture 說明加入首頁；LOC 架構本身不改。
- [x] Culture 頁正式名稱與 ERA authority 收斂。
- [x] 符文圖鑑固定 canonical 群組順序與 01–66 編號順序。
- [x] Rune Graph 節點與關係固定排序。
- [x] 抽牌核心改為 Next.js 直接讀 Neon canonical rune rows，不等待舊服務。
- [x] `lots.json` 與 Graph 名冊延後載入，不阻塞抽牌與關鍵詞。
- [x] 個人設定集中到 `/my-style`；群組設定內嵌於個人設定頁。
- [x] 抽牌等待預設 4 秒，可在個人設定切換為即時反應（0 秒）。
- [x] 符文圖鑑固定每頁 8 枚，不提供修改。
- [x] 一般列表預設每頁 10 筆，可在個人設定修改。
- [x] 抽籤紀錄只有使用者主動按「記錄」才保存；登入後寫入 Neon `user_records`，並由 RLS 隔離。
- [x] 每日模式記到「每日紀錄」，其他模式記到「一般抽牌」，兩類都可刪除。
- [x] 「一般列表每頁筆數」已套用到 Search、Library、Context、Culture、Statistics 等 Next.js 列表；符文圖鑑維持固定每頁 8 枚，排行榜與群組統計維持統計型展示。
- [x] Runtime JSON loader 加入全域 concurrency=2、單檔／batch I/O budget、LRU memory hot-cache；大型 JSON 不再無上限常駐記憶體。
- [x] 建立 `loc-data-version.json`：逐檔 SHA-256／bytes／delivery tier，未變資料沿用 persistent HTTP cache；CI 驗證 hash、bytes、aggregate version 與 runtime payload budget。
- [x] 建立 `loc-data-index.json` 階層索引：dataset → segment；LOC3／LOC4 現有 shards 可按 segment ID／sequence 增量取得，不必先下載完整 corpus。
- [x] Search 改為每批 2 segments 漸進掃描，結果足夠即停止；不再預設把所有 text/music corpus shards 一次下載、parse 後才搜尋。
- [x] Search 加入 adaptive segment routing：僅保存 hashed query token → 命中 segment score，不保存原始查詢文字；重複／相近查詢優先讀可能命中的 segments，並保留完整 fallback 掃描。
- [x] `prepare-next-public.mjs` 將 runtime JSON 分為 `core` / `on-demand` delivery tier；部署可取得不再等同預載，CI 同步驗證 tier 與階層 index 完整性。

## Next

### Large Data Performance / 家族級與超大語料遠景

#### Runtime migration note

- [x] 早期 Large Data、shard、cache 與延後載入設計，有相當一部分是為了避免 Render 後端讀取大型資料時超出 server RAM；目前網站運作階段不需要 Render 參與主要 runtime data path，但未來仍可依功能需求接回 Render 或其他 backend。
- [x] 引進 Next.js 後，現階段採靜態輸出 + Neon Data API + runtime on-demand loading + segment index；舊有只為 Render RAM 或 IndexedDB persistence 存在的 workaround 已逐步退役，仍具一般大型資料價值的分片、索引與 I/O budget 保留。
- [ ] 清查並移除只為 Render backend 記憶體限制而存在、但 Next.js 現行 runtime 已不需要的 legacy code / fallback / timeout / cache workaround；不得誤刪仍有 browser RAM、JSON parse、network working-set 或大型 DOM 控制價值的分片、索引與 I/O budget。
- [x] Backend independence 原則：Render／其他 backend 未來若再接回，應經 adapter / service layer 接入，不讓前端資料模型與搜尋流程重新被特定 backend 綁死。
- [x] 架構判斷原則更新：目前不再以 Render server RAM 作為唯一設計限制；Next.js + Neon 仍需控制 browser memory、JSON parse、network 與 DOM working set。

- [ ] 架構預設目標從「千萬字可運作」提升為可持續擴張的 family-scale corpus：單人 → 多人 → 家族 → 多世代 → 多文化／多來源；總文字量可進入 100M、1B+ 級距，不能假設整體資料可一次載入、一次搜尋或一次重建。
- [ ] 建立 Light / Standard / Heavy / Archive 四級工作模式：日常查詢永遠走輕量索引；跨人物、跨年代、跨文化總體分析才進入重量管線；Archive 層只保存與定向取回，不參與一般熱路徑。
- [ ] 資料分區鍵至少預留 person / family / generation / era / source / corpus / language / culture；搜尋與統計先縮小 partition，再進入 shard / document，不允許預設跨全庫。
- [ ] Search 改為 hierarchical index-first：global catalog → scope index → partition index → shard/document index → content fetch；禁止每次查詢把所有 corpus shards 全部排入下載／parse／全文掃描。
- [ ] 建立搜尋索引格式，至少保存 term/token → document/shard id、來源、必要 ranking metadata；原文內容與搜尋索引分離。
- [ ] 為 LOC Search、LunaRunes Search、Personal Search、未來 Family Search 建立不同 search scope / index profile，但共用同一搜尋引擎與 cache engine。
- [ ] 建立「延伸體系」資料模型：新增人物／年代／作品時可新增 partition/index segment，不因整體語料成長而重寫舊資料或重建整個索引。
- [ ] 索引與統計採增量更新；新增 1% 資料時不得重新 parse / tokenize / classify 100% corpus。支援 segment merge / compaction，但不得阻塞日常查詢。
- [x] 個人紀錄由 IndexedDB 遷移至 Neon `user_records`；依 record type 與 owner 透過資料庫索引/RLS 查詢，不再維護 browser DB index。
- [x] 個人設定由 localStorage 遷移至 Neon `user_settings`；舊瀏覽器資料僅保留一次性登入後遷移流程。
- [ ] 設定 I/O Budget：限制單次查詢最多讀取 shard 數、單次 transaction 筆數、單次 JSON parse 體積與背景 index rebuild 工作量；重量工作必須可分批、可中止、可續跑。
- [ ] 建立 memory hot-cache：canonical rune data、manifest、search metadata、常用 registry 在同一 App session 內不得反覆讀磁碟／反覆 JSON parse；超大資料不得常駐 RAM。
- [ ] 建立 projection/index version/hash：資料版本未變時不重建索引；只重建變更 partition / shard / source。
- [ ] PWA runtime cache 分級：core 小資料可優先快取；大型 corpus / graph / media metadata 只在實際使用時 cache，不做整包 precache。
- [ ] 為大型 runtime/cache working set 設容量與淘汰策略（LRU / last-access / version cleanup）；cache policy 必須能依 Light / Heavy 模式不同。
- [ ] Search、Scenario、Library 等輸入搜尋加入 debounce / deferred update；禁止每個 key stroke 對大型資料做完整 `.filter().includes()` 掃描。
- [ ] 大型排序／統計改成增量或預計算 index；避免每次 render 對完整集合重新 `sort/filter/map`。
- [ ] React 大型結果頁採 windowing / virtualization 或 page-by-id；即使資料已在記憶體，也不得同時建立大量 DOM nodes。
- [ ] Graph 若未來超出 LunaRunes 66 節點，改成 adjacency/index 查詢與局部展開；禁止 O(n²) 即時計算所有 pair edges。家族總體 Graph 必須按人物／時間／關係範圍局部展開。
- [ ] `prepare-next-public.mjs` 將「部署可用資料」與「預載資料」分級；避免搜尋 corpus 成長後所有 shards 都被視為同等 runtime payload / cache 對象。
- [ ] 建立 large-data benchmark：至少測試 1M、10M、50M、100M、1B 中文字元級距；100M+ 可使用 synthetic/index benchmark，不要求完整 corpus 常駐瀏覽器。記錄 cold search、warm search、Neon/Data API read、JSON parse、memory peak、build/export size、index size 與 incremental update cost。
- [ ] 設效能回歸門檻：CI / benchmark 若超出既定 memory、I/O、搜尋 latency 或 build payload budget，視為性能回歸，不讓資料量成長默默拖慢系統。
- [ ] 架構原則：總資料量可以極大，但任何單次互動的 working set 必須小；系統擴張靠分區、索引、分片、增量與局部載入，而不是靠更大的 RAM 或一次掃更多資料。

### Locale / Theme / Shell

- [ ] 設定新增「頁面語系／Locale Theme」：中文、台語、英文、日文四種；設定入口只存在於 LOC／月典 shell。
- [ ] 建立共用 locale dictionary／變數層，統一 Header、Footer、NAV、Page title、Section title 與常用介面文字，避免各頁硬編碼標題。
- [ ] 建立 Title/Theme Token Layer：所有 H1／主要 H2／頁面大標題改用穩定 semantic key（例如 `page.home.title`、`page.runes.title`、`section.context.title`），不在 JSX 直接寫死顯示文字。
- [ ] Title token 分成內容與風格兩層：locale dictionary 決定文字；style token 決定字級、字重、字距、大小寫、顏色、對齊與間距。切換語系與切換風格彼此獨立。
- [ ] Header、Footer、NAV、Page title、Section title 共用同一套 semantic title keys；同一 key 在 LOC、LunaRunes、個人網站可套不同 shell theme，但不複製內容邏輯。
- [ ] 將各 Next.js page metadata/title 改為由共用 page-title key 產生，讓切換語系時可使用同一組頁面識別而不是重寫路由。
- [ ] locale 與 shell 分離：LOC、LunaRunes、個人網站可有不同預設／鎖定策略，但底層共用同一套字典與元件；LunaRunes 與個人網站不提供設定入口。
- [x] locale／theme／UI settings 已統一存入 Neon `user_settings`；PWA 不建立另一套網頁專用持久化模型。

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

### Game UI 2.0 / 下一階段

- [ ] 目前先不新增遊戲規則；完成現行 Shell / Settings / Search / Cache / Semantic Governance 收尾後，再進入 Game UI 2.0。
- [ ] 將現有 GameView 從 dashboard 式平面介面改為真正 card battle board：玩家區、事件卡、手牌、出牌區、De 與回合狀態要有明確空間層次。
- [ ] 將 RuneCard / EventCard / PlayerBoard / DeMeter / ActionPanel / BattleLog 元件化，沿用 canonical runes / event data，不建立第二份遊戲專用符文資料。
- [ ] 保留現行事件 → 三張符文回答 → 語意覆蓋 → De → 共振／干擾 → 16 De 勝利規則，先強化互動與視覺，不在 UI 重構時改動規則基底。
- [ ] 將遊戲流程逐步收斂為明確 phase/state：draw → choose → reveal → resolve → interact → endTurn → nextEvent，為後續職業、特殊規則與 PvP 擴充預留接口。
- [ ] 使用 Next.js / React 的 dynamic import、route prefetch 與 client-state 分層，讓遊戲只在進入遊戲時載入較重互動模組，不拖累月之符文與 LOC 一般頁面。
- [ ] Game UI 2.0 完成並驗證後，再正式把遊戲作為月典分支中的成熟互動模組呈現。
