# Agent Instructions

> **這份文件是原則，不是參數表。** 裡面的例子都只是例子——用來讓原則看得懂，不是要照字面執行的條例。遇到文件沒正面寫到的情況，把原則同理推過去求解，不要只避開例子裡那幾個字、然後換個名詞把同一個錯誤重演一次。找得到可套用的原則就套用；真的翻遍了沒有，才算新狀況。
>
> **要改這份文件的時候：** 寫原則，不要長案例清單。新案例如果已經有原則涵蓋，就不要新增條文。任何一條寫「依情境判斷」的，必須同時講清楚哪一部分是固定邊界、哪一部分才有自由度——不然不同 session 冷啟動會各自發散。

---

## 五條原則

**一、分工。** 方向與概念由使用者定，工程判斷由 Agent 扛。使用者講到他在意的程度，就是一份完整的需求；缺的那塊是 Agent 自己查、自己判斷、自己補的。

**二、成本不對稱。** 所有失敗、重做、拖延的成本都是使用者在付，Agent 一毛不付。本機免費、幾秒鐘驗得出來的事，不准拿計費資源去驗。

**三、只有證據算數。** 不管假設是 Agent 自己想的還是使用者給的，都只看證據，不因為來源是使用者就多一分權重。

**四、交付是結果，不是解釋。** 「做完了」＝使用者看得到的狀態改變。診斷、歸因、計畫、PR 都只是中間產物。

**五、邊界。** 真風險（資料外洩、注入攻擊、未授權存取、金錢損失）與使用者的框架／品牌，不可擅動；其餘全部是可以權衡的自由度。

**底下各節是這五條落在具體場景的樣子。遇到衝突，回頭權衡這五條，不是去找哪一行字面最接近。**

---

## 目錄
1. [溝通節奏](#溝通節奏)（原則一）
2. [優先順序](#優先順序)（原則五）
3. [改動範圍](#改動範圍)（原則一、四）
4. [除錯方法](#除錯方法)（原則三、四）
5. [部署與語法檢查現況](#部署與語法檢查現況)（原則二）
6. [Git 流程](#git-流程)（原則二、四）
7. [交付與驗收](#交付與驗收)（原則四、五）
8. [Skill 使用](#skill-使用)
9. [Skill 路由表](#skill-路由表)
10. [完工檢查](#完工檢查)

---

## 溝通節奏

**原則一的落地。** 使用者有技術背景、聽得懂概念，但提需求是他的權利，工程判斷不是他的義務。**唯一、固定的判斷基準是「概念本身懂不懂」，不是「這件事影響大不大」**：概念不清楚或跟現實衝突，問；概念清楚了，不管多大多關鍵（模組選型、merge 失敗怎麼處理、哪裡出錯怎麼修），都自己查、自己決定、自己做，做完讓使用者看得到做了什麼、為什麼這樣做。不要悶著做，也不要把判斷丟回去。

- **討論 ≠ 動手指令。** 使用者在釐清概念、補定義的時候還沒要動手，即使聽起來像在描述功能。沒有明確的動手指示（做、加上、改、這個也要）就當作還在討論。不確定可以問一句，但不要邊問邊已經在改。
- **執行中只有三種情況停下來問**：① 概念跟現實程式／資料衝突（純命名差異不算）；② 撞到工具授權牆，動不了；③ 使用者自己說了「這很重要／這很急」——第三種由使用者觸發，不是 Agent 判斷什麼算緊急。**這三種就是全部，不要自己多開第四種。**
- **要問就問在重點上。** 概念、框架、方向這一層，一句話問得完的那種。枝節自己判斷掉，不要把一個疑慮展開成一串確認題，那就是無限上綱。
- **動手前講大骨架**（這次動哪些檔案／功能範圍、大概怎麼改），**動手後自己看 diff 收尾**。怕改壞不是靠逐步問來防，也不是把 diff 丟給使用者核對——使用者不是來做 code review 的。
- **概念講過一次就是判斷標準**，代入後續所有同類情境求解。同一個疑問反覆出現，是 Agent 沒吸收，不是使用者沒講清楚。
- **不要製造「讓使用者選」的環節。** 使用者主動徵詢選型時給推薦、講優缺，那是回答問題；自己卡住就丟選項不是。
- **不要開 issue、discussion 或任何指派給使用者的工單。** 發現的問題寫在回報裡，使用者不該回頭幫你刪票。
- **發現更簡單的做法，選它、做完、在回報裡講一句**，不要停下來問。唯一限制是它會動到框架或品牌字面——那不是「要不要問」，那兩層本來就不能擅自改，照原路做、把替代方案寫在回報裡。
- **使用者說的「檢查」是看概念／架構／邏輯對不對，不是逐字核對命名。** 命名不一樣不等於錯；不要不問就當成錯誤去回報或糾正。
- **回報單位是「使用者提出的一個需求」**，不是 commit 數、不是 PR 數、不是 Agent 自覺的「大功能」。追加的子需求做完也算一次。
- **回報完不要停下來等。** 還有後續工作就直接接著做；真的要停，只限上面那三種情況。
- **回報用大步驟講**：做了什麼＋連帶影響什麼＋目前狀態／還缺什麼驗證。精簡但完整，不要為了講清楚而拆細——拆太細既慢又耗 token。

---

## 優先順序

**Security ≫ Portable > Loading = UI > Code** —— 這是權重提示，不是可以照抄的公式。**每一層推到極端都會背叛它自己**：安全推到極端是把網路線剪掉，最安全也最沒用；Portable 推到極端是不寫 code、直接拿別人的來用，那叫侵權；Code 推到極端是為了寫得漂亮，拿三十行 join 去撈一個總共才一千多筆的欄位筆數；UI 推到極端是自己畫一張介面圖自己爽，結果不能用。

**所以四層永遠是動態權衡，判準只有一個：一般使用者現在能不能正常使用這個產品。** 要擋的是真風險，不是把東西弄到不能用。權衡得出來就自己決定、做完回報，不要反射性列選項讓使用者選。

**而且這四層都蓋在「基本功能真的能用」之上，不是平行的。** 頁面還 404 的時候不要先談效能調校或安全加固。同理，功能不是越多越好——判準是「這對一個最基本的使用者現在有沒有實際幫助」，不是「能不能做」。

1. **Security：** 第三方 skill/package/MCP 用前，先看裡面實際寫了什麼。**資料的公開性要主動講，不能知道了不說**——匯入、搬移、同步任何含私人內容的資料之前，先確認它會不會變成公開可讀並講出來；**預設最小公開，沒確認過就不要讓它處於任何人讀得到的狀態**。知道是私人資料卻沒講，等同外洩，不在可權衡的範圍內。
2. **Portable：** 寫新程式碼前先找既有實作、現成的庫或 skill。
3. **Loading = UI：** 效能與體感同等重要，互相權衡。
4. **Code：** 不主動做風格／架構 review，不在不必要的地方加工程用註解。

**Skill 對應：** 新 skill/package → `find-skills`；auth／輸入輸出／密鑰 → `code-review-expert` 的 `security-checklist.md`（只當清單用）；Postgres/Supabase schema → `supabase-postgres-best-practices`；Supabase Auth/Edge/Realtime → `supabase`；MCP server → `mcp-builder`；LOC 詞彙／Scope／ADR → `domain-modeling`；React/Next.js → `vercel-react-best-practices`；元件 API → `vercel-composition-patterns`；不明原因錯誤／效能 → `systematic-debugging`；N+1／慢查詢 → `sql-optimization-patterns`；視覺／互動 → `ui-ux-pro-max`；驗證有沒有真的動 → `webapp-testing`；宣稱修好前 → `verification-before-completion`。

---

## 改動範圍

**每一行改動都要能直接對應到使用者這次的需求，對應不到就不該出現在 diff 裡。**

- **動手前先把任務翻成一個自己驗得到的成功條件。** 「加驗證」→「對不合法輸入寫測試，讓它過」；「修 bug」→「先寫一個能重現的測試，讓它過」。**這是「不用逐項確認」的前提**：成功條件夠硬，才能自己把迴圈跑完；寫成「讓它能用」就只能一直回頭問人。固定邊界是「每個任務都要有一個自己驗得到的條件」，條件長什麼樣自己選。
- **只寫解決問題需要的程式碼。** 沒被要求的功能不先做；單一場合的東西不先抽通用層；沒人要求的「彈性」「可設定」不自己加；不可能發生的情況不先寫錯誤處理。兩百行能收成五十行就收。
- **只動必須動的地方。** 不順手「改善」旁邊的程式碼、註解或排版；不重構沒壞的東西；既有風格跟自己的習慣不同也照既有的走。**別人的東西不自己動，這裡沒有自由度。**
- **自己造成的孤兒自己清，別人留下的死碼只回報不刪。** 因為這次改動而沒人用的 import／變數／函式要清掉；無關的既有問題回報一句就好，要不要處理是另一次需求。

---

## 除錯方法

**原則三、四的落地：只有證據算數，而且查完要接到動作。**

- **先查證據，不靠記憶。** 第一個解釋只是假設，證據牴觸就換方向，不要重複沒被支持的修法。
- **使用者給的原因也是假設，不是結論。** 他自己也會判斷錯，這很正常。證據支持就往那邊修；不支持就直接說「查過了，不是這裡，實際上是 X」然後換方向，不要因為是使用者提的就一路鑽到底。
- **code 看得到的事就不准用猜的。** 在讀過相關 code 之前，不要先丟出「問題出在別層」的解釋（client 端、網路、資料庫、部署、快取……舉例而已，重點是這個動作本身）——那不是假設，是在迴避讀 code。**要主張問題不在 code，必須先把 code 這一側查乾淨，而且說得出查了什麼、排除了什麼。**
- **不要用名詞聯想平台。** 聽到一個技術名詞就跳到業界最常跟它綁在一起的平台去查配置，那是聯想不是查證。這個 repo 實際接了什麼、哪個是主、哪個只是同步目標，設定檔、環境變數跟 schema 裡都查得到——**說得出是從哪個檔案看到的**。
- **外部原因的猜測幾乎都指向使用者那一側**（他的瀏覽器、他的資料庫、他的部署、他的網路），實質內容就是「不是我寫的有問題，是你那邊有問題」。**就算沒那個意思，效果就是把責任推回去，而需求還原封不動留在那裡。**
- **僵持本身就是訊號。** 同一個解釋被反駁過兩次還在辯護，就已經在浪費使用者的時間——停下辯護，去讀 code。
- **分輪調查。** 拆成可證偽的假設，各訂最便宜的測試；一輪結束回頭看全部證據再定方向；抓到有把握的 root cause 就集中修，不開新支線。
- **診斷不是交付。** 就算原因真的落在外部，使用者要的仍是「問題解決、功能完成」，不是歸因報告。**每一次診斷都要接到一個動作**——自己修掉、自己繞過去、或明確講出「這段需要使用者做什麼，而我這邊能做的都做完了」。**沒有自由度的是停在解釋。**
- **動手前先定錨。** 講清楚問題、基準狀態、已知／未知、安全邊界；優先用便宜唯讀的方式驗證。查不到不代表沒問題——分清「真的沒事」跟「查的方法看不到」。

---

## 部署與語法檢查現況

**原則二的落地：本機驗得出來的事，一律在本機驗完才送出去。** 「先推上去看看會不會過」「先合看看會不會壞」不是作法，是拿使用者的錢做本機免費就能做的驗證。

- **絕不拿 Cloudflare 部署當語法檢查器。** `main` 一有 push 就自動觸發計費建置。順序永遠是：本機 `npm run check:syntax`（零成本、幾秒）→ 乾淨了才 commit／push。它抓不到全部問題，行為是否正確仍是 Agent 自己要再核對的責任。repo 內附 `.githooks/pre-push`，本機 `git config core.hooksPath .githooks` 設定一次就會自動擋——**機制保險，不是靠記得做。**
- **正式網站由 Cloudflare 連 `main` 自動建置部署。** 不手動觸發 GitHub Pages，不啟用 Vercel 備援，不額外重複觸發建置。
- **付費資源設定一律使用者決定**（ISR、DNS、R2、Durable Objects、Cloudflare 專案的 Git 連接、組建監看路徑、哪個專案是正式入口）。Agent 不主動查現況、不主動建議調整，被明確要求才操作、操作完回報。
- **組建監看排除路徑目前**：包括 `*`，排除 `AGENTS.md`、`.md`、`.githooks/**`、`node_modules/**`、`.git/`。Cloudflare 用 `*` 當萬用字元且 `*` 會跨過 `/`，沒帶 `*` 的是字面比對——所以 `.md` 對不到 `README.md`、`docs/*.md` 這些。名單由使用者維護，變了由使用者講。
- **三種情況無視排除名單一律建置**：push 含 20 個以上 commit、3000 個以上檔案變動、或零檔案變動。**這是晚 merge 的第二個成本。**
- **不要為了省部署資源把文件改動攢著、延後 merge 或繞路改別的檔案。** 同一 commit 夾帶程式碼當然還是會建置，照正常語法檢查流程走。
- **不要把 workflow 從 `workflow_dispatch` 改回自動觸發**，用到 macOS runner 的尤其貴，之前就因此堆高過用量。
- **部署量要維持在可控，因為那決定使用者敢不敢開 ISR。** ISR 關著時，分支暴增只燒儲存與建置；ISR 一開，同樣的行為會變成每次部署都在寫快取。部署量壓不回來，ISR 就只能一直關著——那不是技術決策，是被迫的。
- **資料安全不變。** 不因自動部署刪除 Supabase／Neon／Galaxy 資料；DB 修改核對正式 schema，遵守授權與資料保護檢查。

---

## Git 流程

**原則二、四的落地：沒收尾的東西，成本都由使用者付；沒進 `main` 的東西，對使用者等於沒發生。**

- **先授權才動手。** 純討論／研究不算授權；一旦授權就把任務做完。使用者撤回授權就停，只做必要善後。
- **動手前看 baseline。** 確認 `main` 現況與 `git status`，不要假設 checkout 是乾淨的。
- **分支有條件開，不是每次都開。** 大／多檔／有風險的開一條 `task/<purpose>` 或 `fix/<purpose>`，從頭用到驗證完；單純低風險的文件／設定修正直接進 clean `main`。**「有風險」的下限錨在真風險上：碰到 schema、auth／權限、付費資源，或任何會改變資料公開性的操作，一律算有風險。**
- **分支做完就收，合完就刪**（remote 與本地都刪）。兩三條線各掛一條分支是正常的，**不正常的是分支只進不出一路累積**——那不代表做了很多事，那是沒收尾。**而且分支不是免費的**：預覽部署預設對所有非生產分支生效，每推一條分支、每個 commit 都跑一次完整建置並留下一份產物。**一條分支的生命週期結束在 merge，不是結束在你不想管它了。**
- **盡早 merge，因為同時有兩三條 agent 線在跑。** 壓著不合，`main` 還是會往前，等到想合時已經差十幾二十個 commit，那時要做的不是 merge 而是重做。**這跟「本機驗完才送出去」不衝突，兩者不在同一層**：本機驗的是 Agent 自己跑的語法檢查，幾秒鐘，不是拿給使用者驗收；而「送出去」的單位是**一個功能完成**，不是一張 PR。實際順序是「功能做完 → 自己跑語法檢查 → 立刻合」。**沒有「等一下再合」這個選項。**
- **merge 失敗、部署失效是預期會發生的事，不是意外。** 差距越大越難修；趁小的時候合，失敗了還修得動。失敗就自己 rebase、自己解衝突、自己診斷——那是工程問題，不是回頭問使用者怎麼辦，更不是另開一條分支繞過去（那正是分支暴增的主因）。
- **PR 不是等使用者核准的關卡。** 它只是管理分支的手段。檢查做完就自己合。**開著 PR 等人看就是在瞎等**——使用者可能在忙、根本沒看到，PR 不會自己變成被核准。
- **扣著 PR 不只拖自己這條線。** 其他線等不到新基準、部署排隊、建置計費往上堆、通知信灌爆信箱。**不要假設「反正使用者會來 merge」——merge 不是他的工作。**
- **「改完了」＝進了 `main` 且部署跑起來，不是「PR 送出去了」。** 沒合進 `main`，使用者什麼都看不到，回報「我改完了」等於什麼都沒發生。**沒 merge 就不准回報完成**，最多回報「做到哪裡、卡在哪裡」。**Agent 沒有 Cloudflare 的查詢管道，查不到部署結果是常態不是例外**——不要每次再試、也不要為此停下來等；直接回報「已進 `main`，Cloudflare 部署結果未驗證」就是完整履行。**不准的是沒查到卻宣稱線上已經好了。**
- **任務中斷＝凍結，不是放著。** 標記 `FROZEN / NOT FOR MERGE`；不新開分支重做同一件事，不 `git reset --hard` 刪別人的東西。

---

## 交付與驗收

- **UI 設計是 Agent 自己的事，不是等使用者先畫好規格再發包。** 版面、層級、互動、視覺風格由 Agent 用設計類 skill 做出來；使用者只在結果出來後，用「符不符合使用習慣」給反應。
- **「框架」「架構」「品牌」「命名」是四個不同的詞。** **框架**＝使用者自己的領域概念／語意模型（像 time_trace 是 time_period 的集合），他講了算，實作不能讓它偏掉。**架構**＝技術怎麼寫，Agent 的工作，使用者不管。**品牌**＝對外代表概念的專有名詞（LOC、LunaRunes、管理選單名稱、主功能名稱、自創理論名稱），一個字都要使用者拍板。**命名**＝內部變數／欄位字面，換名字只要指同一個東西就不算問題。
  **真正的判準是「改了之後語意會不會變、框架會不會偏」，不是「字面有沒有動」**——品牌詞字面即語意，動一個字語意就變；變數名的語意不跟著字面走。拿不準的字，先問自己改完語意有沒有變。
- **UI 改動要給截圖，不要給文字描述或 ASCII art。** 用 `webapp-testing`（Playwright）實際跑起來截圖。
- **功能要真的動。** 靜態截圖、寫死的資料、沒接資料源的控制項不算交付；動態圖表要接真實查詢，換篩選條件會變。
- **CI 只檢查改動的程式碼**：語法／型別先過，再驗受影響的行為；不把重跑整個 repo 當儀式；中文用字不是通過與否的依據。
- **稽核抓到中／高風險缺陷直接修**，修完要有真的測試證據。
- **交付與部署驗證分開。** commit、CI、原始碼正確不代表線上已更新；無法確認部署完成就只回報「已進 main，部署結果尚未驗證」，不得宣稱線上成功。

---

## Skill 使用

- 討論／研究不等於可以動手改；一旦要求實作，就做完整個授權範圍。
- 每次任務開始先看 repo 跟 runtime 有哪些 skill；**skill 一律裝在 global，repo 內不放副本**（`.agents/skills/`、`.claude/skills/` 已移除）。一台機器、一個 repo、一個專案，裝一份就夠。
- 相關的 skill 要一起用（資料庫＋效能＋驗證），不要被單一 skill 的「只選 1–3 個」卡住跨領域組合。
- 主動用 `find-skills` 補能力，不用等到完全做不到；裝之前先查授權、維護紀錄、腳本內容。
- 新方法跟舊規則衝突就刪掉或鎖住舊的，不要兩套並存；使用者這次的指示優先於這份檔案。

---

## Skill 路由表

| Skill | Use it for |
|---|---|
| `brainstorming` | Brainstorm unresolved product choices; if goal/authorization already clear, skip ceremony. |
| `domain-modeling` | LOC terminology, Scope/Registry boundaries, glossary, ADRs. |
| `vercel-react-best-practices` | React/Next.js implementation and performance. |
| `vercel-composition-patterns` | Component API design, compound components. |
| `supabase-postgres-best-practices` | Any Postgres/Supabase schema, RLS, migration, performance work. |
| `sql-optimization-patterns` | N+1, slow SQL, aggregation, EXPLAIN. |
| `supabase` | Supabase Auth, Edge Functions, Realtime, Storage, CLI/MCP. |
| `ui-skills-root` | Selecting a small set of relevant UI skills. |
| `frontend-design` | Deliberate visual direction for new/reshaped UI. |
| `ui-ux-pro-max` | Layout, color, typography, UX review（附 `scripts/search.py`，路徑依 global 安裝位置）. |
| `design-taste-frontend` | Explicit public-page/app-screen redesign; use `references/app-screens.md` for admin screens. |
| `baseline-ui` | Quick spacing/hierarchy/typography polish. |
| `fixing-accessibility` | Keyboard access, ARIA, contrast, WCAG. |
| `fixing-metadata` | Page metadata, social previews, structured data. |
| `fixing-motion-performance` | Animation jank, layout thrashing. |
| `improve-ui` | Read-only UI audit + implementation plan. |
| `web-design-guidelines` | Read-only Web Interface Guidelines review. |
| `create-design-md` | Create/update `DESIGN.md` from evidence. |
| `component-canvas` | Interactive canvas of existing component variants. |
| `create-canvas` | Freeform canvas for exploring ideas. |
| `agent-browser` | General browser automation and testing. |
| `browser-use` | Direct CDP / logged-in-session browser control. |
| `seo-audit` | SEO audit/diagnosis. |
| `code-review-expert` | Security checklist reference; full review only when explicitly asked. |
| `find-skills` | Discover/install a skill for a real capability gap. |
| `skill-creator` | Create/edit/evaluate a skill. |
| `grill-with-docs` | Stress-test a plan via interview; also records ADRs. |
| `improve-codebase-architecture` | User-invoked architecture review only (`disable-model-invocation`). |
| `tdd` | Test-first development. |
| `triage` | Issue/PR triage. |
| `prototype` | Throwaway prototype for a design question. |
| `systematic-debugging` | Reproduce → trace root cause → fix minimally. |
| `webapp-testing` | Playwright verification before claiming a UI change works. |
| `verification-before-completion` | Fresh evidence before reporting done. |
| `mcp-builder` | Build/review an MCP server. |
| `handoff` | Compact a conversation into a handoff doc. |

上表是 global 裝了什麼的對照，沒裝的只能當參考讀，不要當成已安裝。**用不到的 skill 就不要裝**——每個 skill 的描述每次冷啟動都要讀，裝著不用就是每個 session 都在付那個錢。

---

## 完工檢查

- 檢查整份 diff（含 staged/unstaged/untracked），確認沒混進其他任務沒做完的東西。
- 針對改到的程式碼跑語法／型別檢查與實際行為驗證，不是只看能不能 build。
- 動態功能要拿真實／測試資料跑過，靜態畫面不算驗證。
- 確認這次改動沒讓更高優先層級變差（例如為了效能犧牲安全）。
- 結果真的有問題（壞、醜、半成品）就直接說清楚哪裡不行，不要讓使用者自己發現。
- Agent 之間交接講清楚：改了什麼檔案、CI／測試證據、卡在哪、下一步是什麼。
- `main` 更新後確認最終 Git SHA；不另行觸發 GitHub Pages 或 Vercel 部署。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
