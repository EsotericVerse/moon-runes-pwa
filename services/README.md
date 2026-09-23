# Services

Deployable machine/edge services belong here.

Current layout:

~~~text
services/
  api/
    loc8/
  cloudflare/
~~~

The website runtime is the Next.js static export deployed through GitHub Pages. The former OpenNext/Worker and card API paths were retired because they depended on server-side or local JSON delivery.

Repository/build/migration helpers belong under `scripts/`. API documentation belongs under `docs/api/`.

Legacy top-level `card_api/` and `loc8_api/` have been migrated; do not recreate feature-specific API directories at repository root.
