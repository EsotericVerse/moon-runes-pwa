# Services

Deployable machine/edge services belong here only when they are part of the Current architecture.

RC8 currently has no application-owned API service under `services/api/`. The website runtime is the Next.js static export deployed through GitHub Pages, with canonical data handled by the Current Neon/domain modules.

Retired service paths must not return:

- `services/api/loc8/` — former LOC8 Google Apps Script service
- former card API / local-JSON delivery services
- legacy top-level `card_api/` or `loc8_api/`

Repository/build/migration helpers belong under `scripts/`; historical API documentation may remain under `docs/api/` only when it is clearly marked retired.
