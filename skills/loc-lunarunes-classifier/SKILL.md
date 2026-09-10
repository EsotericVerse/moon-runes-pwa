# LOC LunaRunes Classifier

## Purpose

Classify text-derived JSON records into the LunaRunes implementation of LOC using deterministic structure first.

This Skill is designed primarily for personal language digital-legacy archives: long-term text, works, media metadata, rules, and derived records that need a stable first-pass structure before semantic-vector or LLM analysis.

The classification method is based on the author's LOC system analysis and the LunaRunes symbolic language model. AI may execute, validate, or explain the rules, but the LOC1-8 mapping and LunaRunes grouping are defined system rules rather than model-generated taxonomy.

## Core principle

Use the smallest authoritative dataset possible.

For basic rune classification, `data/json/core/runes66.json` is sufficient. Do not require embeddings, vector search, or an external API key.

The minimum deterministic chain is:

```text
JSON record
  -> resolve rune id / rune name
  -> match canonical LunaRunes record
  -> read canonical group
  -> assign LOC1 rune vocabulary
  -> assign LOC7 rune language module
  -> preserve source evidence
```

Only classify LOC3-LOC6 or LOC8 when the input record itself provides evidence of that content role.

## LunaRunes LOC1-8 mapping

| LOC | Name | Classification role |
|---|---|---|
| LOC1 | 符文語彙 / Rune Symbolic Vocabulary | The 66 drawable LunaRunes themselves |
| LOC2 | 符文脈絡 / Rune Symbolic Context | 2 / 3 / 5 / 11-rune structures and positional relations |
| LOC3 | 符文延伸體系：音樂 / Rune Symbolic Extension: Music | Lyrics, songs, styles, music metadata |
| LOC4 | 符文延伸體系：文學 / Rune Symbolic Extension: Literary | Literary and written works |
| LOC5 | 符文延伸體系：多媒體 / Rune Symbolic Extension: Multimedia | Images, video, Reels, MV, multimedia records |
| LOC6 | 符文系統演算法 / Rune Symbolic System Algorithm | Reading logic, direction, moon phase, Grammar, OW3gs logic |
| LOC7 | 符文語言模組 / Rune Symbolic Language Module | Canonical rune groups used as reusable language modules |
| LOC8 | 符文進化推演引擎 / Rune Evolution Engine | Recursive projection and system-state evolution over time |

## LOC7 group modules

The 1-64 rune matrix uses eight runes as the basic grouping unit.

```text
1-8    靈魂群組
9-16   連結群組
17-24  生命群組
25-32  自然群組
33-40  礦物群組
41-48  元素群組
49-56  秩序群組
57-64  無序群組
65-66  特殊符文（玄、命）
```

Rune 0 德 is an author/governance anchor. It is not part of the 66 drawable rune vocabulary and must not be counted as a normal LOC1 rune item.

## Accepted input fields

Resolve these aliases before classification:

```text
rune_id: id, 編號
rune_name: name, 名稱, 符文名稱
group: group, 所屬分組
```

If both id and name exist, verify that they resolve to the same canonical rune. If they conflict, do not guess; flag the record for governance review.

## Deterministic classification rules

1. Resolve the record against `runes66.json`.
2. If the canonical rune id is 1-66, add `LOC1 / 符文語彙`.
3. Read the canonical `group` from `runes66.json`; do not trust a conflicting derived group value.
4. Add `LOC7 / 符文語言模組` with the corresponding group-module label.
5. If the record contains an explicit multi-rune structure of 2, 3, 5, or 11 runes, additionally classify it as `LOC2 / 符文脈絡`.
6. Classify as LOC3 only when the record is actually a music/lyrics/style record or explicitly links to one.
7. Classify as LOC4 only when the record is actually a literary/text work or explicitly links to one.
8. Classify as LOC5 only when the record is actually multimedia or explicitly links to multimedia.
9. Classify as LOC6 only when the record describes or implements rune reading/system logic.
10. Classify as LOC8 only when the record contains temporal/evolution/projection state or is an output of a recursive evolution pass.
11. Never infer a higher LOC role merely because a rune name occurs in free text.
12. Preserve all original fields. Add classification metadata; do not rewrite source content.

## Suggested output schema

```json
{
  "source_id": "...",
  "rune_matches": [
    {
      "rune_id": 55,
      "rune_name": "空",
      "canonical_group": "秩序",
      "loc": [
        {
          "id": "LOC1",
          "label": "符文語彙"
        },
        {
          "id": "LOC7",
          "label": "符文語言模組",
          "module": "秩序群組"
        }
      ]
    }
  ],
  "classification_method": "deterministic",
  "api_required": false,
  "embedding_required": false,
  "needs_governance_review": false
}
```

## JSON parsing workflow

When asked to classify a JSON file or array:

1. Detect the record boundary (object, array item, document, work, media item, or event).
2. Normalize only field names needed for lookup; do not normalize the source text destructively.
3. Resolve rune identities from structured fields before scanning free text.
4. Join against canonical `runes66.json` by id or exact rune name.
5. Apply LOC1 and LOC7 deterministically.
6. Inspect explicit record type / metadata for LOC2-LOC6 and LOC8 roles.
7. Deduplicate classifications per record.
8. Return counts by rune, group, LOC role, and source type when aggregation is requested.
9. Flag conflicts, missing rune identity, and ambiguous roles separately instead of forcing a classification.

## Why no semantic vector is required for the base layer

The base classification problem is structural, not similarity-based. LunaRunes already has a closed canonical vocabulary and fixed group membership. Therefore exact lookup is both cheaper and more authoritative than embedding similarity for identifying rune membership and group modules.

Semantic vectors may be added later for tasks such as implicit rune-semantic detection in long-form text, similarity between works, latent themes, or cross-rune semantic overlap. They are an enhancement layer, not a prerequisite for the base symbolic model.

## Evolution loop

LOC8 may reuse prior structured outputs as new input:

```text
source data
  -> classification
  -> context
  -> algorithm/module relation
  -> statistics or temporal comparison
  -> governance-approved write-back
  -> new structured system state
  -> next evolution pass
```

This makes the evolution process recursively reusable while preserving provenance and human governance.

## Guardrails

- Do not invent rune meanings or groups.
- Do not use historical meanings to override current canonical fields.
- Do not infer J-Pop from Anime Pop or similar unrelated metadata shortcuts; deterministic means explicit evidence only.
- Do not overwrite raw source data.
- Do not treat semantic-vector output as higher authority than canonical rune data.
- Do not automatically write back an inferred classification when evidence is ambiguous; flag it for review.
