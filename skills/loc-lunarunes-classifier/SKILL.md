# LOC LunaRunes Classifier

## Purpose

Classify LunaRunes（月之符文）data into the LOC structure using deterministic evidence first, while preserving provenance and current Canon boundaries.

LOC is a **Language Module Framework／語言模組框架**. LunaRunes is a concrete symbolic-language implementation that both uses and validates the LOC framework. The relationship is reciprocal: LOC makes LunaRunes structure easier to expose and organize, while LunaRunes provides observable data and implementation evidence that tests the framework in practice.

This Skill is specifically for **LunaRunes classification**. Do not generalize its 66-rune vocabulary, eight-group structure, moon phases, directions, Grammar, or OW3gs rules to unrelated LOC domains.

## What this Skill now does

Use this Skill when the user wants to:

- classify LunaRunes records by rune, group, LOC role, source type, relation, algorithm, or time;
- map rune-related text, songs, literary works, multimedia, rules, knowledge, and readings into LOC1–LOC8;
- distinguish deterministic rune classification from semantic inference;
- aggregate counts by rune, rune group, content type, LOC role, style/tag, period, or other explicit metadata;
- show example classifications that explain why a record belongs to one or more LOC roles;
- prepare LunaRunes data for search, comparison, model organization, and time-based projection;
- identify conflicts between source records and canonical rune data without silently rewriting the source.

## Framework / implementation boundary

```text
LOC = Language Module Framework
LunaRunes = symbolic-language implementation using LOC
```

LunaRunes-specific rules are implementation rules, not universal LOC rules.

The LunaRunes implementation uses:

- 66 canonical drawable runes;
- eight fixed groups for runes 1–64;
- 65 玄（Chaos）and 66 命（Fate）as special runes;
- rune 0 德（De）as the author/governance anchor, not a drawable rune;
- 2 / 3 / 5 / 11-rune context structures;
- direction, moon-phase, Grammar, OW3gs, and other governed interpretation rules.

## Core principle

Use the smallest authoritative dataset possible.

For basic rune identity and group classification, `data/json/core/runes66.json` is sufficient. Do not require embeddings, vector search, or an external API key when the classification can be resolved deterministically.

The minimum deterministic chain is:

```text
record
  -> resolve rune id / rune name
  -> match canonical LunaRunes record
  -> read canonical group
  -> classify rune vocabulary
  -> classify rune language module
  -> preserve provenance
```

Then add LOC2–LOC6 or LOC8 only when the record itself contains evidence for those roles.

## LunaRunes LOC1–8 mapping

| LOC | LunaRunes role | Classification evidence |
|---|---|---|
| LOC1 | 符文語彙 / Rune Symbolic Vocabulary | The 66 drawable runes and their canonical lexical definitions |
| LOC2 | 符文脈絡 / Rune Symbolic Context | 2 / 3 / 5 / 11-rune structures, positions, combinations, relations |
| LOC3 | 符文延伸體系：音樂 / Rune Symbolic Extension: Music | Lyrics, songs, style/genre metadata, rune-song provenance |
| LOC4 | 符文延伸體系：文學 / Rune Symbolic Extension: Literary | Literary works, fiction, authored text, rune-linked writing |
| LOC5 | 符文延伸體系：多媒體 / Rune Symbolic Extension: Multimedia | Images, video, Reels, MV, visual or audiovisual records |
| LOC6 | 符文系統演算法 / Rune Symbolic System Algorithm | Reading logic, direction, moon phase, Grammar, OW3gs, interpretation rules |
| LOC7 | 符文語言模組 / Rune Symbolic Language Module | Canonical rune groups and reusable structured knowledge modules |
| LOC8 | 符文進化推演引擎 / Rune Evolution Engine | Time comparison, recursive projection, model-state change, governed write-back |

## LOC7 rune group modules

The 1–64 matrix uses eight runes as the basic grouping unit.

```text
1–8    靈魂群組
9–16   連結群組
17–24  生命群組
25–32  自然群組
33–40  礦物群組
41–48  元素群組
49–56  秩序群組
57–64  無序群組
65–66  特殊符文（玄、命）
```

Rune 0 德 is an author/governance anchor. It is not part of the 66 drawable rune vocabulary and must not be counted as a normal LOC1 rune item.

## Accepted identity fields

Resolve these aliases before classification:

```text
rune_id: id, 編號
rune_name: name, 名稱, 符文名稱
group: group, 所屬分組
```

If both id and name exist, verify that they resolve to the same canonical rune. If they conflict, do not guess; flag the record for governance review.

## Deterministic classification rules

1. Resolve the record against `runes66.json`.
2. If canonical rune id is 1–66, classify it as `LOC1 / 符文語彙`.
3. Read canonical group from `runes66.json`; do not trust a conflicting derived group field.
4. Classify the rune under `LOC7 / 符文語言模組` using its canonical group.
5. If the record explicitly contains a 2 / 3 / 5 / 11-rune structure, also classify it as `LOC2 / 符文脈絡`.
6. Add LOC3 only for actual music / lyrics / style / rune-song records or explicit links to them.
7. Add LOC4 only for actual literary / authored-text records or explicit links to them.
8. Add LOC5 only for actual multimedia records or explicit multimedia links.
9. Add LOC6 only for records that describe or implement rune-system rules, reading logic, Grammar, direction, moon phase, or OW3gs logic.
10. Add LOC8 only when the record includes temporal comparison, evolution/projection state, recursive model organization, or governed write-back.
11. A single record may legitimately belong to multiple LOC roles when different evidence is present.
12. Never infer a higher LOC role merely because a rune name appears in free text.
13. Preserve original fields. Add classification metadata; do not rewrite source content.

## LunaRunes example classifications

These examples are part of the Skill's expected behavior. They demonstrate **how LunaRunes data is classified**, not how unrelated life/group/religion data should be classified.

### Example 1 — single canonical rune record

Input:

```json
{
  "id": 55,
  "name": "空"
}
```

Classification:

```text
LOC1 / 符文語彙
LOC7 / 符文語言模組 / 秩序群組
```

Reason:

- `空` is a canonical drawable rune, so it belongs to LOC1.
- Its canonical group is 秩序, so it also belongs to the corresponding LOC7 rune language module.
- No LOC2–LOC6 or LOC8 evidence is present in this record alone.

### Example 2 — three-rune reading record

Input:

```json
{
  "spread": "3-card",
  "cards": [
    {"rune": "樹", "direction": "正位"},
    {"rune": "界", "direction": "正位"},
    {"rune": "暗", "direction": "半正位"}
  ]
}
```

Classification:

```text
LOC1 / 符文語彙
LOC2 / 符文脈絡
LOC7 / 符文語言模組
```

Group evidence:

```text
樹 -> 自然群組
界 -> 靈魂群組
暗 -> 元素群組
```

Reason:

- the three rune identities are LOC1 evidence;
- the explicit three-card structure and positions form LOC2 context;
- each rune deterministically projects to its canonical LOC7 group module;
- direction values are present, but the record is not automatically LOC6 unless it also stores or invokes the interpretation rule itself.

### Example 3 — OW3gs interpretation rule

Input:

```json
{
  "rule_type": "OW3gs",
  "draw_count": 11,
  "core_judgement_positions": [7, 8, 9, 10, 11]
}
```

Classification:

```text
LOC2 / 符文脈絡
LOC6 / 符文系統演算法
LOC7 / 知識模組
```

Reason:

- eleven-card structure and positional responsibility are LOC2 context;
- core-judgement logic is an explicit interpretation algorithm, therefore LOC6;
- when stored as governed reusable knowledge, it is also a LOC7 knowledge/module asset.

Do not classify it as LOC1 unless concrete rune identities are present.

### Example 4 — rune-linked song

Input:

```json
{
  "title": "example song",
  "content_type": "lyrics_work",
  "runes": ["界", "光"],
  "style": "Synthwave"
}
```

Classification:

```text
LOC1 / 符文語彙
LOC3 / 符文延伸體系：音樂
LOC7 / 符文語言模組
```

Group evidence:

```text
界 -> 靈魂群組
光 -> 元素群組
```

Reason:

- explicit rune links provide LOC1 and LOC7 evidence;
- the record is a music/lyrics work, so it belongs to LOC3;
- `Synthwave` is direct style metadata and can be counted without semantic inference.

### Example 5 — rune-linked literary work

Input:

```json
{
  "content_type": "text_work",
  "title": "example chapter",
  "rune_configuration": ["靈", "鏡", "命"]
}
```

Classification:

```text
LOC1 / 符文語彙
LOC4 / 符文延伸體系：文學
LOC7 / 符文語言模組
```

Group evidence:

```text
靈 -> 靈魂群組
鏡 -> 靈魂群組
命 -> 特殊符文
```

If the rune configuration is explicitly a governed 3-rune grammar structure, also add `LOC2 / 符文脈絡`.

### Example 6 — rune-linked multimedia record

Input:

```json
{
  "content_type": "multimedia",
  "media_type": "video",
  "linked_runes": ["月", "幻"],
  "hashtags": ["#DreamPop", "#Moon"]
}
```

Classification:

```text
LOC1 / 符文語彙
LOC5 / 符文延伸體系：多媒體
LOC7 / 符文語言模組
```

Group evidence:

```text
月 -> 秩序群組
幻 -> 無序群組
```

Hashtags are direct non-text metadata and may be counted deterministically. Do not require semantic vectors for `#DreamPop` or `#Moon` merely because they are attached to multimedia.

### Example 7 — time-based rune model projection

Input:

```json
{
  "period": "P8",
  "rune_group_counts": {
    "靈魂": 42,
    "連結": 38,
    "生命": 51,
    "自然": 29,
    "礦物": 14,
    "元素": 44,
    "秩序": 47,
    "無序": 35
  },
  "comparison_period": "P7"
}
```

Classification:

```text
LOC7 / 符文語言模組
LOC8 / 符文進化推演引擎
```

Reason:

- rune-group aggregates operate on established LOC7 modules;
- comparison between structured states across time is LOC8 projection;
- the practical act of 推演 is to organize the relevant extension systems, methods, algorithms, and knowledge modules into an observable language model, then compare that model through time.

### Example 8 — one record spanning multiple LOC roles

Input:

```json
{
  "reading_id": "R-001",
  "spread": "11-card",
  "cards": ["樹", "界", "暗", "核", "葉", "火", "韻", "病", "愛", "光", "幻"],
  "algorithm": "OW3gs",
  "linked_song_id": "E0001",
  "linked_video_id": "MV0001",
  "period": "P8"
}
```

Possible classification:

```text
LOC1 -> explicit rune vocabulary
LOC2 -> explicit 11-rune context
LOC3 -> linked song
LOC5 -> linked multimedia
LOC6 -> OW3gs algorithm
LOC7 -> rune-group / knowledge modules
LOC8 -> period-bound model state / projection evidence
```

This example is important: LOC roles are not mutually exclusive database folders. They describe different responsibilities visible in the same evidence record.

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
        {"id": "LOC1", "label": "符文語彙"},
        {"id": "LOC7", "label": "符文語言模組", "module": "秩序群組"}
      ]
    }
  ],
  "record_locs": ["LOC1", "LOC7"],
  "classification_method": "deterministic",
  "evidence": ["explicit rune id/name", "canonical group lookup"],
  "api_required": false,
  "embedding_required": false,
  "needs_governance_review": false
}
```

## JSON parsing workflow

When asked to classify a JSON file or array:

1. Detect the record boundary: object, array item, document, work, media item, reading, rule, or event.
2. Normalize only field names needed for lookup; do not destructively normalize source text.
3. Resolve rune identities from structured fields before scanning free text.
4. Join against canonical `runes66.json` by id or exact rune name.
5. Apply LOC1 and LOC7 deterministically for explicit rune identities.
6. Inspect explicit record structure and metadata for LOC2–LOC6 and LOC8 roles.
7. Deduplicate classifications per record.
8. Return counts by rune, canonical group, LOC role, source type, style/tag, period, or other requested explicit metadata.
9. Separate deterministic evidence from semantic inference.
10. Flag conflicts, missing rune identity, and ambiguous roles rather than forcing a classification.

## Direct metadata statistics

Do not invoke semantic analysis when direct metadata already answers the question.

Examples:

- explicit `style` / genre -> count style directly;
- hashtags -> count hashtags directly;
- canonical rune name/id -> count rune and group directly;
- source type -> count content type directly;
- period/date -> aggregate by period directly.

Semantic analysis is for implicit meaning, not for replacing available structured metadata.

## Why no semantic vector is required for the base layer

The base classification problem is structural, not similarity-based. LunaRunes has a closed canonical vocabulary and fixed group membership. Exact lookup is cheaper and more authoritative for rune identity and group-module classification than embedding similarity.

Semantic vectors may be added for tasks such as implicit rune-semantic detection in long-form text, similarity between works, latent themes, or semantic overlap. They are an enhancement layer, not a prerequisite for the base symbolic model.

## Classification versus semantic inference

Do not confuse deterministic classification with semantic inference.

- **Classification:** explicit id/name/group/type/relation/metadata -> fixed rule -> classification.
- **Semantic inference:** free text -> possible rune semantics -> derived metadata that may require review.

For example, an explicit `空` rune record deterministically maps to LOC1 and LOC7 / 秩序群組. A paragraph that merely appears semantically related to 空 does not become canonical 空 data unless the semantic-analysis rule is intentionally invoked.

## Evolution / projection loop

LOC8 may reuse prior structured outputs as new input:

```text
source data
  -> classification
  -> context
  -> extension systems
  -> methodology / algorithms
  -> knowledge modules
  -> language model organization
  -> temporal comparison
  -> projection
  -> governance-approved write-back
  -> new structured state
  -> next pass
```

The practical work of LunaRunes evolution is not merely displaying a timeline. It organizes multi-system outputs, methodology, algorithms, and knowledge modules into a language model that can be compared through time.

A confirmed projection may update taxonomy, module definitions, search projections, relationships, or other derived system metadata. Such write-back creates a new state that can be analyzed again.

## Human authorship

The LOC framework, LunaRunes 66-rune vocabulary, eight-rune grouping, LOC1–8 LunaRunes mapping, Grammar, and evolution method are author-defined system design and analysis.

AI may execute the method, validate consistency, parse data, aggregate evidence, or assist with optional semantic inference. Do not describe the taxonomy itself as AI-generated.

## Guardrails

- Do not invent rune meanings or groups.
- Do not use historical meanings to override current canonical fields.
- Do not confuse direct metadata classification with semantic inference.
- Do not infer a style such as J-Pop from another style such as Anime Pop unless explicit evidence or a governed mapping exists.
- Do not overwrite raw source data.
- Do not treat semantic-vector output as higher authority than canonical rune data.
- Do not automatically write back an inferred classification when evidence is ambiguous; flag it for review.
- Do not impose LunaRunes-specific 66/8 grouping rules on unrelated LOC implementations.
