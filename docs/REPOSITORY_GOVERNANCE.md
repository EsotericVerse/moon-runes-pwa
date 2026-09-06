# Repository Governance

**Status:** Current  
**Updated:** 2026-09-07

## 1. Goal

The repository must make file authority and lifecycle obvious from path alone. Moving files is a governed migration: path changes, code references, documentation, caches, tests and deployment configuration must move together.

> **A cleaner tree is not a successful refactor if runtime paths break.**

The current maintained tree is recorded in [REPOSITORY_TREE.md](./REPOSITORY_TREE.md). That file is the developer-facing module map; this document defines the governance rules behind it.

## 2. Directory contract

~~~text
moon-runes-pwa/
├─ api/                 # active FastAPI/Search application code
├─ engine/                   # experimental engine code only
├─ data/
│  └─ json/
│     ├─ core/               # stable runtime projections of core rune data
│     ├─ registries/         # current cross-LOC Registry / Schema / Policy
│     ├─ search/             # query/index datasets grouped by domain
│     ├─ generated/          # reproducible generated indexes / analysis / shards
│     ├─ archive/            # historical data not loaded by current runtime
│     └─ experimental/       # experimental JSON datasets
├─ docs/
│  ├─ methodology/           # historical methodology / naming documents
│  └─ ...                    # current KM / Governance / tutorials / published docs
├─ js/                       # browser application logic
├─ css/                      # browser styles
├─ tools/                    # repository-wide builders / importers
├─ loc8_api/                 # Apps Script integration module
├─ 64images/                 # current rune-card images (public URL-sensitive)
├─ pics/                     # current presentation/visual assets; later media migration candidate
├─ reels/                    # current video assets; later media migration candidate
└─ *.html                    # public GitHub Pages routes; URL-sensitive
~~~

## 3. JSON roles

### core
Stable runtime projection, not the mother source.

Examples:

- `runes64.json`
- `rune_interpretations.json`
- `three_card_combinations.json`
- `lots.json`

The highest rune mother source remains `LunaRune64.xlsx`; core JSON does not supersede it.

### registries
Current structured governance/relationship/system records shared across LOC domains.

### search
Datasets directly loaded by retrieval modules. Domain subdirectories prevent FAQ, LOC3 and later indexes from becoming one flat bucket.

### generated
Rebuildable artifacts. Generated data must identify its upstream source and should not be manually edited as authority.

### archive
Historical versions retained for provenance. Runtime must not silently load archive data.

### experimental
Research datasets used by `engine/`. Experimental data cannot be promoted to current runtime merely by being present in the repository.

## 4. Configuration JSON exception

Not every JSON belongs under `data/json/`.

Configuration stays with the component it configures:

- root `manifest.json` → PWA configuration
- `loc8_api/appsscript.json` → Google Apps Script project configuration

The rule is **centralize data JSON**, not “move every .json extension blindly.”

## 5. Path contract

Python API code must use `api/paths.py` for current core/registry/search/generated paths rather than rebuilding path strings in each module.

Browser-visible paths use the public repository path directly, e.g.:

~~~text
data/json/core/...
data/json/registries/...
~~~

When a public path changes:

1. create the new path,
2. update all Python/JS/HTML/JSON/document references,
3. update Service Worker cache entries,
4. update CI/workflows,
5. remove the old path,
6. search for stale path strings,
7. run compile/tests/Search Core validation.

## 6. Delete policy

Delete files from the active tree when they are unreferenced temporary/build/test assets and Git history already preserves provenance.

Archive instead of delete when the file is a meaningful historical data version.

Examples from the first cleanup:

- `temp.json` → delete: temporary/unreferenced duplicate-sized artifact.
- `mp3/my.mp3` → delete: unreferenced test/media asset.
- FAQ v0.1–v0.3 → archive: meaningful retrieval/data history.
- old methodology document → move to `docs/methodology/`: historical knowledge, not root runtime content.

## 7. URL-sensitive modules

Do not casually move these in the same pass as data cleanup:

- root HTML routes
- `64images/`
- PWA icons
- `CNAME`
- `manifest.json`
- `service-worker.js`

They can be modularized later, but public URL compatibility/redirect/cache behavior must be handled explicitly.

## 8. CI enforcement

`api/scripts/validate_repo_layout.py` rejects:

- reintroduced legacy data directories,
- required path loss,
- stale legacy path references in current text/code/data.

Repository organization is therefore part of governance, not only visual housekeeping.

## Frontend Static Data Runtime

Browser-facing pages should not use repository JSON as their primary runtime store for static datasets.

Frontend rule:

~~~text
governed source / JSON
→ generated JS projection
→ browser import
~~~

This avoids repeated static-data fetches and keeps the runtime on normal static assets. The corresponding risk is stale JS projection, so JS data modules must have an upstream source, generation/sync method and CI drift validation.

Do not solve a stale-JS problem by making the browser fetch JSON again. Solve it by making the projection reproducible.

See [FRONTEND_RUNTIME_DATA_POLICY.md](./FRONTEND_RUNTIME_DATA_POLICY.md).


## 9. KM residency policy

Important LOC knowledge must live in the repository.

Repository-resident KM includes:

- current architecture and responsibility boundaries,
- governance principles and lifecycle rules,
- API / Search / Graph contracts,
- repository tree and data architecture,
- Canon-adjacent design rationale,
- LOC1–8 maintained KM,
- rights / provenance / publication policies,
- historical trend analyses that materially affect current interpretation,
- structured registries used by Search / Graph / governance.

Chat history may be used as a source for reconstruction, but must not remain the only place where a material project decision exists.

### Required form

Preferred forms:

~~~text
docs/*.md
data/json/registries/*.json
~~~

A material decision discovered in conversation should follow:

~~~text
conversation / source evidence
→ reviewed interpretation
→ repository KM
→ registry/index update where applicable
→ Search / Graph visibility
~~~

### Non-repository material

The following may remain outside the repo until promoted:

- temporary brainstorms,
- unresolved hypotheses,
- personal notes with no project impact,
- raw private corpus that is not cleared for repository storage,
- ephemeral task discussion.

### Commercial-maintenance rule

If a new developer would need a piece of knowledge to safely modify or deploy LOC, that knowledge belongs in the repository.

> **Important KM must be versioned with the system it governs.**
