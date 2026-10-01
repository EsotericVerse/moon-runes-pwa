# LOC｜Luna Codex

**Current version: 0.8.31-rc**

**LunaRunes — Symbolic Language**  
**LOC — Language Architecture Framework**  
**Lucas Oscar Wang 政德 — Language Architect｜語言建築師**

LOC 用來整理文字、作品、來源、時間、關係與分析結果。LunaRunes 是獨立的符號式語言實作；它的特殊語意規則只作用於 LunaRunes，不作為其他 Scope 的預設。

## Current architecture

- Next.js 負責應用與路由，React 負責 UI。
- Neon 是 Current runtime data SSOT。
- Next filesystem 是 route authority。
- Scope registry 只管理 deployment／navigation metadata，不取代 Neon 資料治理。
- silver.manage 提供資料 Scope 與 Galaxy／Time table mapping。
- Search、Statistics、Culture 一律以精準 Neon query 與分頁執行，不先全讀再切片。
- Search 是精準文字／metadata 查詢，不做語意渲染。
- 缺少一般 Scope 設定時維持空值；不得借用 LunaRunes 關鍵詞、Style 或 Canon 作 fallback。

## Deployment scopes

- LOC — https://loc.lo3rwang.cc/
- LunaRunes — https://lrunes.lo3rwang.cc/
- LunaRunes alternate mount — https://loc.lo3rwang.cc/lrunes/
- Author — https://loc.lo3rwang.cc/lo3rwang/
- Admin — https://admin.lo3rwang.cc/

Deployment Scope 與 data Scope 是不同責任。Current Neon managed data scopes 為 lo3rwang 與 lrunes；data table mapping 由 silver.manage 決定。

## Shared features

| Feature | Current responsibility |
| --- | --- |
| Statistics | 即時計算來源、分布、關鍵詞／Meta Tag 與時間區間統計 |
| Culture | 以 Time River 顯示交會時間、作品密度、來源分群與 Anchor |
| Governance | 公開治理說明與授權管理入口 |
| Search | Scope-aware 精準文字、metadata 與關係查詢 |

Daily、Rune Directory、Draw、Game 等屬 LunaRunes 自身功能，不提升為所有 Scope 的共同規則。

## Data rules

Galaxy 使用 uid 作為主識別。文字與多媒體分工：

- 有正文的作品存在 Galaxy。
- 純多媒體不製造空白正文；存在 Galaxy Media。
- media metadata／meta_tags 可參與 Search、Culture、Statistics。
- source_id 表示上層來源；target_id 可表示多值關聯；ref_id 表示參照。
- galaxy.url 保存原文連結。
- media 的 galaxy_link 連回 Galaxy；source_native_id 保存來源平台原生識別。
- 統計即時計算，不建立第二份 corpus authority、ranking snapshot 或 materialized content cache。

管理頁讀 canonical data，不因 public feature flag 或 Galaxy searchable=false 而把資料變成管理黑戶。

## LunaRunes

Current draw pool 為 66 符：

- 01–64：八個核心群組
- 65 玄 — Chaos
- 66 命 — Fate
- 第零符 德 — 作者基準符，不進抽取池

四方向固定為：正位、半正位、半逆位、逆位；資料庫方向碼為 1–4。

LunaRunes runtime canonical tables：

- silver.runes
- silver.runes_etc

抽牌只讀當次需要的 rune_id、direction、type，不預載無關方向。具體規則見 docs/LUNARUNES_DRAW_GOVERNANCE.md。

## Theme and UI

八組 Theme 都提供完整 palette，不互相繼承缺少的色彩 token。固定 UI copy 集中在 app/i18n/ui-copy.js；創作文字、Galaxy 內容與 LunaRunes Canon 不經 UI localization 改寫。

## Governance

> 系統幫你看見軌跡，但不替你決定你是誰。

Current 文件入口：

- docs/LOC_CANON.md
- docs/DOMAIN_ARCHITECTURE.md
- docs/NAV_GOVERNANCE.md
- docs/REPO_DIRECTORY_GOVERNANCE.md
- docs/LUNARUNES_DRAW_GOVERNANCE.md
- docs/RELEASE_ROADMAP.md
- docs/TODO.md
