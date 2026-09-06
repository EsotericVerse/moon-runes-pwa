# Frontend Runtime Data Policy

**Status:** Current  
**Version:** 0.2  
**Updated:** 2026-09-07

## 1. Principle

Frontend runtime format is selected by **data role, size, stability and reuse**, not by a blanket “JSON vs JS” rule.

The primary requirement is:

> **One governed source chain; no manually maintained duplicate truth.**

## 2. When a standalone JSON projection is appropriate

A standalone JSON file is appropriate when the dataset is:

- relatively large,
- semantically stable,
- reused by multiple pages/modules,
- independently meaningful,
- expensive or error-prone to duplicate in source code,
- and clearly governed by an upstream source.

Examples:

- `data/json/core/runes64.json`
- `data/json/core/rune_details.json`
- `data/json/core/rune_interpretations.json`
- `data/json/core/lots.json`

These are stable reusable data projections and may be fetched directly by browser code where that is the simplest, clearest runtime contract.

## 3. When data should stay inside a JS/module

Do not create a new JSON file merely for structural symmetry.

Small, strongly coupled, frequently changed UI data may remain in the module that owns it, for example:

- UI-only constants,
- short label maps,
- component-local options,
- temporary presentation mappings,
- logic that has no independent data authority.

Splitting small data into many JSON files can make governance worse by creating unnecessary path, version and synchronization overhead.

## 4. Generated JS projections

Generated JS projections are allowed when they provide a clear runtime benefit such as import-time bundling, offline/PWA packaging, eliminating repeated parse/fetch overhead, or module integration.

A generated JS projection must be deterministic:

~~~text
governed source
→ generator
→ JS projection
→ drift validation
~~~

It must never become a second manually edited Canon.

## 5. Direct JSON fetch is allowed

The browser may directly fetch a maintained JSON projection when:

- it is a stable reusable data contract,
- the path is part of repository governance,
- Service Worker/cache behavior is known,
- the JSON path is validated by CI,
- and a second manually maintained JS copy is not required.

Therefore direct use of `data/json/core/runes64.json` is valid.

## 6. Dynamic API calls

API requests remain appropriate for Unified Search, Graph traversal, live LOC8 data, user-specific CRUD, rights-filtered output, server-side computation, and dynamic or private data.

## 7. Anti-duplication rule

Bad:

~~~text
runes64.json
+ hand-maintained runes64.js
+ another full copy under engine/
~~~

Good:

~~~text
LunaRune64.xlsx
→ one maintained core projection
→ consumers read it directly
~~~

or, only when justified:

~~~text
LunaRune64.xlsx
→ core projection
→ deterministic generated browser module
~~~

## 8. Migration requirement

A frontend data migration is complete only when:

1. the upstream authority is explicit;
2. the chosen runtime representation has a clear reason;
3. all old paths are removed;
4. Service Worker references are updated;
5. CI validates static JSON/module paths;
6. any generated projection has a reproducible generator;
7. no manually maintained duplicate truth remains.

## 9. Governance boundary

This policy does not require every JSON to be centralized or every static dataset to be split into a dedicated file.

The decision test is:

~~~text
Is the dataset large / stable / reused / independent enough
to deserve its own governed projection?
~~~

If **yes**, a standalone JSON/core projection is appropriate.

If **no**, keep it with the owning module rather than creating another file merely to satisfy a directory pattern.

---

**Runtime principle:** choose the smallest maintainable representation that preserves one authority chain and avoids duplicate truth.