# LOC Data Architecture

**Status:** Current  
**Version:** 0.1  
**Updated:** 2026-09-07

## 1. Purpose

This document defines how LOC data is stored, projected and consumed after repository normalization.

The central rule is:

> **One authority, many purpose-specific projections — not many full copies of the same data.**

## 2. Rune source chain

The highest-priority rune mother source remains:

```text
LunaRune64.xlsx
      ↓
governed projection / synchronization
      ↓
data/json/core/
```

`data/json/core/` is runtime data, not a replacement for the mother source.

### Current core projections

| File | Role | Expected scope |
|---|---|---|
| `runes64.json` | basic rune lookup | rune identity, group, moon phase, keywords, four orientations |
| `rune_interpretations.json` | expanded interpretation runtime | 64 core runes × orientation × current moon-phase guidance |
| `lots.json` | Lots / 籤詩 projection | 66 drawable runes × orientation × topic |
| `three_card_combinations.json` | three-card grammar support | direction-combination rules |

The filename `runes64.json` follows the historical mother-data naming convention. It currently contains the 66 drawable rune records used by the runtime (1–64 + 65 玄 + 66 命); rune 0 德 remains a non-drawable reference and is governed separately.

## 2.1 What belongs in stable core projection

Not every JSON file should be treated as fixed or immutable.

A dataset belongs in `data/json/core/` only when most of the following are true:

- the dataset is relatively large or expensive to duplicate,
- its upstream authority is explicit,
- its schema and semantic role are mature,
- runtime consumers need a stable projection,
- day-to-day development should not edit the projection independently,
- changes are expected to flow from an upstream governed source.

Examples: rune lookup, expanded rune interpretation, Lots projection, stable combination grammar.

Small and actively governed records such as ERA, Rights Policy, Graph Schema, Governance Registry, KM asset registries and relationship registries belong in `registries/` and are expected to evolve through normal versioned governance.

So the rule is:

> **Stable large data becomes a maintained projection; governance metadata remains actively editable.**

## 3. Do not duplicate core rune data

A consumer that only needs rune identity must load `runes64.json`.

A consumer that needs expanded daily/orientation interpretation must load `rune_interpretations.json`.

A consumer that needs Lots text must load `lots.json`.

Do not create another file containing all three datasets merely for convenience.

Before this cleanup, equivalent copies of `runes_all_data.json` existed under both `api/` and `engine/`; their semantic contents were identical aside from whitespace formatting. The engine copy was removed.

## 4. Data role directories

```text
data/json/
├─ core/          canonical-governed runtime projections
├─ registries/    current Registry / Schema / Policy / Manifest
├─ search/        retrieval-specific datasets
├─ generated/     rebuildable generated indexes / analysis
├─ archive/       historical versions excluded from runtime
└─ experimental/  research-only datasets and outputs
```

### core

Stable runtime projections of authoritative sources.

Must be small enough in responsibility that a developer can tell which file to load.

### registries

Cross-LOC structured records: ownership, ERA, media, graph, governance, schemas, rights, relationships and KM registries.

A Registry may point to another authority but must not clone its full payload.

### search

Search-specific datasets. These are optimized retrieval views, not Canon.

Current domains:

- `search/faq/`
- `search/loc3/`

### generated

Reproducible outputs such as Threads shards, indexes and analysis baselines.

If a generated artifact cannot be reproduced, its source/provenance must be documented before it is treated as maintained data.

### archive

Historical versions preserved for provenance. Current runtime must never silently fall back to an archive version.

### experimental

Research data used by `engine/`. Experimental data cannot override `core/` or `registries/`.

## 5. Configuration JSON is not data JSON

These remain next to the components they configure:

- root `manifest.json`
- `loc8_api/appsscript.json`

Centralization applies to data, not every file whose extension is `.json`.

## 6. Path API

Python production code must use `api/paths.py`:

- `core_json(name)`
- `registry_json(name)`
- `search_json(domain, name)`
- `generated_json(...)`
- `archive_json(...)`
- `experimental_json(...)`

Hard-coded repository-relative data paths in new Python modules are discouraged.

## 7. Change flow

Rune changes:

```text
LunaRune64.xlsx
→ validate Canon invariants
→ rebuild affected core projection(s)
→ rebuild search/generated derivatives if needed
→ run runtime tests
→ update provenance/version metadata
```

Registry changes:

```text
authoritative domain record
→ Registry update
→ Graph/Search projection
→ validation
```

Do not edit a downstream search or experimental file as a shortcut to change Canon.

## 8. Deletion and archive rules

Delete:

- zero-byte broken files
- unreferenced temporary data
- exact/semantic duplicate runtime copies
- disposable generated artifacts that are reproducible

Archive:

- meaningful historical versions
- old FAQ/RAG versions
- prior governed datasets useful for provenance

## 9. Validation

`api/scripts/validate_repo_layout.py` checks required paths and rejects legacy path reintroduction.

Any data-path migration is incomplete until code, HTML, Service Worker, workflow, JSON references and documentation all point to the same new location.

---

**Data governance principle:** a file should have one clear role, one authority chain and one reason to exist.

## Browser Runtime Projection

The JSON architecture in this document describes governed structured data. It does **not** require the browser to fetch those JSON files directly.

For static browser data, the preferred chain is:

~~~text
mother / governed JSON
→ generated JS module
→ browser
~~~

Therefore data/json/core and data/json/registries may remain authoritative structured projections for backend/KM purposes while the PWA consumes synchronized js/data modules.

The system must validate both layers together. A JS projection that no longer matches its upstream source is a repository-governance failure.

See [FRONTEND_RUNTIME_DATA_POLICY.md](./FRONTEND_RUNTIME_DATA_POLICY.md).
