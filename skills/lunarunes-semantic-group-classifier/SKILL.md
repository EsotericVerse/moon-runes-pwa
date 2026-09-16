# lunarunes-semantic-group-classifier

## Purpose

Apply the current LunaRunes semantic governance to text without external APIs. This is a principle-based semantic classifier, not literal rune/keyword counting and not a numeric-weight classifier.

LunaRunes is the built-in reference implementation of LOC governance: LOC demonstrates how a language/culture can define a small set of explainable semantic rules; other systems may define different rules.

## Governance scope

This Skill produces a LunaRunes semantic projection only. LunaRunes Canon governs LunaRunes; it does not judge another culture, language system, author system, or symbolic system. Classification is descriptive and does not transfer LunaRunes governance authority to the source material.

## Non-negotiable constraints

1. **No external API calls.** Analyze supplied text with current Canon and local/project context.
2. **Semantic classification, not literal matching.** Rune characters and keywords create candidates only. A literal hit is never sufficient by itself.
3. **No numeric semantic weights.** Do not invent scores, normalized distributions, thresholds, or winner-by-weight logic.
4. **Multiple runes are allowed.** When multiple semantic meanings genuinely remain, keep all of them. Do not force a unique main rune.
5. **Group is derived from the resolved rune(s).** Group metadata may be reported after rune classification; do not force the text into one group before resolving its semantic rune meanings.
6. **Exceptions remain small.** Do not create a growing `keyword -> rune` exception dictionary. Repeated cases should be generalized into semantic principles where possible.
7. **Current Canon overrides historical LunaRunes meanings.** Never rewrite Base66 from classifier output.

## Core semantic operations

### AND — semantic coexistence

Use when multiple rune meanings remain genuinely present in the complete expression. Keep all resolved runes.

- 時空 → 時 + 空
- 風向 → 風 + 向
- 明火 → 明 + 火

### PLUS — added semantic dimension

Use when the original semantic meaning remains and the compound adds another governed semantic dimension.

- 天時 → 時 + 緣

### OVERRIDE — complete/specialized meaning

Use when the complete expression has a stable semantic meaning that should be classified as a whole instead of splitting its characters.

- 時辰 → 辰
- 清明 → 辰
- 日月當空 → 明

### DEFER — defer literal candidate

Use when a rune has a deliberately specialized Canon meaning and a literal character hit must wait for the complete expression/context.

日、月 are the primary current cases because LunaRunes defines them as eclipse semantics rather than ordinary sun/moon literals.

- 日蝕 → 日
- 月蝕 → 月
- 日期 → 時
- 日月, when meaning 歲月／一段時期 → 辰

DEFER replaces large negative/exclusion lists. Do not encode every non-eclipse 日/月 word as a separate exception.

## Semantic boundaries

- **時**: time itself, time rules, scale, duration and measurement. Examples include 日期、幾日、幾月、多久.
- **辰 (Phase)**: periods, phases and solar terms. Examples include 清明、節氣、時辰、時期、階段.
- **緣 (Karma)**: a suitable intersection created by time plus conditions/events/people. It is not a bare time point and not fatalistic predestination. 天時 → 時 + 緣. 遲到、延誤、錯過 may resolve to 緣 when the meaning is failure to meet the suitable timing/conditions.
- **誤 (Error)**: error in information, understanding or judgment. 誤解、誤判、錯誤資料 → 誤. Do not classify 延誤 as 誤 merely because the character appears.
- **日**: 日蝕 semantics; ordinary 日 is deferred.
- **月**: 月蝕／月蝕陰暗面 semantics; ordinary 月 is deferred.
- **水** = Water; flow belongs to 氣, not 水.
- **氣** = Air and governed flow semantics.
- **暗** = Shadow.
- **空** = Space.
- **無** = Blank / all possibilities.
- **虛** = Void.
- **玄** = Chaos, never Mystery; ordinary disorder does not automatically resolve to 玄.
- **誤** = Error.

## Author Governance — 德 (0)

德 is retained outside the 66-rune draw pool. It is governance-assigned, not literal-character-assigned. Do not classify text as 德 merely because 德 appears in a word or name.

Current explicit Author-managed retained terms:

- 微月光 → 德
- 人生月台 → 德
- 斜教 → 德
- OW3gs → 德

Author Governance is scope-specific. Another person or unrelated use of the same characters does not inherit the author's 德 classification.

## Classification method

For each semantic unit:

1. Read the complete expression and surrounding context.
2. Identify semantic role and subject where needed for disambiguation.
3. Collect literal/keyword matches only as candidates.
4. Resolve complete words/phrases before individual characters.
5. Apply AND / PLUS / OVERRIDE / DEFER.
6. Apply current rune semantic boundaries.
7. Apply the small set of stable Governance-retained meanings only when their scope is actually satisfied.
8. Return all runes whose semantics genuinely remain.
9. If unresolved, preserve the dispute/ambiguity and explain it instead of inventing a numeric score or forced winner.

Core rule:

> If the actual semantic meaning is present, classify it. If only the literal character is present but the LunaRunes meaning is absent, do not classify it. A governed complete meaning takes precedence over mechanical character splitting.

## From exceptions to principles

When a new case appears, first test whether AND, PLUS, OVERRIDE, DEFER, an existing semantic boundary, or a reusable new boundary explains it. If several cases reveal the same behavior, improve the principle rather than recording each output as an exception.

Only a stable meaning that cannot be derived from the general rules should become a retained Governance phrase. Examples and disputes are test/calibration data, not the classifier's primary lookup table.

## Output

Return explainable structured results. A semantic unit may contain zero, one, or multiple runes.

```json
{
  "source_id": "optional-source-id",
  "text": "天時",
  "runes": ["時", "緣"],
  "groups": ["秩序", "無序"],
  "operation": "PLUS",
  "disputed": false,
  "reason": "時間語義仍成立，完整詞同時增加適合時機與條件交會的語義。",
  "evidence": ["時: time", "緣: suitable timing/conditions"],
  "ruleset_version": "canon-2026-09-16",
  "api_used": false
}
```

For unresolved cases:

```json
{
  "text": "...",
  "runes": [],
  "groups": [],
  "operation": "DEFER",
  "disputed": true,
  "reason": "現有上下文不足以確認 LunaRunes 語義。",
  "candidates": ["..."],
  "ruleset_version": "canon-2026-09-16",
  "api_used": false
}
```

Aggregate statistics count resolved semantic hits after classification. They must not count raw rune-character/keyword occurrences as equivalent semantic hits.

## Relationship to LOC

```text
Text
  ↓
Complete semantic units
  ↓
Candidate evidence
  ↓
LunaRunes semantic principles
  ↓
Resolved rune semantic hits
  ↓
Context / Search / Statistics
  ↓
ERA / Culture comparison
```

LOC Governance establishes the method: basic, explainable, repeatable semantic principles. LunaRunes demonstrates one concrete implementation. Statistics consumes classifier results; Culture compares those results across historical ERA boundaries. Culture is descriptive/historical and does not predict the future.

## Authoritative source

Use the current LOC/LunaRunes Canon and later explicit governance decisions. Historical documents, old keyword rules, old unique-group requirements, numeric distributions, and downstream generated indexes must not override current Canon.