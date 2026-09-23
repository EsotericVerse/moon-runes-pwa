# 🌕 LOC｜月典（Luna Codex）

LOC（月典／Luna Codex）是一套**模型化語言框架（Modelized Language Framework）**，用來整理語言、資料、脈絡、作品與時間之間的關係。

LunaRunes（月之符文）是 LOC 的第一套 **Symbolic Language／符號式語言**實作；lo3rwang 則是作者個人資料與創作 Scope。

- **現行 Canon：1.0**
- **Web Build：1.0-RC6**
- **RC6 基線日期：2026-09-23**
- **公開網站：<https://loc.lo3rwang.cc/>**
- **LunaRunes：<https://lrunes.lo3rwang.cc/>**
- **作者：Lucas Oscar Wang 政德 / lo3rwang**

完整 RC6 工程基線見 [`docs/RC6.md`](docs/RC6.md)。

---

## Current Architecture

RC6 固定四個主要公開功能：

| 功能 | Current 責任 |
|---|---|
| **Context／脈絡** | Graph only |
| **Culture／文化** | Time River only |
| **Statistics／統計** | 圖表呈現，不自動分析、不下定義 |
| **Search／搜尋** | Scope-aware keyword / full-text retrieval |

另外保留 Governance、Semantic Playground，以及 LunaRunes 自身的抽牌／圖鑑／解牌功能。

Current 不再使用 LOC1–8 作為 runtime 架構、fallback、alias 或 registry key。

---

## Scope Model

Current 有三個主要 Scope：LOC、LunaRunes、lo3rwang。

每個 Scope 的資料權威彼此獨立。跨 Scope 可以讀取、引用、連結與導航，但不因此取得對方的治理權。

LOC Culture 不建立第三套獨立個人時期，而是聚合 LunaRunes 與 lo3rwang 的 Current 狀態並導向各自的 Time River。

---

## Governance Root

> 鑑古知今，求同存異  
> 不在其位，不謀其政  
> 隨心所欲，而不逾己

這 24 字是現行 Governance Root。

---

## Neon = Current SSOT

Current runtime 以 **Neon Postgres** 為 Single Source of Truth。

- 不以 JSON 作 Current 內容來源。
- 不建立 JSON fallback。
- 不讓舊靜態檔案反向覆寫 Neon。
- Scope 資料分層治理。
- 歷史資料可以保留，但不得污染 Current Canon。

正式導引表：

- `silver.system_table_catalog`
- `silver.system_data_principles`
- `silver.loc_scope_registry`
- `silver.loc_shortcut_routes`
- `silver.loc_home_shortcuts`

---

## Culture｜Time River

Culture 只顯示 **Time River**。RC6 採用「錨點所見即所得」：

- 主要錨點由使用者明確設定。
- RC 區可作為細部版本／轉折區域。
- Time River 直接依實際日期與錨點呈現。
- 不自動重切、不隱藏分頁、不做隱性推論。

可用欄位包括 `anchor_type`、`anchor_role`、`is_primary_anchor`、`is_rc_zone`。

---

## Statistics｜Charts only

Statistics 以 Recharts 顯示多種圖表，只呈現資料，不替使用者下結論，也不自動定義文字或文化意義。

RC6 新增：

- `silver.metric_snapshots`
- `silver.save_metric_snapshot(...)`
- [`docs/sql/metric-snapshots.sql`](docs/sql/metric-snapshots.sql)

網站讀取已計算好的 snapshot，不在瀏覽器重新掃描整個 corpus。Snapshot 以 `source_updated_at` 判斷來源是否變更。

---

## Context｜Graph only

Context 只負責關係圖。

- 每個 Scope 顯示自己的 Graph。
- 跨 Scope 節點可以導向另一個 Scope。
- 不在本 Scope 內展開、接管或重新定義其他 Scope 的 Graph。

LOC Context 目前只保留必要的 Scope 關係，例如 LOC → LunaRunes、LOC → lo3rwang。

---

## Search

Search 目前以 Scope-aware keyword / full-text retrieval 為主。

- Scope 命中優先。
- 不以舊 JSON 作資料來源。
- 不使用 retired LOC 編號作 Current 搜尋分類。
- 特別入口可直接導頁，不必繞成一般搜尋結果。

---

## LunaRunes｜月之符文

月之符文固定為：1–64 八組核心符文、65 玄（Chaos）、66 命（Fate）；第 0 符「德」為作者自用，不參與抽牌。

八組：靈魂、連結、生命、自然、礦物、元素、秩序、無序。

四方向：正位、半正位、半逆位、逆位。

抽牌模式：單卡、雙卡（因→果）、三卡（源→轉→合）、五卡（雙卡＋單卡＋雙卡）、OW3gs（1–6 因的描述層、7–11 果的判定層）。

LunaRunes 是符號式語言與參考實作，不是 LOC 本身的同義詞。

---

## lo3rwang

lo3rwang 是 **Lucas Oscar Wang 政德**的公開識別名稱。

主要公開職能：

- Language Governance Architect｜語言治理架構師
- Wordsmith｜文字工匠
- Calibrator｜校對者

對外合作定位為 **Language Consultant**。

---

## Current Routes

- LOC：<https://loc.lo3rwang.cc/>
- LunaRunes：<https://lrunes.lo3rwang.cc/>
- 作者：<https://loc.lo3rwang.cc/lo3rwang>
- Context：<https://loc.lo3rwang.cc/context>
- Culture：<https://loc.lo3rwang.cc/culture>
- Statistics：<https://loc.lo3rwang.cc/statics>
- Search：<https://loc.lo3rwang.cc/search>
- Governance：<https://loc.lo3rwang.cc/governance>
- Semantic Playground：<https://loc.lo3rwang.cc/game>

---

## Technology

Frontend：Next.js 16、React 19、React Query、Recharts、vis-network、vis-timeline。

Data / Governance：Neon Postgres、Zod、Casbin、FlexSearch。

```text
Neon SSOT
   ↓
Scope authority
   ↓
Shared feature modules
   ↓
Page Composition
   ↓
UI / Search / Graph / Statistics
```

---

## RC6

RC6 是 Current 架構基線，不是單純功能版本。它固定 Scope 邊界、Neon SSOT、Context＝Graph、Culture＝Time River、Statistics＝Charts only、Search＝Scope-aware retrieval、Period 明確錨點／RC 區，以及 metric snapshots。

完整內容見 [`docs/RC6.md`](docs/RC6.md)。

---

## Historical Material

舊 RC 文件、舊 LOC1–8、Evolution、KM、舊 JSON registries、舊 HTML 架構與舊資料路徑可以作為歷史證據保留，但不代表 Current runtime，也不得作為 fallback 重新導入。

---

## License

本專案以 Copyleft 精神發布。原創程式、資料結構、月之符文與 LOC 內容鼓勵研究、使用、修改與衍生，同時應保留作者、來源、修改歷史與相容的共享原則。

完整說明見 [`COPYLEFT.md`](COPYLEFT.md)。

---

## Author

**Lucas Oscar Wang 政德**  
Language Governance Architect · Wordsmith · Calibrator

- Website: <https://lo3rwang.cc/>
- LOC: <https://loc.lo3rwang.cc/>
- GitHub: <https://github.com/EsotericVerse>

> LOC 始於一副牌，但不止於一副牌。
