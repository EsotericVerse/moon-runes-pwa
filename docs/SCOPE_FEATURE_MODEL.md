# Scope × Feature Model

## Canonical rule

**Scope × Feature → Page Composition**. Scope is a hierarchical/composable data boundary, not a hard-coded website type. Feature is a reusable processing/view model.

- Scope determines identity, display label, dataset/corpus, parent/children, readable references, ERA, governance state and authority.
- Feature determines shared UI/behavior/canonical feature copy.
- Parent Scope may aggregate descendants.
- `refs` may compose readable data across branches without transferring ownership.
- Governance write authority never follows aggregation or `refs` automatically.
- Homepages are Scope-specific compositions; common function pages are model-driven.

## Current examples

`LOC × Context → 所有脈絡`; `LOC × Statics → 所有統計排行榜`; `LOC × Culture → 所有文化`; `LOC × Search → 所有搜尋`.

`LunaRunes × Context → 月之符文脈絡`; the same Feature Model is used with LunaRunes data.

A hierarchy may continue indefinitely. Example:

```text
LunaRunes
├─ 靈魂
├─ 連結
├─ 生命
├─ 自然
│  ├─ 樹
│  ├─ 花
│  ├─ 葉
│  ├─ 草
│  ├─ 根
│  ├─ 種
│  ├─ 實
│  └─ 枝
├─ 礦物
├─ 元素
├─ 定序
├─ 無序
└─ 系統特別
```

Thus `自然 × Statics → 自然統計排行榜`, using the same statistics feature and only the Natural Scope plus its governed descendants.

## LunaRunes homepage and Duel example

The LunaRunes homepage exposes only the rune atlas and Duel entry. Shared Context/Statics/Culture/Governance/Search remain available through NAV and the Feature Model.

```text
LunaRunes
├─ list                 符文圖鑑
└─ duel                 玩法入口
   ├─ one               單卡
   ├─ daily             每日
   ├─ two               雙卡
   ├─ three             三卡
   ├─ five              五卡
   ├─ ow3gs             11 卡 OW3gs
   └─ fight             卡牌拓展桌遊
```

## Administration

A new Scope is a registry/model operation, not five copied pages. Minimum creation fields are Chinese name, English name, input/Scope id and manager homepage. Parent and cross-reference relationships may then place the Scope in the hierarchy/graph.

Homepage text editing is deliberately narrow: only the five common feature-copy items (Context, Statics, Culture, Governance, Search) are editable as canonical shared copy. Structure, ownership, authority, aggregation and route semantics are governance/model data, not free-form page copy.
