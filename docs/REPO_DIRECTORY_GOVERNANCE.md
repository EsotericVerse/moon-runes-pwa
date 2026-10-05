# Repository Directory Governance

## Current structure

```text
app/        Next.js routes, UI, clients and feature modules
assets/     runtime/domain assets
docs/       Current architecture, design and governance
governance/ active repository governance state
pics/       approved site images
scripts/    Current build and verification utilities
tests/      Current browser/accessibility tests
.github/    Current CI and repository automation
```

## Canonical source files

Repository root keeps the two Current production sources that are actively consumed:

- `LunaRune66.xlsx` — LunaRunes mother workbook.
- `LunarRunesCardCut.pdf` — physical card download/printing source.

A Current canonical source has one repository location. Do not keep duplicate document/source copies in `data/` or `docs/`.

## Runtime data

Runtime content authority is Supabase PostgreSQL. Repository files are not a second runtime corpus, projection, cache or fallback.

## Module ownership

Application JavaScript belongs with its owning feature under `app/`. Shared modules must have a Current consumer and a clear responsibility.

Presentation rules belong to their formal CSS owner. Temporary or duplicate presentation layers must be merged into that owner and removed.

## Documentation

Keep only Current architecture, design, governance and release documents. Temporary notes, intermediate documents, snapshots and superseded copies do not remain in the Current tree.

## Release cleanliness

Before release:

- every file must have a Current consumer or Current governance/design responsibility;
- one canonical source must not have duplicate repository copies;
- build and verification utilities must validate Current contracts rather than preserve historical architecture names.
