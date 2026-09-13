# Next.js / Service Migration Inventory

## Governing principle

Next.js is the single primary application maintenance surface. Canonical data remains independent. Render, Cloudflare KV, Google Drive OAuth, and other providers remain available through adapters / services and must not grow into parallel application layers.

The target maintenance model is:

- canonical data: update once;
- Next.js application modules: update once;
- provider adapters: keep only provider-specific transport, persistence, authentication, or server-only work;
- no duplicated UI, search engine, cache engine, record schema, or business rules per provider.

## services/cloudflare/loc-state-worker.js

### Preserve as provider capability

- Cloudflare Worker request / response boundary.
- `env.LOC_KV.get`, `put`, `list` and KV-specific key storage.
- Provider-side token / cookie verification when server-side authorization is required.
- Remote lightweight state capability for future cross-device features.

### Converge toward shared Next.js / shared modules

- Daily rune canonical record shape and validation.
- Context event / relation record shape and validation.
- Evolution snapshot record shape and validation.
- Generic normalize / merge / sort rules that are not Cloudflare-specific.
- Application-facing storage orchestration: local IndexedDB vs KV vs future Google Drive adapter.
- User-facing management UI. Provider worker should not become a second UI application.

### Future storage path

One record model should support multiple adapters:

```text
Next.js feature / storage orchestration
        ↓
Canonical record model
        ↓
IndexedDB adapter | KV adapter | Google Drive OAuth adapter | future backend adapter
```

A future daily-rune flow may be local-first on mobile and synchronize, with user authorization, into the user's own Google Drive. KV remains available for lightweight remote state where useful.

## services/api/card

This directory currently contains substantial Python service/search/analysis functionality. Treat it as optional server-side capability, not as the primary web application implementation.

### Preserve server-only or heavy-work candidates

- Heavy corpus analysis that is unsuitable for browser working sets.
- Optional RAG / server-side analysis endpoints.
- Offline/build index generation tools when they genuinely belong outside runtime UI.
- Future Render or other backend service entrypoints.

### Review for convergence

- Search behavior duplicated by the current Next.js Search pipeline.
- Graph behavior duplicated by current Next.js graph/runtime modules.
- Runtime index logic that can be generated once at build time and consumed by Next.js.
- Business rules or record transformations that should be shared instead of existing only in Python endpoints.

Do not delete these files merely because the current website does not call Render. First classify each function as provider transport, heavy server computation, build tool, or duplicated application logic.

## services/api/loc8

Keep as an optional service boundary until its remaining responsibilities are inspected. Any generic application logic should converge toward shared modules; provider/server-only work can remain a service adapter.

## Migration order

1. Keep current site stable.
2. Centralize active application behavior in Next.js.
3. Define canonical record/model modules independent of storage provider.
4. Wrap IndexedDB, KV, Google Drive OAuth, Render, or future services behind adapters.
5. Migrate duplicated business rules toward shared modules.
6. Remove only provider-specific workaround code that has no remaining runtime, compatibility, or future service value.

## Non-goals

- Do not remove Render capability permanently.
- Do not remove KV capability permanently.
- Do not force all heavy work into the browser.
- Do not make Next.js the canonical data source.
- Do not keep parallel application stacks merely because they existed historically.
