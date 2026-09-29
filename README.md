# LOC｜Luna Codex

**LunaRunes — Symbolic Language**  
**LOC — Language Architecture Framework**  
**Lucas Oscar Wang — Language Architect｜語言建築師**

LOC 是用來整理語言、資料、脈絡、作品與時間關係的 Language Architecture Framework。LunaRunes 是 LOC 中的 Symbolic Language 實作。定位已固定，不因定位另外增加功能。

## Current / RC8 Stable Baseline

RC8 已於 2026-09-29 封板為目前 Current 的穩定候選基線。RC8 的工程邊界是收斂 Current：

- Neon Postgres 是 Current SSOT。
- 不使用 JSON／舊 JS／靜態檔作 Current authority 或 fallback。
- 不保留 LOC1–8 numbered runtime architecture。
- 不保留 compatibility facade、virtual data path loader 或第二套路由權威。
- 共用能力集中在模組，Feature/UI 不重造資料 transport、batch、validation 或 route 規則。
- 自動分析只偵測變化、提供建議，不替使用者定義事件意義。
- LunaRunes Game 已完成 RC8 前的圖形化與結構收斂：遊戲程式、文件與素材映射集中於 `app/lrunes/game/`，只讀取遊戲實際需要的 `silver.runes` 與 `silver.game`。

歷史差異由 Git history 保存，不在 Current tree 保留可執行舊架構。

RC8 baseline 與驗證紀錄見 `docs/RC8_BASELINE.md`。管理頁面仍需人工操作驗收；該驗收不改變 RC8 的資料與 runtime 基線，也不得以驗收修正為由重新引入已退役架構。

## Current Scopes

Current Scope registry 位於：

`app/modular-v2/scope-registry.v2.js`

目前核心 Scope：

- `loc` — 月典
- `lunarunes` — 月之符文
- `lo3rwang` — 作者
- `admin` — 治理管理

Scope ID、domain、mount 與顯示名稱分開治理；跨 Scope 可以讀取、引用與導航，但不因此取得對方治理權。

## Shared Features

Current 共用 Feature：

| Feature | Responsibility |
| --- | --- |
| Statistics | 排行、來源、風格、關鍵詞、Meta Tag 與時間比較等統計 |
| Culture | Time River、來源／風格／類型／地點的時間分布與機械式變化偵測 |
| Governance | 公開治理內容與管理入口 |
| Search | Scope-aware 文字、metadata 與關係線搜尋 |

Daily 屬 LunaRunes 的獨立功能，以 Calendar 為主，不使用 Time River。

## LunaRunes

月之符文目前為 66 符：

- 1–64：八組核心符文
- 65 玄 — Chaos
- 66 命 — Fate
- 0 德 — 作者自用，不參與一般抽牌

四方向：正位、半正位、半逆位、逆位。

主要抽牌：

- 單卡
- Daily
- 雙卡：因 → 果
- 三卡：源 → 轉 → 合
- 五卡：雙因＋意外＋雙果
- OW3gs：1–6 因的描述層＋7–11 果的判定層

## Data Architecture

```text
Feature / UI
    ↓
Domain repository / client
    ↓
Shared Neon repository / query policy
    ↓
Neon canonical tables
```

Current 不再經過：

```text
LOC_DATA
virtual path registry
app/loc/data.js
app/loc/data-paths.mjs
JSON runtime snapshots
legacy static JS runtime
LOC1–8 service/index builders
```

LunaRunes 一般功能的 canonical rune data 由 `app/loc/rune-repository.js` 作為薄 query boundary；Game 為獨立 feature，只讀取實際需要的 `silver.runes` 與 `silver.game`。四向文字由抽牌流程依 rune／direction／type 精準讀取 `silver.runes_etc`，不建立第二套符文資料。

## JavaScript Boundary

Current application JavaScript 放在 `app/` 對應模組內。

## Deployment

Current frontend：

- Next.js static export
- GitHub Pages
- main 直接部署
- 新 main deployment 會取代尚未完成的舊 deployment，避免高頻 commit 形成過期部署佇列

主要 deployment workflow：

`.github/workflows/deploy-pages.yml`

Current build gate 先驗證 RC contracts，再驗證 Neon public/batching contract，最後執行 Next build 與 Pages deploy。

## Main Modules

- FlexSearch — 文字索引、AND / NOR
- Recharts — Statistics
- vis-network / vis-timeline — Current graph / timeline visualization
- TanStack Query — query lifecycle
- Zod — feature/data contract
- Neon JS — Current data access

模組是否深化使用另行評估；RC8 不因模組能力新增不必要功能。

## Governance Root

> 鑑古知今，求同存異  
> 不在其位，不謀其政  
> 隨心所欲，而不逾己

## Public Entrypoints

- LOC: https://loc.lo3rwang.cc/
- LunaRunes: https://lrunes.lo3rwang.cc/
- Author: https://loc.lo3rwang.cc/lo3rwang/
- Admin: https://admin.lo3rwang.cc/

## Author

**Lucas Oscar Wang 政德**  
Language Architect｜語言建築師
