# LOC Current Canon

**Version:** 0.8.31-rc  
**Author:** Lucas Oscar Wang 政德

## 1. Fixed identity

- **LOC／月典 — Language Architecture Framework**
- **LunaRunes／月之符文 — Symbolic Language**
- **Lucas Oscar Wang 政德 — Language Architect｜語言建築師**

LOC 是框架；LunaRunes 是具體符號式語言。LunaRunes 的特殊規則不得自動成為其他 Scope 的共同規則。

## 2. Current authority

Current implementation 以最新 main + Current Neon 為準。

- Route authority：Next filesystem。
- Deployment/navigation metadata：Scope registry。
- Data Scope mapping：silver.manage。
- Runtime canonical content：Neon canonical tables。
- LunaRunes runtime：silver.runes、silver.runes_etc。
- LunaRunes mother/source data 不因 UI、KM 或 Search 被反向改寫。

文件、KM、UI copy、Search result 與 analysis output 都不能建立第二份資料權威。

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

- 使用精準 SQL／Neon query。
- 先 COUNT／filter，再 OFFSET／LIMIT。
- 不 select all 後在 JS slice。
- Culture／Statistics／Search 遵守相同的分頁與精準查詢原則。
- 不建立第二份 corpus cache、ranking snapshot 或 projection 作 Current authority。

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

Statistics 即時計算 canonical data，可指定時間區間。work_count 不作為第二份 stored authority；排名與分布由 Current query 即時計算。

Multimedia 併入來源統計；無文字媒體與 YouTube 等可落入 Others 等來源分類，不另外製造一套媒體統計權威。

## 8. Search

Search 是精準詞／metadata query，不做 semantic rendering。

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

- 單卡：當張 Rune + 當次方向。
- 雙卡：因為 A，所以 B。
- 三卡：因為 1，但會有 2 的改變，所以 3。
- 五卡：因為 1、2，但會有 3 的變化，所以 4、5。
- OW3gs：
  因為（因為 1、2，變數 3、4，所以 5、6），所以（因為 7、8，變數 9，所以 10、11）。

OW3gs 第 7–11 張是核心判定層；1–6 提供造成現況的因與背景。

Draw Session 使用逐張 random；同一 session 內 Rune 不重複。抽牌 ritual 5 秒與逐次 random 是刻意保留的 Current 行為。

## 12. Neutrality

LunaRunes 可以描述符號式狀態；LOC 可以整理軌跡與變化。兩者都不替使用者作最終身份、價值或人生決定。

> 系統幫你看見軌跡，但不替你決定你是誰。
