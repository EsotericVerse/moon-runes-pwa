# LOC Language Theory

## Status

This document records the current theoretical basis of LOC and LunaRunes. It is a governance document for terminology and system design. It does not replace historical documents; earlier names and intermediate concepts may remain in history, changelogs, and evolution records when they describe how the system developed.

## Core language model

LOC currently uses the following conceptual sequence:

**單字 → 脈絡（句型／語法）→ 治理 → 文化 → 語言體系 → 語言**

The sequence describes how language can be organized from the smallest semantic anchors toward a broader language system.

### 1. 單字

A single word or character is the lowest semantic anchor in this model. It does not mean that one character always has only one meaning. Instead, a single character can be used as a stable reference point from which related meanings, contexts, usages, and changes are governed.

LunaRunes is the symbolic language-model implementation of this principle. Its 66 single-character runes act as bottom-level semantic anchors.

### 2. 脈絡

Words acquire operational meaning through context, including phrase structure, sentence pattern, syntax, relation, surrounding terms, and usage situation.

Context therefore takes precedence over naive character matching. A character appearing inside a larger phrase does not automatically become a LunaRune link or semantic hit.

Examples of different context types include:

- formal rune names such as `日之符文` and `靈之符文`;
- group entities such as `靈魂群組`;
- text compounds such as `靈魂`;
- cross-group compounds such as `生靈`, `死靈`, `水土不服`, and `老命一條`;
- cultural or contextual vocabulary such as `鏡花水月`, `日期`, `日出`, and `明星`;
- protected phrases such as organization names, personal names, titles, or proper nouns that must not be split by rune-character matching.

## 3. 治理

Governance determines how meanings are defined, prioritized, classified, protected, displayed, linked, revised, and preserved over time.

Governance is not limited to classification. It also controls semantic display and interpretation behavior.

The current principle is:

**先依詞類／詞性角色判斷功能，再依主體性確認語意對象，以群組確定定位，最後映射個別符文。**

When direct and reverse semantic interpretations conflict, a rune that directly expresses the intended semantic direction takes precedence over an interpretation reached indirectly through the opposite side of another rune.

The system should prefer explicit governance data over growing collections of hard-coded `if/else` exceptions.

## 4. 文化

Culture is a noun in the LOC terminology system.

A culture is formed when style is accumulated through time together with events, values, semantic changes, works, habits of expression, and governance decisions.

A useful shorthand is:

**風格 + 時間／時期 + 事件 + 價值 + 語意變化 → 文化**

Style alone is therefore not culture. Culture is the time-bearing accumulation of style and meaning.

The existing concept previously called `政德風` is retained as a historical style name, while the broader accumulated system is now formally understood as `政德文化`.

`演化`, `推演`, and `進化` remain valid verbs or process concepts. Renaming an LOC feature from Evolution to Culture does not mean these words should be globally replaced in historical or explanatory text.

## 5. 語言體系

The formal term is **語言體系**.

Do not shorten this to `語系` in LOC terminology, because `語系` conventionally refers to a linguistic language family and could incorrectly imply genealogical descent.

In LOC, a language system means an organized structure of text, semantics, context, governance, culture, relations, and change.

## 6. 語言

Language is the broader living result of the preceding layers. LOC does not claim that language has one final or uniquely correct future state.

Past and present language usage can be organized and governed. Future language remains contingent.

Therefore LOC focuses on:

- governing known semantics;
- preserving semantic history;
- observing change;
- analyzing context and relationships;
- making possible future developments inspectable;
- supporting inference without presenting one prediction as the only answer.

## LOC and LunaRunes

### LunaRunes

LunaRunes is a **Symbolic Language Model／符號式語言模型** built from 66 single-character semantic anchors.

Its purpose is not to assert that every word can be reduced mechanically to one rune. The rune layer is the bottom semantic token layer; higher layers must still handle compounds, groups, context, protected phrases, cultural meaning, time, and governance.

### LOC

LOC is the reusable framework that modularizes and implements these language layers.

Its functions include search, context, governance, culture, semantic organization, and evolution-related observation or inference. These modules are implementations of the language theory rather than independent definitions of language.

## Personal semantic governance and RAG

LOC treats personal semantic governance as a core capability.

The intended flow is:

**個人語意設定 → 分類 → 脈絡 → 搜尋 → 顯示 → 文化／演化**

RAG is an intermediate layer in this process, not the endpoint. The system should allow users to define and govern their own semantics rather than requiring them to inherit one fixed external semantic interpretation.

Where possible, basic classification and semantic organization should remain explainable and capable of running without requiring an external API key.

## Entity layers

The system must keep different semantic entities separate even when their visible text overlaps.

### Rune system and formal rune names

`月之符文` is the system-level name. Formal child names include `日之符文`, `靈之符文`, `命之符文`, and the corresponding names of the other runes.

A raw character such as `日`, `靈`, or `魂` must not automatically become a site-wide enlarged link merely because it matches a rune token. Context decides whether it is functioning as a rune reference.

### Group Entity

A group such as `靈魂群組` is an entity with its own formal explanation and must remain independently searchable and displayable.

### Text Compound

A compound such as `靈魂` can simultaneously be interpreted at the text layer as `靈之符文 + 魂之符文` without replacing or hiding the corresponding group entity.

### Cross-group vocabulary

Compounds may legitimately contain rune semantics from different groups. They must not be forced into one group merely for classification convenience.

### Culture/context vocabulary

Complete terms and phrases can map to semantic interpretations that are not literal sums of their characters. Such mappings require phrase-level and context-level analysis.

### Protected Phrase

Protected phrases prevent incorrect splitting, linking, or emphasis. Examples include organization names, people names, artist or band names, titles, brands, and other proper nouns.

Protected phrases must be configurable data, not an expanding list of hard-coded parsing branches.

## Cultural vocabulary records

Additional cultural vocabulary should support structured metadata rather than only `term → link`.

A vocabulary record may include:

- `term`;
- `meaning`;
- `context`;
- `era` or `culture`;
- whether the term may be decomposed;
- protected-phrase behavior;
- mapped group or groups;
- mapped rune or runes;
- display behavior;
- source or governance note.

For example, `明星` can refer historically to a bright celestial body and in modern usage commonly to a public celebrity. The system must be able to preserve both meanings with contextual and temporal information.

## Semantic display governance

Semantic analysis should eventually control display automatically, including text size, weight, emphasis, and linking. Manual per-article markup is not the target architecture.

Classification keywords and display keywords are separate concepts and must not share one undifferentiated field.

A current priority model is:

1. protected high-priority brand or identity terms;
2. system-core terms;
3. group names;
4. text, rune, and compound semantic terms;
5. exception/protection control layer;
6. lowest-confidence or disputed layer.

The exception/protection layer is a parser-control layer, not merely a CSS priority.

The final implementation must remain one-way at the DOM level: semantic parsing may recurse into lower semantic layers, but the DOM enhancer must not repeatedly rescan and enhance its own generated output.

The lowest semantic token layer is the rune character.

## Search behavior

When a search directly matches a group name or governed display keyword, the search result should first expose the corresponding group entity and its formal explanation, then list general corpus matches.

Search should preserve the distinction between:

- group entities;
- rune entities;
- text compounds;
- cross-group vocabulary;
- cultural/contextual vocabulary;
- protected phrases;
- general corpus results.

## Terminology constraints

The following distinctions are normative:

- `文化` is a noun and formal feature/domain name.
- `演化`, `推演`, and `進化` remain process verbs/concepts where semantically appropriate.
- `語言體系` is the formal LOC term; avoid `語系` as shorthand.
- group entities and text compounds must not overwrite each other.
- classification keywords and display keywords are separate.
- protected phrases belong to parser governance, not ad-hoc page markup.
- historical terminology may be preserved when documenting the system's evolution.

## Product naming transition

The navigation-level feature previously labeled `推演` / Evolution is transitioning to **Culture · 文化**.

The existing internal route `/culture` may remain temporarily for compatibility. Route stability and data compatibility take precedence over cosmetic path renaming.

Only formal feature names, labels, Hero text, ARIA labels, and other product-specific names should be changed to Culture terminology. Ordinary prose describing future inference, historical evolution, or evolutionary trends must retain the wording required by its meaning.

Time/era configuration belongs under the Culture feature because time is a defining dimension in the formation and interpretation of culture.
