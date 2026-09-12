# Repository Directory Governance

## Goal

Keep one repository while separating five responsibilities clearly: application routes, shared runtime, domain data, source/public assets, and deployable services.

The repository root must not become a storage area for domain-specific files. New work should be placed by responsibility, not by file extension or historical feature name.

## Canonical top-level structure

```text
app/        Next.js routes and UI
lib/        shared runtime adapters and reusable logic
modules/    language-module definitions and adapters
assets/     source/domain assets that are not public by default
public/     generated or explicitly selected browser-delivery assets
data/       canonical, companion, registry, source and generated datasets
docs/       governance, architecture and API documentation
schemas/    data contracts and validation schemas
services/   API/edge/deployment services
scripts/    repository/build/migration scripts
skills/     GPT/agent skills
.github/    CI and repository automation
```

`public/` is a delivery boundary, not a source-of-truth directory. Build scripts decide what enters it.

## Domain rules

### LunaRunes

Target structure:

```text
data/lunarunes/
  canonical/runes.json
  companions/lots.json
  companions/history.json
  companions/harmony.json
  grammar/
  evolution/

assets/lunarunes/
  cards/
  icons/
```

LunaRunes is a language module inside LOC; its datasets must not define the global meaning of `core` for the entire repository.

### Language modules

Target structure:

```text
modules/
  lunarunes/
  zhengde-style/
  ...future modules
```

A module may define search collections, schemas, classification rules, presentation metadata and governance, but should not duplicate shared runtime infrastructure.

### Services

Target structure:

```text
services/
  api/
  cloudflare/
```

`card_api/` and `loc8_api/` are legacy responsibility names and are migration targets, not patterns for new top-level directories.

### Assets

Do not create parallel `images/`, `pics/`, `64images/` style roots. Use:

```text
assets/source/          original non-public source assets
assets/lunarunes/       LunaRunes domain assets
assets/site/            shared branding/site assets
public/                 only selected runtime delivery assets
```

## Current legacy debt and target

| Current | Status | Target |
|---|---|---|
| `64images/` | migrate | `assets/lunarunes/cards/` |
| `pics/` | migrate | classify into `assets/site/`, `assets/source/`, or domain assets |
| `icons/` | migrate | `assets/site/icons/` or domain-specific asset path |
| `card_api/` | migrate | runtime → `services/api/`; docs → `docs/api/`; offline builders → `scripts/` |
| `loc8_api/` | migrate | `services/api/` after endpoint/consumer audit |
| `engine/` | audit | `lib/`, `modules/`, or `services/` by responsibility |
| root `LunaRune66.xlsx` | migrate | `data/lunarunes/source/` |
| root `all.xlsx` | audit/migrate | `data/source/` or retire if superseded |
| root PWA icons/manifest/service worker | legacy | move/retire as Next/PWA migration completes |
| root redirect HTML | temporary compatibility | retire after Next production promotion |
| root `css/` and `js/` | legacy static runtime | retire after remaining static entrypoints migrate |

## Migration order

1. Establish canonical roots and CI governance.
2. Move documentation and files with no runtime dependency.
3. Audit service consumers, then migrate API/runtime code.
4. Migrate source/domain assets and update consumers.
5. Migrate LunaRunes data paths through the shared `LOC_DATA` registry.
6. Retire legacy HTML/CSS/JS after production validation.
7. Remove compatibility directories only after CI and browser smoke tests pass.

## Next.js performance and modularity rules

- Route responsibility must remain explicit.
- Feature JavaScript, CSS and JSON should load only for the feature that consumes them.
- Data paths must be registered centrally before use.
- Static export remains preferred for public LOC pages unless a server feature is required.
- `app.lo3rwang.cc` is for interactive applications; `api.lo3rwang.cc` is the machine-service boundary.
- Personal/daily-life data remains local-only and outside public App/API deployment.

## Root rule

New domain-specific folders must not be added at repository root. New work belongs under `app/`, `lib/`, `modules/`, `assets/`, `data/`, `docs/`, `schemas/`, `services/`, `scripts/`, or `skills/`.