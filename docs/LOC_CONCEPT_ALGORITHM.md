# LOC Concept Algorithm

## Purpose

This document records the conceptual algorithm behind LOC as a **Language Module Framework／語言模組框架**.

LOC is part of the lo3rwang digital thought assets. Its role is not to define the whole language world for everyone, but to provide a reusable grouping and modularization reference so accumulated language records can be parsed, classified, related, reorganized and projected with less structural burden.

Language is not used only for communication. It also leaves concrete records of human existence: events, works, relationships, values, institutions, groups, beliefs, decisions and temporal context. LOC treats those records as material that can be organized into operable language modules.

## Core scale model

A useful analogy is:

```text
Language                         -> material world
Language system                  -> element-level system
Token                            -> atomic-scale lexical unit
Grouping / symbolic abstraction  -> structure over those units
Language module                  -> reusable way to process a bounded set of units
LOC                              -> framework for building and relating those modules
```

This analogy describes granularity, not physical equivalence.

LunaRunes demonstrates one concrete implementation: runes group and structure language-level atomic units, and rune language modules define how those grouped units are classified, related and processed.

## Conceptual algorithm

The LOC modularization process can be expressed as:

```text
1. Define Scope
   Decide what is being analyzed.

2. Identify Units
   Find the smallest useful units that can be observed or operated on.

3. Group Units
   Create meaningful categories or symbolic groupings appropriate to the domain.

4. Build Context
   Record relations, positions, sequences, events and co-occurrence between units or groups.

5. Define Rules
   Specify how the grouped units and contexts are interpreted, transformed, compared or calculated.

6. Form Modules
   Package stable combinations of units, relations and rules into reusable language modules.

7. Parse and Compare
   Use the modules to classify, search, compare or explain accumulated language records.

8. Project / Evolve
   Observe changes over time or across datasets and derive possible new states.

9. Governed Write-back
   When a derived result is sufficiently supported and accepted, record it as a new structured state while preserving provenance and history.
```

Compact form:

```text
Scope
  -> Unit
  -> Group
  -> Context
  -> Rule
  -> Module
  -> Parse / Compare
  -> Projection
  -> Governed Write-back
  -> New State
```

## Framework invariants and variable content

The **framework stays relatively stable**, but the analyzed content is replaceable.

For LunaRunes, the units and modules can be runes, rune groups, multi-rune context, direction, moon phase, Grammar and OW3gs rules.

For a life record, the units may instead be events, people, places, decisions, values, periods and relationships.

For a group, they may be members, roles, norms, authority, interactions and events.

For religion, they may be concepts, scriptures, doctrines, rituals, communities, institutions and historical periods.

LOC does not require these domains to share the same vocabulary, groups or rules. The framework provides a modularization reference; each domain defines its own operative units and processing logic.

## Why the framework can stay small

LOC does not need to model every possible meaning in advance. Its value comes from **fine parsing granularity with limited structural primitives**.

A small framework can remain useful when:

- the scope is explicit;
- units are traceable;
- group boundaries are defined;
- relationships are recorded;
- rules are inspectable;
- modules are reusable;
- derived results keep provenance.

This reduces the burden of parsing large, long-term language records without claiming that one taxonomy can describe every person or domain.

## LOC and LunaRunes: mutual verification

LOC and LunaRunes are complementary rather than a one-way hierarchy.

```text
LOC -> gives LunaRunes a modular way to expose grouping, context, algorithms and evolution.
LunaRunes -> gives LOC concrete data, structures and runtime behavior that can test the framework.
```

The relationship is therefore **mutual verification**.

The 66-rune vocabulary, fixed groups, multi-rune structures, interpretation rules, works and evolution records can be inspected through LOC; at the same time, those concrete materials demonstrate whether LOC's modularization method actually works in practice.

This is not a future aspiration or a retroactive fantasy. The current conceptual wording makes an already observable relationship explicit.

## Deterministic first, semantic enhancement when needed

When records already contain explicit ids, names, groups, types, tags or relations, LOC should prefer deterministic parsing and direct lookup.

Semantic vectors, embeddings or LLMs can be added when the task requires implicit semantic detection, similarity, latent themes or ambiguous cross-domain interpretation. These are enhancement layers, not prerequisites for the conceptual algorithm.

## Design boundary

LOC provides **classification reference and structural method**, not universal truth.

A result produced through LOC should remain distinguishable as one structured interpretation of the available data. Different scopes, source sets, grouping decisions or governance rules may produce different valid modules.

That boundary is intentional: LOC makes language-system parsing easier by making the structure explicit, not by forcing every language system into one fixed worldview.
