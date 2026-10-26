# Agent Instructions

> 第四輪：把每條規則砍到只剩「做什麼／不做什麼」，去掉理由鋪陳、例外的例外、重複強調。具體數字、表名、門檻值都保留（65535、符文 0–66、40/60/100 分等），因為那些是真正的驗收標準，不是文字理論。事急從權、1.1 RC 目前的狀態這類會隨時間過期、由你自己判斷的事，拿掉了，不寫進規則檔。如果發現少了你在意的細節，告訴我，我補回去。

## 目錄
1. [現況](#現況)
2. [優先順序](#優先順序)
3. [除錯方法](#除錯方法)
4. [Git 流程](#git-流程)
5. [交付與驗收](#交付與驗收)
6. [資料規則](#資料規則)
7. [Galaxy 存檔](#galaxy-存檔)
8. [Skill 使用](#skill-使用)
9. [Skill 路由表](#skill-路由表)
10. [完工檢查](#完工檢查)

---

## 現況

- Commit/merge 前跑 `npm run check:syntax` 當第一道關卡，但它不保證抓到所有語法問題（連基本的括號配對都可能漏掉），不能完全依賴它，改完還是要自己檢查。
- **ISR 已啟用，只能手動部署。** 不自動 build/deploy/Preview/Vercel cutover、不加 R2/DO 綁定、不為了驗證而跑部署。不刪 Galaxy/Supabase/Neon 任何資料。

---

## 優先順序

**Security ≫ Portable > Loading = UI > Code**，依情境判斷，不是鐵律排序；安全邊界永遠是硬限制，其他三層才看情況權衡；真的兩難就列選項讓使用者決定。

1. **Security：** 第三方 skill/package/MCP 用前，先看裡面實際寫了什麼（程式碼/腳本內容）。
2. **Portable：** 需要時自動去找現成的庫/skill/既有實作可以用。
3. **Loading = UI：** 效能/體感同等重要，互相權衡。
4. **Code：** 不主動做風格/架構 review；不要在不必要的地方隨興加上工程用註解。

**補充**
- 物件/功能要不要合併由我決定；不要自己預設「職責要分開」而卡住該合併的程式碼。

### Skill 對應優先層級
- **Security：** 新 skill/package → `find-skills`；auth/輸入輸出/密鑰相關 → `code-review-expert` 的 `security-checklist.md`（只當檢查清單用，不跑完整 review）；Postgres/Supabase schema → `supabase-postgres-best-practices`；Supabase Auth/Edge/Realtime → `supabase`；MCP server → `mcp-builder`。
- **Portable：** 寫新程式碼前先找既有實作；改 LOC 詞彙/Scope 邊界/ADR → `domain-modeling`。
- **Loading/UI：** React/Next.js → `vercel-react-best-practices`；不明原因的錯誤/效能 → `systematic-debugging`；N+1/慢查詢 → `sql-optimization-patterns`；元件 API → `vercel-composition-patterns`；視覺/互動 → `ui-ux-pro-max`；驗證有沒有真的動 → `webapp-testing`；宣稱修好前 → `verification-before-completion`。
- **Code：** 複用現成模式，不主動找重構。

---

## 除錯方法

- **先查證據，不要靠記憶判斷。** 規劃類問題查對話紀錄＋`todo.md`；程式問題查原始碼與測試。第一個解釋只是假設，證據牴觸就換方向，不要重複沒被支持的修法。
- **分輪調查，不要無限鑽。** 拆成幾個可證偽的假設，各自訂好最便宜的測試；一輪結束不管有沒有找到答案都要回頭看全部證據、重新判斷方向；抓到有把握的 root cause 就集中修，不再開新支線。
- **動手前先定錨。** 講清楚現在的問題、基準狀態、已知/未知、安全邊界；優先用便宜、唯讀的方式先驗證，要改動正式環境才需要走授權/備份。查不到不代表沒問題——分清楚「真的沒事」跟「查的方法看不到」。
- 查不清楚時先做風險最小、可逆的處置，不要瞎猜答案結案。

---

## Git 流程

- **先授權才動手。** 純討論/研究不算授權；一旦授權，自己把任務做完，不用每步都問。使用者撤回授權就停，只做必要的善後。
- **動手前看 baseline。** 確認 `main` 現況、`git status`，有沒有改到一半、沒回朔乾淨的程式碼留在那裡，不要假設 checkout 是乾淨的。
- **分支：有條件用，不是每次都要開。** 大/多檔/有風險的任務開一條 `task/<purpose>` 或 `fix/<purpose>`，從頭用到驗證完，不要每個子步驟都開新分支；單純、低風險、自我完整的文件/設定修正可以直接進 clean `main`。
- **任務中斷＝凍結，不是放著。** 標記 `FROZEN / NOT FOR MERGE`，記下可復原的 commit 與未完成項目在 `todo.md`；不要新開分支重做同一件事，不要 `git reset --hard` 刪別人的東西。
- **main 已經髒了要主動修，不是只防未來。** 對比最後一個正常版本，分清楚哪些 commit 是誰的，`git bisect` 找問題，在一條隔離分支上修好、驗證、再合併；不要在壞掉的合併上繼續疊補丁。
- **`todo.md` 保持最新：** 分支/PR、進度、卡點、下一步；完工就更新成 `MERGED / CLOSED`（刪不了分支就標 `MERGED / NEVER REUSE`）。
- **Merge 跟部署永遠分開，部署由使用者決定時間跟目標。** 程式碼驗證過就合併進 `main`，不用等部署；合併了不代表已經上線，也不代表可以自動部署。

---

## 交付與驗收

- **功能要真的動，不是外觀像而已。** 靜態截圖、寫死的資料、沒有真正接資料源的控制項不算交付；動態統計圖要接真實 RPC/查詢，換篩選條件會變。
- **CI 只檢查改動的程式碼**：語法/型別先過，再驗證實際受影響的行為；不重跑整個 repo 的測試當儀式；中文用字不是判斷通過與否的依據。
- **TODO 打勾 ≠ 使用者已驗收。** Agent 自己驗證整個功能可用才能標完工；使用者是驗最終體驗，不是一條條 TODO 簽收。
- **1.1 發布前要跑完整的可用性驗收：** Culture/Statistics/Traces/Search 連續操作五分鐘，一般動作要在五秒內有正確回應；單人 = 40 分（最低門檻），10 人同時在線 = 60 分（過關標準），100 人同時在線 = 100 分（最高目標）；沒有測試環境就老實記「尚未驗證」，不能用 CI 或程式碼檢查代替實測。負載測試不能拿來當理由恢復 ISR 或自動部署。
- **1.1 正式 release 門檻：** Guest + Admin 流程都測過、中高風險缺陷修完、依賴套件稽核乾淨、RLS/Edge 邊界確認過、iOS 相關路徑確認過，才能發正式版。`MaxRows`/`DB_QUERY_BATCH_SIZE` 固定 **65535**，不要跟 UI 分頁大小搞混，不能未經同意調整。
- **稽核時抓到中/高風險缺陷直接修，不用再問一次**；修完要有真的測試證據，不是改完就算。

---

## 資料規則

**關鍵字 Class／Rune**
- Rune 是 0–66 共 67 個固定符文，`符文66` 只是其中一個已核准的 Class，不是其他 Class 的格式規範。
- 目前只核准 `符文66` 這個 Class；自動產生的 Music/Pop/… 等 Class 已被拒絕，不要重建。
- 一個 Scope 同時只有一個 `current_keyword_class_id`；底下最多 8 個 `class_group`，9 是沒分類時的預設值。

**Trace 空間地址**
- Facebook JSON/打卡紀錄是主要地名來源；ZIP 裡的照片 EXIF 只是補充證據，不能取代打卡紀錄，也不能把 GPS 誤接到不相關的貼文上。
- 空間錨點只需要名稱，不需要縣市/樓層/郵遞地址；沒有樓層選擇器，也不做付費地理編碼。
- `silver.lo3rwang_trace`、`silver.lrunes_trace` 沒有縣市或樓層欄位，舊的縣市/樓層遷移腳本視為歷史，不要重新啟用。

**Empty-Scope**
- 一個 Scope 四張表（galaxy/galaxy_media/time/keywords）全部是 0 筆也是合法狀態，不需要任何資料才能打開 Culture/Statistics/Search/Trace；空狀態要顯示中性的「沒有資料」畫面，不是 400/500 錯誤，也不要自動生假資料。

**資料庫契約**
- **Supabase 是唯一權威資料庫；Neon 只是可能落後的備份**，只有明確授權的一次性鏡像任務才去動它，平常不用同步。
- `silver.manage` 是唯一的帳號/路由/權限表；`silver.loc` 是 LOC 設定表；`silver.loc_config`、`silver.scope_registry` 已退役，不要再當成權威來源用。
- 改 schema 前先看現有 Supabase 物件跟實際呼叫端，不要只憑舊的 migration/註解判斷現況；刪除退役物件造成的 404/錯誤要當成相容性問題去查根因，不要用恢復舊表當權宜之計。
- 資料對比要比對實際記錄內容，不是只比數量一樣就算一致。

---

## Galaxy 存檔

- 使用者的實質設計決策值得存成 Galaxy 文件，但**每次新建或更新都要先讓使用者看草稿、明確同意才能寫**；討論過、同意「這主意不錯」不算同意存檔。
- 存檔前先查有沒有既有同主題文件，優先更新而不是重複建立；保留誰是決策者、誰是建議者的區別，不要把未實作的想法寫成已經上線。
- 寫完要回讀確認真的存進去了；存不進去就老實說「沒存成功」，不要默默改用 Markdown 或聊天記錄代替。
- 核准的設計同時存在 repo 的 `md/YYYY-MM-DD-<topic>.md` 跟 Galaxy 文章兩份，兩邊互相標註對方位置；沒有兩邊都確認寫入前，不要宣稱已同步。

---

## Skill 使用

- 討論/研究不等於可以動手改；一旦直接要求實作，就做完整個授權範圍，不用每步驟都問。
- 每次任務開始先看這個 repo 跟 runtime 有哪些 skill 可用；`.agents/skills/`、`.claude/skills/`、Global 裡同名的算同一個能力，不是分開裝了好幾套。
- 相關的 skill 要一起用（例如同時需要資料庫＋效能＋驗證），不要被單一 skill 的「只選 1–3 個」限制卡住跨領域的組合。
- 現有 skill/套件/既有實作都不夠時，才用 `find-skills` 去 skills.sh 找，裝之前先查授權、維護紀錄、腳本內容；發現能力缺口不等於可以直接裝。
- 使用者這次的指示優先於這份檔案；舊規則跟新指示衝突時，直接修正舊規則本身，不要疊加互相矛盾的新規定。

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
