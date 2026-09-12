# Services

Deployable machine/edge services belong here.

Current layout:

```text
services/
  api/
    card/
    loc8/
  cloudflare/
```

Repository/build/migration helpers belong under `scripts/`. API documentation belongs under `docs/api/`.

Legacy top-level `card_api/` and `loc8_api/` have been migrated; do not recreate feature-specific API directories at repository root.
