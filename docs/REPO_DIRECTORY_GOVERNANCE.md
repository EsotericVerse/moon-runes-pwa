# Repository Directory Governance

## Goal

Keep one repository while separating application routes, JavaScript runtime, domain data, source/public assets, documentation, and deployable services clearly.

Directory cleanup must never delete or relocate a still-used source merely because a replacement directory exists. Migration order is always: inventory consumers → copy/move → update consumers → parity check → remove retired location.

## Canonical top-level structure

```text
app/        Next.js routes and UI
js/         JavaScript runtime modules and shared browser/runtime logic
assets/     governed domain/site assets
pics/       frozen approved source diagrams still used by the site
data/       frozen source workbooks, records and non-runtime provenance
docs/       governance, architecture, API documentation and governed document copies
services/   API/edge/deployment services
scripts/    repository/build/migration scripts
skills/     GPT/agent skills
.github/    CI and repository automation
```

`lib/` is retired. JavaScript belongs in `js/`; do not recreate a parallel JavaScript root.

## Frozen root sources

The following files are intentionally protected in place and are excluded from ordinary directory migration:

```text
LunaRune66.xlsx                 LunaRunes mother workbook / canonical source
LunarRunesCardCut.pdf           physical card printing and cutting source PDF
pics/LOC-FrameworkPic.png       approved framework diagram source
pics/LOC-structure.png          approved structure diagram source
```

A governed mirror or runtime derivative does **not** authorize deletion, replacement, or relocation of these frozen originals. Any future change to a frozen source location requires explicit approval.

## Domain rules

### LunaRunes

`LunaRune66.xlsx` is the frozen mother workbook. Website runtime reads Neon canonical tables; repository workbooks and records remain provenance/source material and must not silently replace the mother workbook.

A governed workbook copy may also exist under:

```text
data/lunarunes/source/LunaRune66.xlsx
```

The presence of that copy does not make the root mother workbook disposable.

LunaRunes assets currently include:

```text
assets/lunarunes/cards/        runtime card images
assets/lunarunes/reference/    overview/reference images
```

Do not collapse distinct large-card, small-card/overview, printable-card, or reference assets merely because they depict the same rune system. Their delivery and performance roles must be audited separately.

### JavaScript

All repository JavaScript modules live under `js/` unless they are route-local code under `app/`, service code under `services/`, or build tooling under `scripts/`.

Examples:

```text
js/runes-core.js
js/galaxy.js
js/writing.js
```

Do not recreate `lib/` for shared runtime modules.

### Services

Current canonical structure:

```text
services/
  api/
    card/
    loc8/
  cloudflare/
```

Repository-facing build and migration entrypoints belong under `scripts/`; API documentation belongs under `docs/api/`.

### Assets

Asset migration is not complete until every consumer is updated and visual/function parity is verified. In particular:

- `pics/` is currently an approved frozen source directory and is **not** a forbidden legacy root.
- `64images/` is retired only because its consumers are expected to use governed LunaRunes image paths; missing alternate-size assets must be restored rather than silently discarded.
- `LunarRunesCardCut.pdf` is a physical-card production asset, not beginner documentation.

## Migration ledger

| Historical/current location | Status | Rule |
|---|---|---|
| `lib/` | retired | JavaScript belongs in `js/` |
| `js/` | canonical | shared/runtime JavaScript root |
| `64images/` | retired pending parity audit | card assets must exist under governed LunaRunes paths before retirement is considered valid |
| `pics/` | active/frozen | retain approved source diagrams; do not delete by migration rule |
| `icons/` | migrated/audit | verify all consumers before retirement is considered complete |
| `card_api/` | migrated | runtime → `services/api/card/`; repository entrypoints → `scripts/card-api/`; docs → `docs/api/` |
| `loc8_api/` | migrated | `services/api/loc8/`; docs → `docs/api/` |
| `engine/` | audit | retain until consumers and parity are verified |
| root `LunaRune66.xlsx` | frozen canonical source | must remain in place unless explicitly approved otherwise |
| `data/lunarunes/source/LunaRune66.xlsx` | governed copy | does not supersede/delete the frozen root workbook |
| root `LunarRunesCardCut.pdf` | frozen production source | physical card printing/cutting PDF |
| `docs/LunarRunesCardCut.pdf` | governed document copy | does not redefine the PDF as tutorial content |
| root `all.xlsx` | migrated/preserved | `data/source/all.xlsx`; retire only after explicit supersession audit |
| root redirect HTML | compatibility | retire only after Next production parity validation |
| root `css/` | migration debt | retire only after remaining visual parity is verified |

## Migration order

1. Inventory every source file, consumer, visible section, interaction and asset variant.
2. Freeze canonical/source assets that must not move.
3. Create the destination without deleting the source.
4. Update every consumer and reference.
5. Verify content, behavior, visual, asset and wording parity.
6. Confirm build/CI after parity checks.
7. Remove an old location only when it is proven unused and removal is authorized.

Build success, route existence, modularity, or independence from legacy runtime is not by itself migration completion.

## Next.js performance and modularity rules

- Route responsibility must remain explicit.
- Feature JavaScript, CSS and canonical data clients should load only for the feature that consumes them.
- Data paths must be registered centrally before use.
- Server routes are preferred whenever a feature reads protected or canonical Neon data.
- Performance optimization must preserve intentional small/large asset variants rather than replacing all uses with the largest file.
- Legacy source pages remain parity evidence until their approved content and behavior have been accounted for.

## Root rule

New arbitrary domain folders should not be added at repository root. The frozen root exceptions above are intentional canonical/production sources and must not be moved by automated directory governance. Any future exception requires explicit governance approval.
