# Rune Algorithm — LunaRunes Reference Semantic Classifier

Status: Canon-aligned reference implementation, 2026-09-16.

Rune Algorithm is the LunaRunes implementation of LOC principle-based semantic governance. It is not a universal classifier for every language or culture.

## Pipeline

`Corpus → complete expression recognition → candidate evidence → AND / PLUS / OVERRIDE / DEFER → Semantic Hits → Context / Statistics / Culture`

Keywords and literal rune characters are candidates, not final results. A semantic hit must include the rune, group, operation, matched expression and human-readable reason. Zero, one or multiple runes are valid. No numeric semantic weight is used.

## Core operations

- AND: both meanings remain. `時空 → 時 + 空`, `風向 → 風 + 向`, `明火 → 明 + 火`.
- PLUS: original meaning remains and another dimension is added. `天時 → 時 + 緣`.
- OVERRIDE: a stable complete meaning wins over mechanical character splitting. `時辰 → 辰`, `清明 → 辰`, `日月當空 → 明`.
- DEFER: literal candidates wait for the complete expression/context. `日蝕 → 日`, `月蝕 → 月`, `日期 → 時`, `日月（歲月／一段時期） → 辰`.

## Time boundary

- 時: time itself, time rule, scale or duration/measurement.
- 辰 / Phase: period, stage and solar term.
- 緣 / Karma: suitable timing created by the intersection of time and other conditions; not fatalistic destiny.
- 誤 / Error: error in information, understanding or judgment. `延誤` belongs to 緣 rather than 誤.

## Scope

`德` is Author Governance and never activates from a literal 德 character alone. Current retained Author Scope terms include `微月光`, `人生月台`, `斜教`, `OW3gs`.

## ERA and consumers

Formal LunaRunes ERA boundaries are `14 → 24 → 32 → 42 → 66`; 40 and 64 are RC transition states. Statistics consumes semantic hits after classification and compares ERA distributions. Culture describes historical formation, continuation, change, split, fade, return and oscillation; it does not predict the future.

The mother/Base66 source remains read-only. Rule changes are versioned in code/governance and the original corpus can be reclassified without rewriting source records.
