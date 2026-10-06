# LOC Current Canon

**Version:** 0.8.6-RC  
**Author:** Lucas Oscar Wang 政德

## 1. Fixed identity

- **LOC／月典 — Language Architecture Framework**
- **LunaRunes／月之符文 — Symbolic Language**
- **Lucas Oscar Wang 政德 — Language Architect｜語言建築師**

LOC 是框架；LunaRunes 是具體符號式語言。LunaRunes 的特殊規則不得自動成為其他 Scope 的共同規則。

## 2. Current authority

Current implementation 以最新 main + Supabase PostgreSQL 為準。

- Route authority：Next filesystem。
- Deployment/navigation metadata：Scope registry。
- Data Scope mapping：silver.manage。
- Runtime canonical content：Supabase PostgreSQL canonical tables。
- LunaRunes runtime：silver.runes、silver.runes_etc。
- LunaRunes mother/source data 不因 UI 或 Search 被反向改寫。

文件、UI copy、Search result、analysis output 與 audit 都不能建立第二份資料權威。

Current 不使用 KM。Current authority 僅以最新 main + Supabase PostgreSQL 為準；若未來重新引入 knowledge layer，也不得持有 route、table mapping、permission、keyword fallback、Registry metadata 或 Canon authority。

## 3. Shared features

Current shared features：

- Statistics
- Culture
- Governance
- Search

LunaRunes 的 Draw、Daily、Directory、Game 與 duel routes 屬 LunaRunes Scope。

## 4. Data architecture

Galaxy：

- uid 為 canonical record identity。
- 空白正文不是有效文字作品。
- 純多媒體進 media governance，不製造空白 Galaxy body。
- source_id 表示上層來源。
- target_id 可保存多值 target。
- ref_id 表示參照。
- galaxy.url 保存原文。
- media.galaxy_link 連回 Galaxy。
- source_native_id 保存來源平台原生識別。
- meta_tags 可參與 Search／Culture／Statistics。

Query：

- 使用精準 PostgreSQL query。
- 先 COUNT／filter，再 OFFSET／LIMIT。
- 不 select all 後在 JS slice。
- Culture／Statistics／Search 遵守相同的分頁與精準查詢原則。
- 不建立第二份 corpus cache、ranking snapshot 或 projection 作 Current authority。

### Scope mapping rule

一般 Scope 的 Search／Statistics／Culture／Management／Audit 必須先解析 Scope，再由 `silver.manage` 的 mapping 取得 Galaxy／Time table responsibility。不得把 `lo3rwang_*`、`lrunes_*` 之類具名 Scope table 寫成共用流程的固定依賴。

LunaRunes 專有 SSOT（例如 `silver.runes`、`silver.runes_etc`、`silver.game`）不屬一般 Scope mapping，維持其專有責任。

此規則是 0.9 Scope Group 化的前置條件：Scope Group 組合既有 Scope mapping，不新增第二套 table resolver 或 corpus authority。

### Scope copy governance

一般 Scope 的延伸採「先複製、再各自編輯」：新 Scope 從既有來源建立自己的資料副本後，後續修改只屬於新 Scope，不回寫、不污染原始 Scope 的語意與 canonical data。個人化發生在副本，不發生在來源本體。

LunaRunes 不屬一般可改寫模板。其 Rune 結構與 canonical semantics 不開放使用者自行更改；Current 階段僅因 canonical keyword library 整理而保留必要的作者管理修改入口。

Canonical content 的固定更新流程應由網站／管理介面直接完成。AI 分析可以作為外部輔助，但不作為重複、確定性資料更新的必要 write path，也不要求為既定規則反覆消耗 API key。

### Scope presentation and copy contract

一般 Scope 共用的 Culture／Statistics／Search 保持同一套功能名稱、操作方式與 query contract；建立新 Scope 不複製或改寫這些共用功能的程式邏輯，只把 Scope mapping 傳入共用模組。

Scope 首頁屬於該 Scope 自己的 presentation content。首頁文字、文字框與文字泡泡可由網站編輯器更新，修改只影響該 Scope。

Governance 頁在建立 Scope 時，從 Author／基準治理頁複製一份起始內容到新 Scope；之後由該 Scope 自己維護。任何個人化修改都只改副本，不回寫 Author／來源治理頁。

## 5. Management boundary

Management 必須能讀到 canonical records，即使 public feature 關閉或 searchable=false。

Public controls 只控制公開功能，不控制 canonical management visibility。

Galaxy 編輯後 UpdateTime 必須更新。

## 6. Culture

Culture 先用 Time data 找共同時間；多 Scope 比較使用 intersection，不使用 union。

取得交會範圍後，再對 Galaxy 做一次範圍聚合，形成來源分群與作品 uid list。作品內容以 incremental page 載入，不在建圖階段載全文。

Current general page size 為 10；Rune list contract 為 16。

Anchor suggestion 需要足夠資料；Current threshold 為至少 20 筆 eligible data。Suggestion 只提供候選，建立 Anchor 必須由使用者確認。

## 7. Statistics

Statistics 即時計算 canonical data。LOC Scope Group 固定最近一年並依 scope_id 顯示數量與密度；單 Scope 可指定時間區間。work_count 不作為第二份 stored authority；排名與分布由 Current query 即時計算。

Multimedia 併入來源統計；無文字媒體與 YouTube 等可落入 Others 等來源分類，不另外製造一套媒體統計權威。

## 8. Search

Search 是精準詞／metadata query，不做 semantic rendering。公開 Search 套用 searchable=true；OAuth 且具 Scope 管理權限時，該 Scope Search 不套 searchable filter。

Current Search 分成兩層：

- **PostgreSQL 深層查詢**：負責 SSOT、Scope、固定 eligibility filter、日期、權限、COUNT 與分頁；全域／跨作品查詢不得把完整 corpus 拉到前端再切片。
- **Rune66 keyword classification**：使用 `AND`、`TO`、`NOR`、`NAME` 規則。確認模擬結果後寫入文章目前的 Class／Group 屬性；關鍵詞變動時重新掃描。

Statistics 先套用資料列的 `statistics_able` 固定布林篩選。昂貴的反覆分類應改用經寫入驗證的數值彙總，避免每次載入全文；篩選與彙總資料仍以 PostgreSQL canonical tables 為準。

一般 Scope 不可在缺值時讀 LunaRunes keyword、positive_keywords、negative_keywords 或其他 Rune Canon 作 fallback。

## 9. LunaRunes structure

Current draw pool 固定為 66 符：

- 01–64：八個核心群組，每組八符。
- 65 玄 — Chaos。
- 66 命 — Fate。
- 第零符 德 — 作者基準符，不進一般抽牌。

LunaRunes 共九組責任：八個核心群組加特殊組。

四方向固定為：

1. 正位
2. 半正位
3. 半逆位
4. 逆位

Key fixed semantics：

- 43 水 — Water；水不等於流動。
- 流動核心屬氣。
- 65 玄 — Chaos；玄描述不可言喻／尚未辨識的規律，不等於虛。
- 虛表示完全混亂／失序／空缺。
- 玄逆位表示把原本不可言喻的規則逐步整合為可辨識秩序。
- 日指日蝕／預期事故／人為事故語意，不泛化為一般光明或時間。
- 月指陰暗面。
- 誤為 Error。

LunaRunes 已審定的 English name／comment 不因一般 UI localization 被改寫。

## 10. LunaRunes data

silver.runes 保存 Rune card canonical fields。  
silver.runes_etc 保存 lots／daily／history／harmony 等延伸資料。

抽牌與解讀只查當次需要的 rune_id、direction、type。不得為一張牌載入四個方向，也不得一次把所有 Rune etc data 載入後再切片。

「卡片月相」與「真實月相」是兩個不同欄位。卡片月相是 Rune canonical property；真實月相是當次時間情境。

## 11. Draw grammar

- 單卡、每日與符文圖鑑維持既有 canonical 字串與顯示。
- 雙卡以上的組合籤詩只使用實際抽到 Rune、direction 與該次真實月相精準命中的 `sit_q`；不得以 `sit_a`、direction text 或 rune_description 補句。
- 組句層只做薄連接，不建立第二套語意解釋；兩段可用「故」，三段末段依既有 x／y 趨勢只調整「遂／而／然」等轉接語氣。
- 雙卡以上不另輸出愛情／事業／關係／健康判語。
- 原有抽牌入口固定維持單卡、每日、雙卡、三卡、五卡、11 卡 OW3gs。
- 4／6／7／8／9／10 張由符文首頁的指定抽牌數量入口進入；抽牌上限固定 11 張。
- OW3gs 第 7–11 張仍是核心判定層；1–6 提供造成現況的因與背景。
- Draw Session 使用逐張 random；同一 session 內 Rune 不重複。抽牌 ritual 5 秒與逐次 random 是刻意保留的 Current 行為。
- 每日符文紀錄以 record_date 自己的真實月相取得當日 `sit_q／daily_r／daily_g／daily_b`；回看上一筆同符文時，也必須使用上一筆 record_date 的真實月相，不使用開頁當天月相替代。

## 12. Neutrality

LunaRunes 可以描述符號式狀態；LOC 可以整理軌跡與變化。兩者都不替使用者作最終身份、價值或人生決定。

> 系統幫你看見軌跡，但不替你決定你是誰。
