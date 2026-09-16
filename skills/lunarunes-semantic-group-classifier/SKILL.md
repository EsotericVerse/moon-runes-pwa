# lunarunes-semantic-group-classifier

## Purpose
Apply current LunaRunes semantic governance to text without external APIs. This is a principle-based semantic classifier, not literal rune/keyword counting and not a numeric-weight classifier.

LunaRunes is the built-in reference implementation of LOC governance: LOC demonstrates how a language/culture can define a small set of explainable semantic rules; other systems may define different rules.

## Governance scope
This Skill produces a LunaRunes semantic projection only. LunaRunes Canon governs LunaRunes; it does not judge another culture, language system, author system, or symbolic system.

## Non-negotiable constraints
1. No external API calls.
2. Rune characters and keywords create candidates only; literal hits are not sufficient by themselves.
3. No numeric semantic weights.
4. Multiple runes are allowed when multiple meanings genuinely remain.
5. Group metadata is derived after rune resolution; do not force a unique group before semantic judgment.
6. Do not grow a keyword-to-rune exception dictionary; generalize repeated behavior into principles.
7. Current Canon overrides historical meanings; never rewrite Base66 from classifier output.

## Core semantic operations
### AND — semantic coexistence
時空 → 時 + 空; 風向 → 風 + 向; 明火 → 明 + 火.

### PLUS — added semantic dimension
天時 → 時 + 緣. The time meaning remains and suitable timing/conditions is added.

### OVERRIDE — complete/specialized meaning
時辰 → 辰; 清明 → 辰; 日月當空 → 明. Complete governed meaning takes precedence over mechanical character splitting.

### DEFER — defer literal candidate
日、月 are specialized Canon meanings. 日蝕 → 日; 月蝕 → 月; 日期 → 時; 日月 meaning 歲月／一段時期 → 辰. DEFER replaces large negative/exclusion lists.

## Semantic boundaries
- 時: time itself, time rules, scale, duration and measurement.
- 辰 (Phase): periods, phases and solar terms.
- 緣 (Karma): suitable intersection created by time plus conditions/events/people; not a bare time point and not fatalistic predestination.
- 誤 (Error): error in information, understanding or judgment. 延誤 is not 誤 merely because the character appears.
- 日: 日蝕 semantics; ordinary 日 is deferred.
- 月: 月蝕／月蝕陰暗面 semantics; ordinary 月 is deferred.
- 水 = Water; governed flow belongs to 氣.
- 氣 = Air; 暗 = Shadow; 空 = Space; 無 = Blank; 虛 = Void; 玄 = Chaos, never Mystery.

## Author Governance — 德 (0)
德 is retained outside the 66-rune draw pool and is governance-assigned, not literal-character-assigned. Current Author-managed terms: 微月光、人生月台、斜教、OW3gs → 德. Author Scope must actually be satisfied; unrelated names or ordinary uses do not inherit this classification.

## Classification method
1. Read the complete expression and surrounding context.
2. Identify semantic role and subject when needed for disambiguation.
3. Collect literal/keyword matches only as candidates.
4. Resolve complete words/phrases before individual characters.
5. Apply AND / PLUS / OVERRIDE / DEFER.
6. Apply current rune semantic boundaries.
7. Apply the small set of stable Governance-retained meanings only when scope is satisfied.
8. Return every rune whose semantics genuinely remain.
9. If unresolved, preserve dispute/ambiguity instead of inventing a score or forced winner.

Core rule: if the actual semantic meaning is present, classify it. If only the literal character is present but the LunaRunes meaning is absent, do not classify it. A governed complete meaning takes precedence over mechanical character splitting.

## From exceptions to principles
When a new case appears, first test AND, PLUS, OVERRIDE, DEFER, existing semantic boundaries, or a reusable new boundary. Only stable meanings that cannot be derived from general rules become retained Governance phrases. Examples and disputes are calibration data, not the primary lookup table.

## Output
Return structured results containing text, runes, groups, semantic_hits with operation/pattern/reason/rule, candidates, deferred, disputed, ruleset_version and api_used. A semantic unit may contain zero, one or multiple runes.

Aggregate statistics count resolved semantic hits after classification. They must not count raw rune-character/keyword occurrences as equivalent semantic hits.

## Relationship to LOC
Text → Complete semantic units → Candidate evidence → LunaRunes semantic principles → Resolved rune semantic hits → Context / Search / Statistics → ERA / Culture comparison.

LOC Governance establishes the method: basic, explainable, repeatable semantic principles. LunaRunes demonstrates one concrete implementation. Statistics consumes classifier results; Culture compares those results across historical ERA boundaries. Culture is descriptive/historical and does not predict the future.

## Authoritative source
Use the current LOC/LunaRunes Canon and later explicit governance decisions. Historical documents, old keyword rules, old unique-group requirements, numeric distributions, and downstream generated indexes must not override current Canon.
