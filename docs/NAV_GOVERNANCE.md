# LOC Navigation Governance

## One global NAV

全站只有一套正式 NAV：

- app/GlobalNav.jsx — global shell
- app/modular-v2/ScopeNavV2.jsx — Scope-aware renderer
- app/modular-v2/scope-registry.v2.js — deployment/navigation metadata

Page-local menu 不算第二套 NAV。

## Authority split

- Next filesystem：route authority。
- Scope registry：canonical domain、mount、shared feature URL 與 navigation metadata。
- silver.manage：data Scope／table mapping。
- Neon canonical tables：資料內容。

Registry 不管理資料表真相，也不替 Neon 再建立一份 Scope data registry。

## Current deployment scopes

- loc — loc.lo3rwang.cc
- lunarunes — lrunes.lo3rwang.cc
- lunarunes alternate mount — loc.lo3rwang.cc/lrunes
- lo3rwang — loc.lo3rwang.cc/lo3rwang
- admin — admin.lo3rwang.cc

## Shared features

- Statistics / statics
- Culture / culture
- Governance / governance
- Search / search

Feature URL 由 registry builder 產生；是否存在由 Next route shell 決定。

## LunaRunes special routes

LunaRunes 可以在 registry 保存自己實際存在的特殊 routes，例如 game、list、duel/*、daily/*。

一般 Scope 不因 LunaRunes 有特殊 routes 就建立同樣 allowlist，也不建立 Scope ID grammar、reserved-word policy 或關鍵詞 fallback。

## UI copy

NAV fixed copy 使用 app/i18n/ui-copy.js。UI copy registry 不處理 Galaxy authored content 或 LunaRunes Canon。
