# Services

Deployable machine/edge services belong here.

Current layout:

~~~text
services/
  api/
    loc8/
  cloudflare/
~~~

The website runtime is the Next.js OpenNext server. The former card API was retired because it depended on local JSON datasets.

Repository/build/migration helpers belong under `scripts/`. API documentation belongs under `docs/api/`.

Legacy top-level `card_api/` and `loc8_api/` have been migrated; do not recreate feature-specific API directories at repository root.
