# lunarunes-semantic-group-classifier

## Purpose

Classify text into exactly one LunaRunes semantic group while preserving a full nine-way distribution and explicit dispute metadata.

This Skill is intended as a trial layer before the classifier is promoted into shared LOC runtime modules.

## Non-negotiable constraints

1. **No external API calls.**
   - Do not call external LLM APIs.
   - Do not call embedding APIs.
   - Do not require an API key.
   - Analyze the supplied text directly with the current LunaRunes semantic rules and available local/project context.

2. **Semantic classification, not literal rune matching.**
   - Do not classify a segment merely because a rune character or keyword appears.
   - Rune names, keywords and reverse keywords are evidence only.
   - Determine what the sentence or paragraph is actually about before assigning a group.

3. **Exactly one final group.**
   The final `group` must be one of:
   - 靈魂
   - 連結
   - 生命
   - 自然
   - 礦物
   - 元素
   - 秩序
   - 無序
   - 特殊

4. **特殊 is the default value.**
   - Start conservatively from `特殊`.
   - A general group must earn classification through sufficient semantic evidence.
   - Do not force text into one of the eight general groups just to increase coverage.

5. **Distribution is required.**
   - Estimate a relative nine-way distribution for every semantic unit.
   - The distribution preserves uncertainty; it does not create multiple labels.
   - Normalize the distribution to approximately 1.0.

6. **Close scores create a dispute record.**
   - If the top groups are semantically close, set `disputed: true`.
   - Still output one current `group`; keep `特殊` when evidence is insufficient.
   - Preserve alternative candidates and explain the conflict.
   - Do not discard disputed samples; they are governance data for later calibration.

7. **Thresholds are provisional.**
   - Do not claim a permanent Canon threshold.
   - Use qualitative judgment and, when useful, a temporary score-gap heuristic.
   - Mark uncertain cases rather than pretending false precision.

8. **Current Canon overrides historical meanings.**
   Apply current semantic governance, including:
   - 水 = Water, not Flow.
   - 流動 belongs primarily to 氣, not 水.
   - 氣 = Air.
   - 暗 = Shadow.
   - 空 = Space.
   - 無 = Blank / all possibilities.
   - 虛 = Void.
   - 玄 = Chaos, never Mystery.
   - 誤 = Error.
   - 辰 focuses on period; 時 on time; 緣 may carry timing/opportunity.
   - Do not map ordinary disorder automatically to 玄.

## Classification method

For each semantic unit:

1. Read the unit as a whole.
2. Identify its main subject and semantic role.
3. Distinguish literal wording, metaphor, modifier and actual semantic focus.
4. Compare the unit with the nine group domains.
5. Use the current rune Canon, Spec, keyword relations, reverse-keyword relations and exclusion rules as evidence.
6. Build a nine-way distribution.
7. Apply disambiguation and exclusions.
8. Select exactly one final group.
9. Mark disputes and retain alternative candidates.
10. Explain why the winning group was chosen and why nearby groups were not.

## Group subjectivity guide

These are first-pass group domains, not keyword lists. Always defer to current rune-level Canon when a boundary is unclear.

- **靈魂**: inner self, spirit, memory, boundary, personal domain, reflection, core.
- **連結**: direction and relationship operations such as connecting, maintaining, severing, separating, initiating, understanding and error in relation/context.
- **生命**: living-process experience, body/mind state, emotion, love, language and rhythm as lived experience.
- **自然**: growth and plant/natural-life structures such as root, seed, tree, flower, leaf, grass, fruit and branch.
- **礦物**: material/mineral structure, geology, hardness, pressure, rarity, crystal/mineral/solid-material properties.
- **元素**: elemental properties and actions of light, shadow, water, fire, wind, earth, thunder and air; obey rune-specific exclusions.
- **秩序**: observable or locatable structure involving sun, moon, star, period, clarity, time, space and cause.
- **無序**: uncertainty/non-linearity involving fortune, misfortune, blank possibility, dream, illusion, opportunity, void and result.
- **特殊**: safe default and special layer. Do not automatically equate `特殊` with 玄 or 命.

## Input

Accept either:

### Plain text

A paragraph, article, lyric, note or other text.

### JSON

If JSON is supplied, identify text-bearing fields and classify their textual content. Preserve source identifiers where available.

Example invocation concept:

```text
Use lunarunes-semantic-group-classifier on article.json.
```

## Output

Return structured JSON for each semantic unit and an aggregate summary.

Minimum per-unit shape:

```json
{
  "source_id": "optional-source-id",
  "text": "...",
  "group": "連結",
  "distribution": {
    "靈魂": 0.10,
    "連結": 0.41,
    "生命": 0.05,
    "自然": 0.02,
    "礦物": 0.02,
    "元素": 0.04,
    "秩序": 0.29,
    "無序": 0.03,
    "特殊": 0.04
  },
  "disputed": true,
  "candidates": [
    {"group": "連結", "score": 0.41},
    {"group": "秩序", "score": 0.29}
  ],
  "reason": "核心主體是關係脈絡，但同時具有明顯因果結構。",
  "evidence": ["relationship semantics", "context maintenance"],
  "exclusions": ["不是單純時間描述，因此不以秩序為主分類"],
  "ruleset_version": "trial-0.1",
  "api_used": false
}
```

Aggregate summary:

```json
{
  "analysis_mode": "lunarunes_semantic_group_classifier",
  "api_used": false,
  "ruleset_version": "trial-0.1",
  "unit_count": 120,
  "group_counts": {
    "靈魂": 0,
    "連結": 0,
    "生命": 0,
    "自然": 0,
    "礦物": 0,
    "元素": 0,
    "秩序": 0,
    "無序": 0,
    "特殊": 0
  },
  "disputed_count": 0,
  "disputed_units": []
}
```

## Governance behavior

- When a case is ambiguous, preserve the ambiguity instead of silently forcing a result.
- When a classification depends on a weak or provisional rule, say so.
- When a new recurring dispute pattern appears, recommend updating the semantic rules rather than patching individual outputs.
- Never rewrite Base66 meanings from classifier output alone.
- Treat disputed records as future calibration material.

## Relationship to LOC

This Skill is a modular first-stage classifier:

```text
Text
  ↓
Semantic units
  ↓
LunaRunes group classification
  ↓
Rune candidates
  ↓
Search / RAG / Graph / Evolution
```

The primary benefit is to reduce the search space before rune-level analysis while keeping the result explainable and governable.

## Authoritative principle document

Use `docs/LUNARUNES_SEMANTIC_GROUP_CLASSIFICATION.md` as the human-readable governing specification for this trial Skill.