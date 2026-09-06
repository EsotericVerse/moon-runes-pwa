# LOC Repository Tree & Module Contract

**Status:** Current  
**Version:** 0.1  
**Updated:** 2026-09-07  
**Purpose:** Developer onboarding, repository governance, commercial-maintenance baseline

## 1. Repository role

This repository is no longer treated as an ad-hoc personal code folder.

It is the maintained implementation repository for the LOC / Luna Codex language-system framework and must support:

- repeatable deployment,
- developer handoff,
- module ownership,
- data authority tracing,
- rights/governance review,
- deterministic tests,
- future commercial maintenance.

Personal-source material may exist in LOC6/LOC8 corpora, but repository structure itself must follow product-grade engineering rules.

## 2. Current top-level tree

~~~text
moon-runes-pwa/
├─ api/                     # production FastAPI / Search / Graph runtime
│  ├─ main.py
│  ├─ paths.py
│  ├─ faq_rag.py
│  ├─ loc3_search.py
│  ├─ loc_graph.py
│  ├─ unified_search.py
│  ├─ scripts/              # builders / validators / Graph evaluation
│  ├─ test_*.py             # API/Search regression tests
│  └─ requirements.txt
│
├─ data/
│  └─ json/
│     ├─ core/              # governed reusable runtime projections
│     ├─ registries/        # schema / policy / relationship / KM registries
│     ├─ search/            # retrieval views
│     ├─ generated/         # rebuildable indexes / analysis
│     ├─ archive/           # historical versions, excluded from current runtime
│     └─ experimental/      # research-only JSON
│
├─ engine/                  # research / embedding / training experiments only
├─ km/                    # maintained KM / architecture / governance docs
├─ js/                      # browser application logic
├─ css/                     # browser styles
├─ tools/                   # repository-wide builders/importers
├─ loc8_api/                # LOC8 Google Apps Script integration
├─ 64images/                # public URL-sensitive rune card assets
├─ pics/                    # visual assets; media governance still being normalized
├─ reels/                   # video assets; media governance still being normalized
├─ icons/                   # PWA icons
│
├─ index.html               # public route
├─ result.html              # public route
├─ list.html                # public route
├─ search.html              # public Unified Search route
├─ life.html                # LOC8 application route
├─ loc2.html                # LOC2 documentation/application route
├─ loc2-game.html           # LOC2 game route
├─ loc-overview.html        # overview route
├─ lo3rwang.html            # profile/public route
├─ share.html               # public route
├─ tutorial01.html          # public tutorial route
├─ zhengde-style.html       # public LOC6/style route
│
├─ LunaRune64.xlsx          # highest-priority rune mother source
├─ manifest.json            # PWA configuration
├─ service-worker.js        # PWA cache/runtime configuration
├─ render.yaml              # production API deployment
├─ CNAME                    # public domain configuration
├─ robots.txt
├─ sitemap.xml
├─ README.md
└─ COPYLEFT.md
~~~

## 3. Module ownership contract

### api/

**Production runtime.**

Contains only code that may participate in deployed API/Search/Graph behavior or production validation.

Deployment:

~~~text
render.yaml
→ rootDir: api
→ uvicorn main:app
~~~

Production Python code must use `api/paths.py` rather than rebuilding repository paths independently.

### engine/

**Research only.**

Embedding, training and experimental scripts live here.

Rules:

- must not become an undocumented second production API;
- must not contain duplicated full copies of core rune data;
- reads maintained projections from `data/json/core/`;
- experimental JSON belongs under `data/json/experimental/engine/`.

### data/json/core/

Contains reusable runtime projections only when a separate file has a clear technical reason to exist.

A projection is appropriate when it is:

1. sufficiently large or broadly reused,
2. semantically stable enough to have a clear contract,
3. independently consumed by multiple features, or
4. expensive/error-prone to reconstruct ad hoc.

Do **not** split every small JSON object into its own file merely for uniformity.

Current rune projections:

- `runes64.json` — basic rune lookup
- `rune_details.json` — detailed rune content projection where required
- `rune_interpretations.json` — orientation × moon-phase interpretation data
- `lots.json` — Lots/oracle projection
- `three_card_combinations.json` — three-card grammar support

`LunaRune64.xlsx` remains the upstream rune mother source.

### data/json/registries/

Governed machine-readable system structure:

- schemas,
- policies,
- authority mappings,
- ERA,
- Graph,
- governance,
- content rights,
- cross-LOC relations,
- KM asset registry.

Registries describe/reference authoritative data; they should not clone entire corpora.

### data/json/search/

Retrieval-specific views.

Search datasets may be denormalized for retrieval performance, but are not canonical sources.

### data/json/generated/

Rebuildable outputs.

Every generated dataset needs an upstream source/provenance path and a reproducible builder or documented reconstruction procedure.

### data/json/archive/

Historical material only.

Current runtime must never silently fall back to archive data.

### km/

Maintained knowledge and governance documents.

Documents that define engineering behavior are part of the repository contract, not informal notes.

Key documents:

- `REPOSITORY_TREE.md`
- `REPOSITORY_GOVERNANCE.md`
- `DATA_ARCHITECTURE.md`
- `JSON_DATA_MAP.md`
- `LOC_GOVERNANCE_CORE.md`
- `LOC7_KM.md`
- `LOC8_KM.md`

## 4. Public-route rule

Root HTML files are intentionally kept at repository root because the current static deployment exposes them directly.

Moving a root HTML file is a **public URL migration**, not ordinary cleanup.

It requires:

- redirect/compatibility planning,
- sitemap update,
- internal link update,
- Service Worker update,
- external-link impact review,
- deployment verification.

Likewise `64images/` is public-URL sensitive.

Do not move these simply to make the tree visually symmetric.

## 5. File naming rules

New maintained files should communicate role from the name.

Preferred:

~~~text
api/
data/json/core/runes64.json
data/json/registries/LOC_GRAPH_SCHEMA.json
data/json/search/faq/LOC_FAQ_RAG_v0.4.json
km/REPOSITORY_GOVERNANCE.md
~~~

Avoid:

~~~text
temp.json
all2.json
new_data.json
final_final.json
test-old.json
misc/
backup2/
~~~

Historical versions belong in `archive/`, not in current runtime directories.

## 6. Commercial-maintenance rules

Before a feature/data migration is considered complete:

1. production path is explicit;
2. owner/authority is explicit;
3. configuration and deployment references are updated;
4. all code references are updated;
5. Service Worker/public-route references are updated;
6. Registry/KM provenance paths are updated;
7. tests pass;
8. repository-layout validation passes;
9. no known stale path remains;
10. rollback/history remains available through Git rather than unmanaged duplicate files.

## 7. Current hygiene backlog

These items require separate evidence-based review and must not be deleted blindly:

| Item | Current status | Required decision |
|---|---|---|
| `all.xlsx` | root legacy workbook | identify authority/content; move to governed data source area or delete if redundant |
| root `requirements.txt` | possible legacy/deployment compatibility | compare with `api/requirements.txt`; retain only if an active workflow requires it |
| `pics/` | mixed visual assets | classify by public/runtime/documentation role |
| `reels/` | media assets | align with LOC5 media registry and deployment strategy |
| `64images/` | active public rune assets | retain path until explicit URL migration |
| root public HTML | active public routes | retain until routing layer exists |

## 8. Governance relationship

Repository structure follows LOC governance:

~~~text
stable responsibility boundary
+ explicit authority
+ traceable change
+ no silent overwrite
+ no unmanaged duplication
= maintainable evolution
~~~

This repository may contain personal-origin content, but engineering structure must remain usable by a developer who has no personal history with the author.

## 9. Copyleft and commercialization

Copyleft and commercialization are not mutually exclusive.

Commercial use must still preserve the project's applicable attribution, provenance, rights boundaries and share-alike/copyleft obligations described in `COPYLEFT.md`.

Before external commercial distribution, explicit standard software/content/data licenses should be normalized rather than relying only on an informal licensing statement.

---

**Repository maturity principle:** a new developer should be able to infer where a file belongs, which source is authoritative, and what must be tested before changing it.
