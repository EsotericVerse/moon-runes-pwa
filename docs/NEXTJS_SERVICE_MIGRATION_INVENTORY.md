# Next.js / Service Migration Inventory

## Governing principle

Next.js is the single primary application maintenance surface. Canonical data remains independent. Render, Cloudflare KV, Google Drive OAuth, and other providers remain available through adapters / services and must not grow into parallel application layers.

The target maintenance model is:

- canonical data: update once;
- Next.js application modules: update once;
- provider adapters: keep only provider-specific transport, persistence, authentication, or server-only work;
- no duplicated UI, search engine, cache engine, record schema, or business rules per provider.

## Current shared storage direction

`app/loc/model/record-model.js` is the provider-neutral record model. `app/loc/storage.js` is the primary Next.js storage facade and now orchestrates IndexedDB, Google Drive OAuth, and the optional Cloudflare KV state adapter.

Current state:

- IndexedDB local records use the shared record model.
- True local writes refresh `updated_at`; imported/synchronized records preserve their remote timestamp.
- Google Drive OAuth remains user-owned `drive.appdata` storage.
- Next.js provides non-destructive IndexedDB → Drive backup and Drive → IndexedDB newest-wins merge.
- Cloudflare KV has a read-only browser adapter controlled by `NEXT_PUBLIC_LOC_STATE_URL`; no provider write token is exposed to the browser.
- `LibraryView`, `MyStyleView`, `ClassifyView`, and `StyleGroupsView` now consume the storage facade rather than importing storage providers directly.
- `scripts/verify-modularity.mjs` blocks `app/loc/views/*` from directly importing `local-db`, `google-drive`, or `kv-state`; provider access must go through `storage.js`.
- Canonical/static views such as Context and Evolution continue to use the canonical data loader; they are not forced through storage adapters when no user-state storage is involved.

```text
Next.js feature / storage orchestration
        ↓
Shared record model
        ↓
IndexedDB adapter | KV adapter | Google Drive OAuth adapter | future backend adapter
```

## Shared Search Governance

`data/json/registries/LOC_SEARCH_GOVERNANCE.json` is now the provider-neutral authority for governed semantic query bridges that were previously trapped in `loc3_search.py`.

Current state:

- The registry contains the existing author-governed concept bridge, out-of-domain regex, and intent-boost rules without changing their terms.
- `services/api/card/loc3_search.py` loads concept bridge, out-of-domain behavior, and intent boosts from the shared registry instead of hardcoding a second copy.
- `app/loc/search-governance.js` provides the Next.js query-governance helper.
- `SearchView` loads the same registry only when a search is submitted, expands matching concepts as OR terms, keeps the original query for display, uses governed terms for content matching, and uses the expanded routing query for segment routing.
- Existing Next.js search performance rules remain intact: global/small-source concurrency 2, segment batch size 2, bounded incremental segment loading, scope partitioning, adaptive segment routing, and telemetry.
- Search Governance is registered in `LOC_DATA`, so build-time public payload/version/index generation treats it as an on-demand singleton rather than adding a separate deployment path.

The shared registry is governance data, not a provider implementation. Python and Next.js may use different ranking/search engines while reading the same governed semantic authority.

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
- User-facing management UI. Provider worker should not become a second UI application.

Application-facing storage orchestration has already moved to Next.js. A future daily-rune flow may be local-first on mobile and synchronize, with user authorization, into the user's own Google Drive. KV remains available for lightweight remote state where useful. Browser-side KV writes remain intentionally disabled until a proper user authentication/session model exists.

## services/api/card — file-level classification

The Python service remains an optional backend capability. It is not the primary website implementation. Do not remove it merely because the current website does not call Render.

| File | Classification | Migration decision |
| --- | --- | --- |
| `main.py` | service bootstrap / compatibility | Preserve as optional backend entrypoint for now; remove directory-migration bootstrap only after backend path handling is normalized. |
| `core_main.py` | mixed FastAPI transport + application/business logic | Split over time. Preserve HTTP/server boundary; move reusable rune/divination/search business rules toward shared/canonical modules where Next.js already owns the feature. Do not delete until parity is verified. |
| `unified_search.py` | duplicated application search orchestration + server fallbacks | Next.js Search is now primary. Keep temporarily for optional backend compatibility; progressively retire duplicated orchestration after feature/ranking parity is documented. Render-specific shard-memory comments/workarounds are migration debt, not canonical architecture. |
| `runtime_app.py` | Render/deployment-specific performance wrapper | **Legacy-workaround candidate.** It installs SQLite/lru-cache patches specifically to avoid repeated JSON parsing and small Render instance memory cost. Repository deployment configuration does not currently reference it, but an external Render dashboard may; do not delete without confirming external deployment state. |
| `runtime_text_bundle.py` | Render-era FastAPI route monkey patch | **Legacy-workaround candidate.** It patches an existing `/search` route to avoid repeated server scans. Next.js segment Search supersedes this hot-path optimization. Repository deployment configuration does not currently reference it, but external service configuration must be checked before deletion. |
| `facebook_search.py` | optional heavy/server search engine | Preserve as optional server capability for large historical corpus / SQLite search. It must not become a second primary UI search stack. |
| `faq_rag.py` | optional dependency-free retrieval engine | Preserve until Next.js retrieval parity is explicit. Canon overrides are already externalized in the FAQ data area; continue separating governed data from retrieval implementation before deciding whether to port or retain server retrieval. |
| `loc3_search.py` | optional LOC3 ranking/search engine | **Governance duplication removed.** It now reads `LOC_SEARCH_GOVERNANCE.json` for concept bridges, out-of-domain rules, and intent boosts. Preserve the optional Python TF-IDF/ranking implementation until ranking parity and future server need are understood. |
| `corpus_analysis.py` | heavy/offline analysis | Preserve as server/build analysis capability. This is appropriate outside the browser for large corpora. It should not own UI/runtime state. |
| `keyword_analysis.py` | analysis/build utility | Candidate to move under `scripts/` or a shared Python analysis package. Keep server imports working until callers are separated. |
| `loc4_chapter_analysis.py` | offline/heavy content analysis | Preserve as build/server analysis. Prefer precomputed output consumed by Next.js when results are deployment-static. |
| `loc_graph.py` | server graph analysis | Keep only for graph work that is genuinely heavier than the current 66-rune browser Graph. Duplicated small Graph behavior should converge to Next.js. |
| `build_facebook_keyword_index.py` | build-only index generator | **Moved to `scripts/build_facebook_keyword_index.py`.** Repo-root assumptions were corrected; generated SQLite output remains under `services/api/card/generated/` for optional backend consumers. |
| `build_loc4_runtime_index.py` | build-only runtime-index generator | **Moved to `scripts/build_loc4_runtime_index.py`.** Generated SQLite output remains under the service `generated/` directory. |
| `build_threads_search_index.py` | build-only search-index generator | **Moved to `scripts/build_threads_search_index.py`.** Generated SQLite output remains under the service `generated/` directory. |
| `paths.py` | service path adapter | Preserve while Python service exists; eliminate duplicated path conventions when remaining build/analysis tools are separated. |
| `requirements.txt` | provider/service dependency manifest | Preserve with optional Python backend. Do not make Next.js depend on it. |
| `test_*.py` | service/build regression tests | Keep with the capability being tested; move tests alongside modules when modules migrate. |

### Completed convergence steps

1. Provider-neutral record model established in Next.js.
2. IndexedDB write/import semantics separated so synchronization preserves timestamps correctly.
3. Google Drive OAuth, IndexedDB, and read-only KV are registered behind the Next.js storage facade.
4. Google Drive backup and newest-wins merge orchestration centralized in Next.js.
5. `LibraryView`, `MyStyleView`, `ClassifyView`, and `StyleGroupsView` no longer import provider storage modules directly.
6. CI now enforces the storage-facade boundary for LOC views.
7. Three build-only Python index generators moved from `services/api/card` into `scripts/`, while preserving backend-generated output locations.
8. Provider-neutral LOC3 semantic search governance moved from Python constants into `LOC_SEARCH_GOVERNANCE.json`.
9. Python LOC3 search and Next.js Search now consume the same governed semantic authority while retaining implementation-specific ranking/loading behavior.

### Next convergence steps

1. Compare `faq_rag.py`, `facebook_search.py`, and `unified_search.py` behavior against current Next.js Search before retiring any backend search capability.
2. Identify additional governed data still trapped in Python code; move only provider-neutral rules into canonical/shared data where appropriate, not implementation-specific scoring mechanics merely for symmetry.
3. Confirm external Render deployment configuration before deactivating `runtime_app.py` or `runtime_text_bundle.py`.
4. Preserve `corpus_analysis.py`, chapter analysis, and genuinely heavy processing as optional server/build work rather than forcing them into the browser.
5. Add authenticated remote-write adapters only when a real user auth/session flow exists; never expose backend write tokens in client code.

## services/api/loc8

`services/api/loc8` has been inspected. It is a Google Apps Script + Google Sheets remote CRUD provider, not merely an obsolete static API.

Current provider responsibilities include:

- remote `User`, `Event`, `Era`, `Runes` daily draw, `History`, and `Relation` sheets;
- GET health/diagnostics and remote reads;
- create/update/delete for events, eras, daily draws, and relations;
- batch daily-draw update/delete;
- legacy daily-draw migration and CRUD smoke testing.

Decision:

- Preserve the provider while it may still be useful for remote Sheets-based state or migration.
- It is not part of the current Next.js hot path and no current Next.js import/reference was found.
- Do not expand Apps Script into a parallel UI/application layer.
- If LOC8 remote state is reactivated in the application, expose it through a Next.js/provider adapter and converge record shapes toward shared models rather than duplicating application rules.
- Do not delete or structurally split `Code.gs` until external Apps Script deployment usage is known.

## Migration order

1. Keep current site stable.
2. Centralize active application behavior in Next.js.
3. Define canonical record/model modules independent of storage provider.
4. Wrap IndexedDB, KV, Google Drive OAuth, Render, Apps Script, or future services behind adapters.
5. Migrate duplicated business rules toward shared modules only after parity is understood.
6. Remove only provider-specific workaround code that has no remaining runtime, compatibility, or future service value.

## Non-goals

- Do not remove Render capability permanently.
- Do not remove KV capability permanently.
- Do not remove Apps Script capability merely because it is not in the current hot path.
- Do not force all heavy work into the browser.
- Do not make Next.js the canonical data source.
- Do not keep parallel application stacks merely because they existed historically.
