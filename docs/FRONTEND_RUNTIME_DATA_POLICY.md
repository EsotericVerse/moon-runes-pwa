# Frontend Runtime Data Policy

**Status:** Current  
**Version:** 0.1  
**Updated:** 2026-09-07

## 1. Principle

Browser-facing LOC pages should prefer **static JavaScript data modules** over runtime JSON fetches for data that can be bundled or pre-generated.

The purpose is to avoid unnecessary runtime data requests, API quota pressure and repeated network dependency for static datasets.

~~~text
Mother / governed source
        ↓
maintained JSON / registry / source data
        ↓
generated JS projection
        ↓
browser import / static asset
~~~

The browser consumes the JS projection. JSON remains available to Python, Search, Graph, KM, generators and governance tooling.

## 2. JS is a runtime projection, not a second Canon

A JS data file must never become an independently edited copy of the same governed data.

Bad pattern:

~~~text
update JSON
+ manually remember to update JS
+ hope both still match
~~~

Required pattern:

~~~text
update authoritative source
→ generate JSON projection where needed
→ generate JS runtime projection
→ validate drift
→ commit both
~~~

If a JS file is manually maintained and no generator exists yet, it must be explicitly marked as manual_projection and treated as technical debt.

## 3. Why this matters

Static JS modules are useful for:

- rune identity / lookup
- orientation text
- Lots text
- stable navigation data
- stable ERA / registry views needed directly by browser UI
- other data that does not require live server computation

Dynamic API calls remain appropriate for:

- Unified Search
- Graph RAG traversal
- live LOC8 Google Sheets data
- user-specific CRUD
- conditional / server-side computation
- data that must be rights-filtered at request time

## 4. Sync risk

The primary risk of JS runtime storage is **stale projection**.

Examples:

- LunaRune64.xlsx changes but js/runes64.js does not.
- Registry JSON changes but browser JS projection still contains old labels.
- a deprecated field remains in JS after the governed schema changes.

Therefore every JS data module needs:

- an upstream source
- a generation or synchronization method
- a version / generated-at marker where practical
- a CI drift check
- a documented owner

## 5. Current target architecture

~~~text
LunaRune64.xlsx
├─ data/json/core/runes64.json
├─ data/json/core/rune_interpretations.json
├─ data/json/core/lots.json
└─ generated browser modules
   ├─ js/data/runes64.js
   ├─ js/data/rune_interpretations.js
   └─ js/data/lots.js
~~~

Registry projections follow the same pattern when the browser needs them.

## 6. Frontend rule

New browser code should not directly fetch repository JSON merely to read static data.

Prefer importing a generated JS module over fetching a static JSON file.

This rule does not prohibit API requests whose purpose is dynamic computation or live user data.

## 7. Service Worker

Static JS data modules may be pre-cached together with application modules.

The Service Worker should cache the JS projections the browser actually imports, rather than pre-cache redundant JSON files that the browser no longer consumes.

## 8. Migration requirement

A migration from JSON runtime fetch to JS modules is incomplete until:

1. browser JSON fetch has been removed
2. JS module exists
3. upstream source is recorded
4. generator/sync process exists
5. CI detects stale projection
6. Service Worker references are updated
7. developer docs and KM asset paths are updated

## 9. Governance boundary

JSON is still valid and preferred for:

- backend processing
- structured governance
- Graph / Search indexing
- schema / policy / registry storage
- generated analysis
- archive / provenance

The rule is specifically about **browser runtime consumption**, not about banning JSON from LOC.

---

**Runtime principle:** static data should reach the browser as generated JS modules; source data remains governed elsewhere, and CI prevents the JS projection from silently becoming stale.