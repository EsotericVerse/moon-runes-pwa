# Agent Instructions

> 只留「做什麼／不做什麼」。資料規則、Galaxy 存檔、1.1 release 門檻這些會過期、屬於特定階段的細節，已整段拿掉；有幾條規則原本抄的是單一對話紀錄，不是真正通用的規則，也刪了。如果發現少了你在意的東西，告訴我，我補回去。
>
> **寫這份文件的風格：使用者給的是帶自由度的框架（方程式），不是算好的固定答案。** 任何一條規則寫「依情境判斷」「彈性處理」「自己判斷」的時候，必須同時講清楚哪一部分是固定不能動的邊界、哪一部分才是真的有自由度可以依狀況決定——不能只丟一句「這是彈性的」就沒有邊界，那樣不同的 AI session 冷啟動讀這份文件會各自發散出不同的解讀，不是只有這次對話裡的 Agent 看得懂就算數。之後任何人（或任何 AI）編輯這份文件，新增或修改規則時都要照這個風格寫。
>
> **對這份文件做「精簡」「重構」「去掉贅字」之類的整理時，動手前先列出這次會拿掉哪些具體內容（章節、規則、表格條目），不能用籠統的理由讓實質內容悄悄消失。** 精簡過的版本行數變少不代表安全，內容是不是真的不需要了，要能具體講出來，不是靠「看起來比較乾淨」這種感覺判斷。

## 目錄
1. [部署與語法檢查現況](#部署與語法檢查現況)
2. [溝通節奏](#溝通節奏)
3. [優先順序](#優先順序)
4. [除錯方法](#除錯方法)
5. [Git 流程](#git-流程)
6. [交付與驗收](#交付與驗收)
7. [Skill 使用](#skill-使用)
8. [Skill 路由表](#skill-路由表)
9. [完工檢查](#完工檢查)

---

## 部署與語法檢查現況

- **絕對不能讓 Cloudflare 部署當語法檢查器。** `main` 一有 push 就會自動觸發 Cloudflare Build/Deploy；如果 commit 裡還帶著基本語法錯誤（多一個 `{`、少一個括號之類），等於是拿一次會計費的正式部署去抓一個本來免費、幾秒鐘就能在本機抓到的錯誤——push 幾次、燒幾次部署資源，帳單就是這樣堆出來的，這是不能接受的浪費。正確順序永遠是：Agent 在本機 workspace 跑 `npm run check:syntax`（零成本、幾秒鐘），確認語法乾淨之後才 commit／push 到 `main`；不是先推上去，再靠部署失敗的 log 回頭抓語法錯。它不保證抓到所有語法問題（連基本的括號配對都可能漏掉），所以改完東西 Agent 還要自己再核對一次行為是否正確——這是 Agent 自己的責任，不需要使用者手動確認，也不該花到任何計費資源才發現。repo 裡另外放了 `.githooks/pre-push`，本機跑 `git config core.hooksPath .githooks` 設定一次，之後 `git push` 前會自動在本機跑一次 `check:syntax`，語法沒過直接擋下，不會送到會計費的那一步——這是機制上的保險，不是只靠 Agent 記得做。
- **正式網站由 Cloudflare 自動建置、部署。** Cloudflare 連結 GitHub `main`；Agent 完成必要檢查並推送／合併 `main` 後，由 Cloudflare 自動 Build / Deploy。不要求使用者每次手動部署，也不以舊的手動部署限制阻止已完成的程式交付。**Cloudflare 上可能同時存在不只一個專案連著同一個 repo；哪個專案是正式部署入口、ISR 開不開、要不要重連/斷開哪個專案的 Git，都是使用者自己決定跟操作的事，不是 Agent 該主動去查「現在狀態是什麼」然後動手調整——會變的現況不屬於這份文件，問使用者最新狀況就好。**


- **不要把 CI／建置相關的 workflow 觸發條件從手動（`workflow_dispatch`）改回自動（`push`／`pull_request`）**，尤其是用到 macOS runner（計費比 Linux 貴很多）的工作流程——這類工作流程一旦被設成自動觸發，會在短時間內重複執行、不知不覺堆高用量，之前就因此發生過。

- **資料安全不變。** 不因自動部署而刪除 Supabase／Neon／Galaxy 資料；資料庫修改仍要核對正式 schema，並遵守授權和資料保護檢查。

---

## 溝通節奏

- **「討論」跟「直接執行」是兩件不同的事，不要混在一起判斷。** 使用者連續講好幾句解釋概念、釐清框架、補充定義，是在「討論」——這段期間還沒有要 Agent 動手的意思，即使聽起來像在描述一個功能。「不要逐項確認」管的是授權範圍內動手之後的節奏，不是說使用者講完一段概念說明就等於下達了新的實作指令。沒看到明確的動手指示（像「做」「加上」「改」「這個功能也要」之類），又正在同一串概念釐清當中，就當作還在討論，不要自己接過去開始寫程式；真的不確定對方是在討論還是在下指令，先問一句就好，不要邊問邊已經動手改了。
**這跟〈Git 流程〉「先授權才動手」是兩件不同的事，不要併成一條**：「先授權才動手」管的是完全沒有得到授權就動手；這一條管的是另一種情況——討論這件事本身還沒結束、使用者還在講，不是授權存不存在的問題，是討論有沒有講完的問題。**這一條只管「這是不是一個動手指令」這一件事**，一旦確定已經進入執行階段，後面就回到〈講大步驟，不要逐項確認〉那套節奏，不要把這條讀成「執行中有任何小疑慮都要先問」。
- **使用者不需要先設計好框架、講完整步驟，細節設計是 Agent 的責任，不是使用者的。** 使用者會講需求、大方向、大概知道的架構/狀況，這樣就夠了；使用者不是萬能全才，不會天生知道所有細節，也不欠 Agent 一份完整的設計文件或逐步流程才能開工。缺的那塊——框架怎麼落地、步驟怎麼拆、技術細節怎麼選——是 Agent 自己該去查程式碼、查現有慣例、自己判斷補上的，不是反過來要求使用者講到鉅細靡遺才肯動；使用者講到他知道、在意的程度就是完整的，不夠的地方不是使用者的缺失，是 Agent 該自己填的空白。這跟使用者懂不懂技術無關，是顆粒度問題：使用者是技術背景，講概念/作法大方向完全聽得懂，不代表要講得更淺或要分階段確認每個小步驟（分工本身的判準見下面〈有疑問就問〉那條）。
- **講大步驟，不要逐項確認。** 一個功能、一個作法，交代清楚「要做的大步驟」＋「這個作法連帶會影響到的範圍（哪些檔案／功能／風險）」就動手；不要把任務拆成幾十個小步驟，每一步都停下來問「這樣可以嗎」。總工程可能有上百項，但不用一條一條列出來討論，使用者要的是方向對不對，不是逐行審查。
- **授權範圍內的小步驟自己判斷，不用一步一報。** 已經同意做的事，裡面要改哪個檔案、哪一行、哪個設定，自己執行完，不用每個小動作都先問一次。**執行中只有五種情況才停下來問，其他都不用**：1. 發現概念跟現實程式/資料衝突（不是純命名差異）；2. 撞到 MCP／工具授權牆，動不了；3. 臨時緊急狀況；4. **動作規模跨過門檻**——單一改動刪除／搬移超過 20 個檔案，或整個刪除一個現有的目錄／能力分類（即使自己判斷是「重複」「不需要」「會省成本」），先講清楚要刪什麼、為什麼，讓使用者看一眼再做；5. **AGENTS.md 本身的規則變更，如果緊接在一個未經確認的大動作之後、內容是在為那個動作背書**（把 Agent 自己剛做的決定寫成「既定規則」讓下一個 session 當成已核准的政策），一律算高風險，要先問，不能自己寫完自己生效。第 4、5 條管的是規模與不可逆性、以及文件會不會被拿來自我背書，不是概念清不清楚——就算「判斷得出來」也要停，不屬於「概念清楚就不用問」那條的例外範圍。概念本身的疑慮在討論階段就會先問清楚，進入執行階段後不會又冒出新的概念問題——除非真的發現跟講的不一樣。
- **要不要加新的規則、門檻、或機制（像這份文件裡的門檻數字、git hook 的偵測邏輯），用比例原則判斷，不要為了堵一個理論上的漏洞做出一個更大的洞。** 權衡的是「這個情境實際發生的機率、造成的傷害有多大」跟「機制變複雜、擋到多少合法/正常的工作」；傷害大但機率低、補洞的代價是常態性擋到合法工作，就不值得補——現有的其他層次（門檻、停下來問的條件、完工檢查的 diff 審查）已經先頂著，不是完全沒有防護。抓得準這個權衡就直接判斷、說明理由；抓不準才問。
- **使用者講過需求／架構／大概作法之後，不要再回頭逐一核對「概念是不是這樣」，也不要同一件事反覆問。** 使用者已經把目標、架構、大方向講清楚了，後面怎麼拆解、怎麼實作，是 Agent 自己該判斷、該負責的事；不要把使用者當成要逐項簽核的設計審查者，一直問「這樣對嗎」「這個概念是這樣嗎」。把使用者講的那段話當成完整、可執行的需求直接去做，做完再一次性交代結果；真的卡住、或發現使用者講的跟現實程式/資料衝突，才回頭問清楚那一個點，不是整個流程都要確認。使用者給過的概念就是判斷標準，拿去套用在後續所有類似情境——概念只需要講一次、講清楚，之後遇到同類狀況是把這個概念當方程式代入眼前狀況求解，不是每次又冒出同樣的疑問重新問一次；同一個疑問在使用者已經回答過之後還持續出現，代表沒有真的把概念吸收成判斷依據，是 Agent 自己該修正的地方，不是使用者解釋得不夠。
- **怕被亂改到其他東西，不是靠逐步問來防，是靠先畫範圍＋Agent 自己事後看 diff——不是要使用者看 diff。** 這份擔心是對的，但解法不是每個小細節都先問過才能動手，也不是把 diff 丟給使用者核對（使用者不是來看 code review 的）。大骨架是 Agent 自己判斷、自己講出來的——不是丟給使用者猜「這次大概會動到哪裡」；動手前 Agent 先講清楚「大骨架」——這次動的是哪些檔案/哪個功能範圍、大概會怎麼改；交付前的 diff 檢查是 Agent 自己的事（對照〈完工檢查〉），確認沒有混進其他任務沒做完的東西，查完直接說結果，不是把 diff 丟出來要使用者自己判斷。大骨架講清楚、Agent 自己把 diff 收尾查過，就不需要逐行監工式的確認。
- **使用者說的「檢查」，是看概念／架構／邏輯對不對，不是逐字核對命名用詞。** 像把欄位或變數從 `space_road` 改名成 `space_period`、或 `uid` 換成 `id`，單純換名字、換用詞，只要指的是同一個東西、邏輯沒變，不算問題。

- **「有疑問就問」的範圍限定在概念／方向本身不確定這一層，不是工程判斷，也不是靠「這是不是模組選擇」之類的類別來劃邊界。** 這是分工問題，不是使用者懂不懂技術、有沒有工程背景的問題——使用者就算懂概念、有技術背景，提需求是他的權利，工程判斷不是他的義務；方向/概念由使用者定，工程怎麼做由 Agent 負責判斷、負責扛，不要把自己的義務丟回去要使用者決定。**唯一、固定的判斷基準是：概念本身懂不懂，不是這件事影響大不大。** 概念不確定、跟現實衝突，問；概念清楚了，不管事情多大、多關鍵（包含模組選擇這類大方向決定、merge 失敗要怎麼處理、哪裡出錯要怎麼修），都是 Agent 自己查、自己判斷、自己決定、自己做——判斷得出來就不用問，問了只是把自己的義務丟回去要使用者決定；merge 失敗也是 Agent 自己該會診斷修復的工程問題，不是丟回去問使用者「怎麼辦」。**這條「判斷得出來就不用問」管的是概念/方向層級的疑慮，不涵蓋〈授權範圍內的小步驟自己判斷〉那條第 4、5 種情況（動作規模跨過門檻、或改動 AGENTS.md 本身在為自己剛做的事背書）——那是規模、不可逆性、跟文件自我背書的獨立門檻，即使概念再清楚、判斷再篤定，過線一樣要先講再做，這幾條不是互相取消，是管不同層面的事。**
**這不等於工程判斷要悶著做、不能讓使用者知道。** 判斷完、做完之後，都要讓使用者看得到做了什麼、為什麼這樣做，不是悶著做掉、使用者事後也不知道發生過這個決定；像「模組選擇」這種場景會出現列選項，是因為**使用者自己主動提了需求**（例如：「我想找進階搜尋的自動完成的模組，有沒有比較好用的？」——這是使用者主動徵詢建議/選型），Agent 本來就該針對這個問題給推薦、講優缺，這只是正常回答使用者提出的問題，不是 Agent 遇到工程決策點就該反過來丟選項問使用者。

- **不是每個 commit 都要回報／確認，回報／驗收的單位是「使用者提出的一個需求」，不是模糊的「大功能」。** 一個任務裡可能有好幾個、十幾個 commit，commit 是 Agent 自己工作的切分單位，不是跟使用者的溝通單位；不是由 Agent 自己判斷「這夠不夠大、算不算一個大功能」才回報，是使用者講出來的那個需求做完就回報一次、使用者就驗收一次——不管中間用了幾個 commit、語法檢查錯了幾次、改了幾次做法，那些都是 Agent 自己工作過程的事，跟要不要回報無關。一個需求裡面如果使用者又追加了新的子需求，那個子需求做完也算一次。
- **回報完不代表要停下來等回應，用大步驟講，不要製造不必要的中斷。** 回報是讓使用者知道做了什麼、結果如何，交代「做了什麼大動作＋連帶影響了什麼＋目前狀態／還缺什麼驗證」就好，不是丟出一個暫停點等對方確認，也不要列出一長串工程細節逐條說明——細節使用者想看時會主動問，不用先攤開。回報完如果還有後續工作（同一個需求的其他部分、或下一個已授權的任務），直接接著做，不要停在那邊等——沒有東西要使用者確認，停下來等於浪費雙方時間。真的需要停下來等，只限前面講的那五種情況。

**Security ≫ Portable > Loading = UI > Code**，
依情境判斷，不是鐵律排序，這四層的權重從來就不是固定公式，權衡本身就是 Agent 的工程判斷；安全邊界永遠是硬限制，其他三層才看情況權衡——權衡得出來就自己決定、做完回報，不是遇到三層衝突就反射性列選項讓使用者選。真的判斷不出來（連要優先什麼這個概念本身都不清楚）才問，判斷邏輯跟§溝通節奏「有疑問就問」那條一致。**安全硬限制的判斷基準是「一般使用者能正常使用這個產品」，不是理論上的絕對安全。** 像把防火牆全部關掉封死所有網路最安全，但產品就不能用了——那不是守護使用者，是本末倒置。要擋的是真正的風險（資料外洩、注入攻擊、未授權存取、金錢損失、不可逆的大規模刪除或資料流失），不是為了安全把東西弄到不能用；安全永遠優先這句話的意思是「遇到真風險就擋」，不是「什麼都往最極端的安全做」。
- **討論內容是什麼，就站在對應的角色判斷，不要用單一視角套所有情境。** 討論 UI 時站在設計者角度，美觀跟功能一起考量，不是只顧好看或只顧好用；討論系統時同時顧安全跟效能，不是只選一邊。這些角色、這些考量彼此不衝突，都可以權衡出平衡點——固定邊界是安全永遠優先（跟上面的排序一致），剩下的（美觀/功能、效能/其他架構考量）才是真正看情境取捨的自由度；真的抓不準怎麼權衡才問使用者，不是每次權衡都要先問。

- **Security：** 第三方 skill/package/MCP 用前先查授權、來源信譽、腳本內容；資料庫、憑證、auth、權限邊界相關程式碼該有的人工檢查不能因為想少寫程式碼就省略。
- **Portable：** 需要時自動去找現成的庫/skill/既有實作可以用。
- **Loading = UI：** 效能/體感同等重要，互相權衡。
- **Code：** 不要在不必要的地方隨興加上工程用註解。
### Skill 對應優先層級
- **Security：** 新 skill/package → `find-skills`；auth/輸入輸出/密鑰相關 → `code-review-expert` 的 `security-checklist.md`（只當檢查清單用，不跑完整 review）；Postgres/Supabase schema → `supabase-postgres-best-practices`；Supabase Auth/Edge/Realtime → `supabase`；MCP server → `mcp-builder`。
- **Portable：** 寫新程式碼前先找既有實作；改 LOC 詞彙/Scope 邊界/ADR → `domain-modeling`。
- **Loading/UI：** React/Next.js → `vercel-react-best-practices`；不明原因的錯誤/效能 → `systematic-debugging`；N+1/慢查詢 → `sql-optimization-patterns`；元件 API → `vercel-composition-patterns`；視覺/互動 → `ui-ux-pro-max`；驗證有沒有真的動 → `webapp-testing`；宣稱修好前 → `verification-before-completion`。

---

## 除錯方法

- **先查證據。** 查原始碼與測試，不要靠猜。第一個解釋只是假設，證據牴觸就換方向，不要重複沒被支持的修法。
- **分輪調查，不要無限鑽。** 拆成幾個可證偽的假設，各自訂好最便宜的測試；一輪結束不管有沒有找到答案都要回頭看全部證據、重新判斷方向；抓到有把握的 root cause 就集中修，不再開新支線。
- **動手前先定錨。** 講清楚現在的問題、基準狀態、已知/未知、安全邊界；優先用便宜、唯讀的方式先驗證，要改動正式環境才需要走授權/備份。查不到不代表沒問題——分清楚「真的沒事」跟「查的方法看不到」。
- **解法要跟問題同一層級，不能偷換成另一個問題。** 動手前先覆述一次「要解的是哪個問題、解法實際生效在哪一層」；如果解法所在的層級跟問題發生的層級對不上（例如問題是外部平台的建置設定，解法卻是刪 repo 裡的檔案），就不算已解決，不准先斬後奏——先把「解法為什麼打在同一層」講清楚，再動手；講不清楚就是還沒找到真正的解法，不是找到了可以先做。

---

## Git 流程

- **先授權才動手。** 純討論/研究不算授權；一旦授權，自己把任務做完，不用每步都問。使用者撤回授權就停，只做必要的善後。
- **分支：有條件用，不是每次都要開。** 大/多檔/有風險的任務開一條 `task/<purpose>` 或 `fix/<purpose>`，從頭用到驗證完，不要每個子步驟都開新分支；單純、低風險、自我完整的文件/設定修正可以直接進 clean `main`。

---

## 交付與驗收

- **UI 設計是 Agent 自己該做的事，不是要使用者先設計好、Agent 只負責發包執行。** 使用者不是設計專業、美學素養不是重點，他不會、也不需要先把版面/視覺怎麼改規劃出來交給 Agent 當「規格書」去實作——那是把使用者當成發案的客戶、Agent 當承包商在等規格，順序顛倒了。UI/UX 的設計判斷（版面、層級、互動、視覺風格）由 Agent 自己用現有的設計類 skill（`frontend-design`、`ui-ux-pro-max`、`baseline-ui`、`design-taste-frontend` 等）做出來，使用者只需要在結果出來後，用他在意的「符不符合使用習慣」去給反應，不用先畫、先想、先發包。
- **「框架」「架構」「品牌」「命名」是四個不同的詞，不要混用。** 使用者有 CSIE 背景、懂概念，講得很精確，Agent 寫規則時用詞也要跟著精確，不要自己把詞混在一起造成誤讀：
  - **框架**＝使用者自己的領域概念／語意模型（像 time_trace 是 time_period 的集合這種，他自己發明、定義的）。這是使用者在意、使用者講了算的東西，屬於〈優先順序〉和 `domain-modeling` skill 管的那一層；講過一次就算數，Agent 的實作/重構不能自己偷偷讓它跟使用者定義的框架脫鉤、跑掉、偏掉。過去真正出問題的地方是「實作沒跟上使用者講清楚的框架」，不是使用者沒講夠。
  - **架構**＝技術架構／演算法／程式怎麼寫（資料結構、查詢方式、元件怎麼拆、效能策略）。這是 Agent 自己的工作，使用者不在意、也不該被要求去設計這塊，跟 UI 視覺一樣。
- **UI 改動要給截圖，不要給 ASCII art 或工程註解。** 這種東西只能用「看」的來判斷，不是用文字描述、不是用 print 一行、更不是靠一堆工程用註解去想像畫面長什麼樣。UI 相關的改動，用 `webapp-testing` skill（Playwright）實際跑起來、截圖，把截圖交給使用者看，而不是用文字/ASCII 排版去交代介面改了什麼。
- **稽核時抓到中/高風險缺陷直接修，不用再問一次**；修完要有真的測試證據，不是改完就算。

---

## Skill 使用

- 討論/研究不等於可以動手改；一旦直接要求實作，就做完整個授權範圍，不用每步驟都問。
- 每次任務開始先看這個 repo 跟 runtime 有哪些 skill 可用；`.agents/skills/`、`.claude/skills/`、Global 裡同名的算同一個能力，不是分開裝了好幾套。
- 相關的 skill 要一起用（例如同時需要資料庫＋效能＋驗證），不要被單一 skill 的「只選 1–3 個」限制卡住跨領域的組合。
- 主動用 `find-skills` 去 skills.sh 找新方法來補充現有能力，不用等到完全做不到才找；裝之前先查授權、維護紀錄、腳本內容。
- 新方法確定要採用、跟舊規則/舊實作衝突時，直接刪掉或鎖住舊的，不要兩套同時留著；使用者這次的指示優先於這份檔案。**這條不是〈溝通節奏〉第 4 種停下來問情況的例外**——刪舊的這個動作如果本身跨過那條門檻（整個目錄/能力分類、或超過 20 個檔案），一樣要先講清楚要刪什麼、為什麼，再動手，不能用「新方法已經確定要採用」當理由跳過確認。

---

## Skill 路由表

| Repository skill | Use it for |
|---|---|
| `.agents/skills/brainstorming/SKILL.md` | Brainstorm unresolved product choices; if goal/authorization already clear, skip ceremony. |
| `.agents/skills/domain-modeling/SKILL.md` | LOC terminology, Scope/Registry boundaries, glossary, ADRs. |
| `.agents/skills/vercel-react-best-practices/SKILL.md` | React/Next.js implementation and performance. |
| `.agents/skills/vercel-composition-patterns/SKILL.md` | Component API design, compound components. |
| `.agents/skills/supabase-postgres-best-practices/SKILL.md` | Any Postgres/Supabase schema, RLS, migration, performance work. |
| `.agents/skills/sql-optimization-patterns/SKILL.md` | N+1, slow SQL, aggregation, EXPLAIN. |
| `.agents/skills/supabase/SKILL.md` | Supabase Auth, Edge Functions, Realtime, Storage, CLI/MCP. |
| `.agents/skills/ui-skills-root/SKILL.md` | Selecting a small set of relevant UI skills. |
| `.agents/skills/frontend-design/SKILL.md` | Deliberate visual direction for new/reshaped UI. |
| `.agents/skills/ui-ux-pro-max/SKILL.md` | Layout, color, typography, UX review (`python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>`). |
| `.agents/skills/design-taste-frontend/SKILL.md` | Explicit public-page/app-screen redesign; use `references/app-screens.md` for admin screens. |
| `.agents/skills/baseline-ui/SKILL.md` | Quick spacing/hierarchy/typography polish. |
| `.agents/skills/fixing-accessibility/SKILL.md` | Keyboard access, ARIA, contrast, WCAG. |
| `.agents/skills/fixing-metadata/SKILL.md` | Page metadata, social previews, structured data. |
| `.agents/skills/fixing-motion-performance/SKILL.md` | Animation jank, layout thrashing. |
| `.agents/skills/improve-ui/SKILL.md` | Read-only UI audit + implementation plan. |
| `.agents/skills/web-design-guidelines/SKILL.md` | Read-only Web Interface Guidelines review. |
| `.agents/skills/create-design-md/SKILL.md` | Create/update `DESIGN.md` from evidence. |
| `.agents/skills/component-canvas/SKILL.md` | Interactive canvas of existing component variants. |
| `.agents/skills/create-canvas/SKILL.md` | Freeform canvas for exploring ideas. |
| `.agents/skills/sleek-design-mobile-apps/SKILL.md` | Mobile screens in Sleek / React Native / HTML. |
| `.agents/skills/vercel-react-native-skills/SKILL.md` | React Native / Expo, native modules, mobile performance. |
| `.agents/skills/agent-browser/SKILL.md` | General browser automation and testing. |
| `.agents/skills/browser-use/SKILL.md` | Direct CDP / logged-in-session browser control. |
| `.agents/skills/remotion-best-practices/SKILL.md` | Remotion video/animation workflow router. |
| `.agents/skills/seo-audit/SKILL.md` | SEO audit/diagnosis. |
| `.agents/skills/code-review-expert/SKILL.md` | Security checklist reference; full review only when explicitly asked. |
| `.agents/skills/find-skills/SKILL.md` | Discover/install a skill for a real capability gap. |
| `.agents/skills/skill-creator/SKILL.md` | Create/edit/evaluate a skill. |
| `.agents/skills/grill-me/SKILL.md` / `grilling/SKILL.md` / `grill-with-docs/SKILL.md` | Stress-test a plan via interview; `grill-with-docs` also records ADRs. |
| `.agents/skills/improve-codebase-architecture/SKILL.md` | User-invoked architecture review only (`disable-model-invocation`). |
| `.agents/skills/tdd/SKILL.md` | Test-first development. |
| `.agents/skills/setup-matt-pocock-skills/SKILL.md` | One-time repo setup for engineering skills. |
| `.agents/skills/triage/SKILL.md` | Issue/PR triage. |
| `.agents/skills/prototype/SKILL.md` | Throwaway prototype for a design question. |
| `.agents/skills/hyperframes/SKILL.md` / `hyperframes-cli/SKILL.md` / `hyperframes-registry/SKILL.md` | HyperFrames video authoring, CLI jobs, component registry. |
| `.agents/skills/media-use/SKILL.md` | Media for HyperFrames videos; HeyGen needs user's own key. |
| `.agents/skills/systematic-debugging/SKILL.md` | Reproduce → trace root cause → fix minimally. |
| `.agents/skills/webapp-testing/SKILL.md` | Playwright verification before claiming a UI change works. |
| `.agents/skills/verification-before-completion/SKILL.md` | Fresh evidence before reporting done. |
| `.agents/skills/mcp-builder/SKILL.md` | Build/review an MCP server. |
| `.agents/skills/handoff/SKILL.md` | Compact a conversation into a handoff doc. |

這個 repo 另外內建 `systematic-debugging`、`sql-optimization-patterns`、`verification-before-completion` 的本地副本；同名的 Global 版本跟這份一樣算一個能力，不要自動同步或覆蓋。沒裝在 runtime 或 repo 的 skill 只能當參考讀，不要當成已安裝。

---

## 完工檢查

- 檢查整份改動的 diff（含 staged/unstaged/untracked），確認沒有混進其他任務沒做完的東西。
- 針對改到的程式碼跑語法/型別檢查與實際行為驗證，不是只看能不能 build。
- 動態功能要拿真實/測試資料實際跑過一遍，靜態畫面不算驗證過。
- 確認這次改動沒有讓它碰到的更高優先層級變差（例如為了效能犧牲安全）。
- 結果真的有問題（壞、醜、半成品）就直接說清楚哪裡不行，不要交出去讓使用者自己發現。
- Agent 之間交接要講清楚：改了什麼檔案、CI/測試證據、還卡在哪、下一步是什麼。
- `main` 更新後確認最終 Git SHA，並在可查詢時核對 Cloudflare 自動 Build／Deploy；不再另行觸發 GitHub Pages 或 Vercel 部署。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
