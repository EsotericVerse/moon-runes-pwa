# Next.js / Service Migration Inventory

## Governing principle

Next.js is the single primary application maintenance surface. Canonical data remains independent. Render, Cloudflare KV, Google Drive OAuth, and other providers remain available through adapters / services and must not grow into parallel application layers.

The target maintenance model is:

- canonical data: update once;
- Next.js application modules: update once;
- provider adapters: keep only provider-specific transport, persistence, authentication, or server-only work;
- no duplicated UI, search engine, cache engine, record schema, or business rules per provider.

## Current shared storage direction

`app/loc/model/record-model.js` is the provider-neutral record model. IndexedDB writes pass through it; Google Drive OAuth already exists as a browser transport. KV and future server storage should converge on the same record envelope instead of defining another application schema.

```text
Next.js feature / storage orchestration
        ↓
Shared record model
        ↓
IndexedDB adapter | KV adapter | Google Drive OAuth adapter | future backend adapter
```

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
- Application-facing storage orchestration: local IndexedDB vs KV vs Google Drive adapter.
- User-facing management UI. Provider worker should not become a second UI application.

A future daily-rune flow may be local-first on mobile and synchronize, with user authorization, into the user's own Google Drive. KV remains available for lightweight remote state where useful.

## services/api/card — file-level classification

The Python service remains an optional backend capability. It is not the primary website implementation. Do not remove it merely because the current website does not call Render.

| File | Classification | Migration decision |
| --- | --- | --- |
| `main.py` | service bootstrap / compatibility | Preserve as optional backend entrypoint for now; remove directory-migration bootstrap only after backend path handling is normalized. |
| `core_main.py` | mixed FastAPI transport + application/business logic | Split over time. Preserve HTTP/server boundary; move reusable rune/divination/search business rules toward shared/canonical modules where Next.js already owns the feature. Do not delete until parity is verified. |
| `unified_search.py` | duplicated application search orchestration + server fallbacks | Next.js Search is now primary. Keep temporarily for optional backend compatibility; progressively retire duplicated orchestration after feature/ranking parity is documented. Render-specific shard-memory comments/workarounds are migration debt, not canonical architecture. |
| `runtime_app.py` | Render/deployment-specific performance wrapper | **Legacy-workaround candidate.** It installs SQLite/lru-cache patches specifically to avoid repeated JSON parsing and small Render instance memory cost. Remove from the active path once no deployment depends on it; retain history if useful. |
| `runtime_text_bundle.py` | Render-era FastAPI route monkey patch | **Legacy-workaround candidate.** It patches an existing `/search` route to avoid repeated server scans. Next.js segment Search supersedes this hot-path optimization. Remove only after confirming no active backend entrypoint imports it. |
| `facebook_search.py` | optional heavy/server search engine | Preserve as optional server capability for large historical corpus / SQLite search. It must not become a second primary UI search stack. |
| `faq_rag.py` | optional dependency-free retrieval engine | Preserve until Next.js retrieval parity is explicit. Longer term either expose as optional server analysis or port the governed retrieval/index logic into shared build/runtime modules. |
| `loc3_search.py` | duplicated LOC3 search/ranking logic | Next.js Search is primary; preserve temporarily because concept expansion/ranking may not yet have full parity. Move governed concept mappings out of Python constants before retirement. |
| `corpus_analysis.py` | heavy/offline analysis | Preserve as server/build analysis capability. This is appropriate outside the browser for large corpora. It should not own UI/runtime state. |
| `keyword_analysis.py` | analysis/build utility | Candidate to move under `scripts/` or a shared Python analysis package. Keep server imports working until callers are separated. |
| `loc4_chapter_analysis.py` | offline/heavy content analysis | Preserve as build/server analysis. Prefer precomputed output consumed by Next.js when results are deployment-static. |
| `loc_graph.py` | server graph analysis | Keep only for graph work that is genuinely heavier than the current 66-rune browser Graph. Duplicated small Graph behavior should converge to Next.js. |
| `build_facebook_keyword_index.py` | build-only index generator | Move to `scripts/` after fixing path/import assumptions. Current `REPO_ROOT` calculation reflects pre-migration layout and is known migration debt. |
| `build_loc4_runtime_index.py` | build-only runtime-index generator | Move to `scripts/` after checking generated-output consumers. Do not keep build generators inside runtime API package long term. |
| `build_threads_search_index.py` | build-only search-index generator | Move to `scripts/` after checking generated-output consumers. |
| `paths.py` | service path adapter | Preserve while Python service exists; eliminate duplicated path conventions when build tools leave the service package. |
| `requirements.txt` | provider/service dependency manifest | Preserve with optional Python backend. Do not make Next.js depend on it. |
| `test_*.py` | service/build regression tests | Keep with the capability being tested; move tests alongside modules when modules migrate. |

### Immediate convergence order

1. Shared record model in Next.js — started.
2. Keep Google Drive OAuth as browser storage adapter; align future KV adapter to the same record model.
3. Move build-only Python generators out of `services/api/card` after correcting repo-root/import assumptions.
4. Confirm whether any deployment imports `runtime_app.py` / `runtime_text_bundle.py`; if none, remove them from active service runtime first because they are the clearest Render-specific workaround layer.
5. Compare `loc3_search.py`, `faq_rag.py`, `facebook_search.py`, and `unified_search.py` behavior against current Next.js Search before retiring any backend search capability.
6. Preserve `corpus_analysis.py` / chapter analysis / genuinely heavy processing as optional server or build work.

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
