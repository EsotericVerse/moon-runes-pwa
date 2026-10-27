# Agent Instructions

> 只留「做什麼／不做什麼」。資料規則、Galaxy 存檔、1.1 release 門檻這些會過期、屬於特定階段的細節，已整段拿掉；有幾條規則原本抄的是單一對話紀錄，不是真正通用的規則，也刪了。如果發現少了你在意的東西，告訴我，我補回去。

## 目錄
1. [現況](#現況)
2. [溝通節奏](#溝通節奏)
3. [優先順序](#優先順序)
4. [除錯方法](#除錯方法)
5. [Git 流程](#git-流程)
6. [交付與驗收](#交付與驗收)
7. [Skill 使用](#skill-使用)
8. [Skill 路由表](#skill-路由表)
9. [完工檢查](#完工檢查)

---

## 現況

- Commit/merge 前跑 `npm run check:syntax` 當第一道關卡，但它不保證抓到所有語法問題（連基本的括號配對都可能漏掉），不能完全依賴它，改完還是要自己檢查。
- **正式網站由 Cloudflare 自動建置、部署。** Cloudflare 連結 GitHub `main`；Agent 完成必要檢查並推送／合併 `main` 後，由 Cloudflare 自動 Build / Deploy。不要求使用者每次手動部署，也不以舊的手動部署限制阻止已完成的程式交付。
- **平台分工。** GitHub Pages 的手動 `workflow_dispatch` 不是正式網站部署或每次合併的必要關卡；不啟用 Vercel 備援部署，也不額外重複觸發 Cloudflare Build / Deploy。
- **ISR 已啟用。** Cloudflare 自動部署和 ISR／快取是不同責任；不得據此擅自改動 ISR、DNS、R2、Durable Objects 或付費資源設定。
- **資料安全不變。** 不因自動部署而刪除 Supabase／Neon／Galaxy 資料；資料庫修改仍要核對正式 schema，並遵守授權和資料保護檢查。

---

## 溝通節奏

- **講大步驟，不要逐項確認。** 一個功能、一個作法，交代清楚「要做的大步驟」＋「這個作法連帶會影響到的範圍（哪些檔案／功能／風險）」就動手；不要把任務拆成幾十個小步驟，每一步都停下來問「這樣可以嗎」。總工程可能有上百項，但不用一條一條列出來討論，使用者要的是方向對不對，不是逐行審查。
- **授權範圍內的小步驟自己判斷，不用一步一報。** 已經同意做的事，裡面要改哪個檔案、哪一行、哪個設定，自己執行完，不用每個小動作都先問一次；只有真的卡住、牽涉不可逆或結果有疑義的決定，才停下來問。
- **回報也用大步驟講。** 做完後交代「做了什麼大動作＋連帶影響了什麼＋目前狀態／還缺什麼驗證」，不要列出一長串工程細節逐條說明；細節使用者想看時會主動問，不用先攤開。
- **精簡但完整，不要為了講清楚而拆細。** 拆太細既慢又耗 token；一句話講得完的大步驟，不用展開成三五句解釋。

**Security ≫ Portable > Loading = UI > Code**，依情境判斷，不是鐵律排序；安全邊界永遠是硬限制，其他三層才看情況權衡；真的兩難就列選項讓使用者決定。

1. **Security：** 第三方 skill/package/MCP 用前，先看裡面實際寫了什麼（程式碼/腳本內容）。
2. **Portable：** 需要時自動去找現成的庫/skill/既有實作可以用。
3. **Loading = UI：** 效能/體感同等重要，互相權衡。
4. **Code：** 不主動做風格/架構 review；不要在不必要的地方隨興加上工程用註解。

### Skill 對應優先層級
- **Security：** 新 skill/package → `find-skills`；auth/輸入輸出/密鑰相關 → `code-review-expert` 的 `security-checklist.md`（只當檢查清單用，不跑完整 review）；Postgres/Supabase schema → `supabase-postgres-best-practices`；Supabase Auth/Edge/Realtime → `supabase`；MCP server → `mcp-builder`。
- **Portable：** 寫新程式碼前先找既有實作；改 LOC 詞彙/Scope 邊界/ADR → `domain-modeling`。
- **Loading/UI：** React/Next.js → `vercel-react-best-practices`；不明原因的錯誤/效能 → `systematic-debugging`；N+1/慢查詢 → `sql-optimization-patterns`；元件 API → `vercel-composition-patterns`；視覺/互動 → `ui-ux-pro-max`；驗證有沒有真的動 → `webapp-testing`；宣稱修好前 → `verification-before-completion`。
- **Code：** 複用現成模式，不主動找重構。

---

## 除錯方法

- **先查證據，不要靠記憶判斷。** 查原始碼與測試，不要靠猜。第一個解釋只是假設，證據牴觸就換方向，不要重複沒被支持的修法。
- **分輪調查，不要無限鑽。** 拆成幾個可證偽的假設，各自訂好最便宜的測試；一輪結束不管有沒有找到答案都要回頭看全部證據、重新判斷方向；抓到有把握的 root cause 就集中修，不再開新支線。
- **動手前先定錨。** 講清楚現在的問題、基準狀態、已知/未知、安全邊界；優先用便宜、唯讀的方式先驗證，要改動正式環境才需要走授權/備份。查不到不代表沒問題——分清楚「真的沒事」跟「查的方法看不到」。

---

## Git 流程

- **先授權才動手。** 純討論/研究不算授權；一旦授權，自己把任務做完，不用每步都問。使用者撤回授權就停，只做必要的善後。
- **動手前看 baseline。** 確認 `main` 現況、`git status`，有沒有改到一半、沒回朔乾淨的程式碼留在那裡，不要假設 checkout 是乾淨的。
- **分支：有條件用，不是每次都要開。** 大/多檔/有風險的任務開一條 `task/<purpose>` 或 `fix/<purpose>`，從頭用到驗證完，不要每個子步驟都開新分支；單純、低風險、自我完整的文件/設定修正可以直接進 clean `main`。
- **`main` 是自動部署入口。** 有風險或未完成的程式留在工作分支，完成對應語法、行為、權限、資料檢查才合併；低風險獨立調整可以直接進 `main`。不要把半成品反覆推入 `main` 造成 Cloudflare 重複部署與費用。
- **任務中斷＝凍結，不是放著。** 標記 `FROZEN / NOT FOR MERGE`；不要新開分支重做同一件事，不要 `git reset --hard` 刪別人的東西。

---

## 交付與驗收

- **功能要真的動，不是外觀像而已。** 靜態截圖、寫死的資料、沒有真正接資料源的控制項不算交付；動態統計圖要接真實 RPC/查詢，換篩選條件會變。
- **CI 只檢查改動的程式碼**：語法/型別先過，再驗證實際受影響的行為；不重跑整個 repo 的測試當儀式；中文用字不是判斷通過與否的依據。
- **稽核時抓到中/高風險缺陷直接修，不用再問一次**；修完要有真的測試證據，不是改完就算。
- **交付與部署驗證分開。** `main` 提交成功後，由 Cloudflare 自動執行正式部署；能查到部署狀態／Logs 時主動核對並處理失敗。GitHub commit、CI 或原始碼正確，不代表線上已更新；無法確認 Cloudflare 完成就只回報「已進 main，Cloudflare 部署結果尚未驗證」，不得宣稱線上成功。

---

## Skill 使用

- 討論/研究不等於可以動手改；一旦直接要求實作，就做完整個授權範圍，不用每步驟都問。
- 每次任務開始先看這個 repo 跟 runtime 有哪些 skill 可用；`.agents/skills/`、`.claude/skills/`、Global 裡同名的算同一個能力，不是分開裝了好幾套。
- 相關的 skill 要一起用（例如同時需要資料庫＋效能＋驗證），不要被單一 skill 的「只選 1–3 個」限制卡住跨領域的組合。
- 主動用 `find-skills` 去 skills.sh 找新方法來補充現有能力，不用等到完全做不到才找；裝之前先查授權、維護紀錄、腳本內容。
- 新方法確定要採用、跟舊規則/舊實作衝突時，直接刪掉或鎖住舊的，不要兩套同時留著；使用者這次的指示優先於這份檔案。

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
