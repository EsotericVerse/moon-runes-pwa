# Next.js / Service Migration Inventory

## Current governing model

Next.js is the primary application surface. The deployed frontend remains a static export. Shared/canonical LOC runtime data is provided by Neon; provider-specific storage must not grow into a parallel application layer.

## Shared data — Current

`app/loc/data.js` is the single shared runtime loader.

```text
Next.js feature
  -> fetchLocJson / fetchLocJsonBatch / fetchLocDataSegments
  -> Neon Data API
  -> api.runtime_json_documents
```

Current rules:

- Shared/canonical runtime reads use Neon Data API only.
- Statistics and Daily Rune use the same Neon Current projection.
- Context, Culture, Search, LunaRunes data, registries, and governed generated projections use the same loader.
- Large text/music corpora remain manifest/shard based and are loaded on demand, but the shards themselves are fetched from Neon.
- Browser IndexedDB is not a cache/source for shared datasets.
- Cloudflare KV and Vercel KV are not shared LOC state providers.
- `app/loc/data-local.js`, `app/loc/data-sync.js`, `app/loc/kv-state.js`, `services/cloudflare/loc-state-worker.js`, and root `wrangler.toml` are retired.
- CI must reject reintroduction of the old shared IndexedDB/KV path.

## User-owned working records

`app/loc/local-db.js` remains a browser-local working-record store for features such as Library/Classify/MyStyle. This is not the canonical/shared LOC dataset.

`app/loc/storage.js` currently exposes browser-local working-record storage and user-owned Google Drive backup. These records must not be silently converted into anonymous Neon writes. A later remote-write migration requires Neon Auth/RLS and an explicit per-user data model.

## Management authentication

`services/cloudflare/auth-worker.js` remains only as a management authentication/session boundary. It no longer proxies writes to a state/KV worker.

## Search governance

`data/json/registries/LOC_SEARCH_GOVERNANCE.json` remains the provider-neutral semantic query authority. Next.js Search loads it through Neon along with the other Current projections. Search concurrency, bounded segment batches, scope partitioning, routing, and telemetry remain application concerns rather than storage-provider behavior.

## Optional/offline services

Python search/analysis services, Render-era compatibility code, Apps Script, and offline build utilities are not the primary website runtime. They may be retained when they provide distinct heavy/offline/migration capability, but they must not become a second Current shared-state authority.

## Completed migration — 2026-09-18

1. Neon Bronze/Silver/Vault/Gold foundation established.
2. Neon Data API enabled for the production branch.
3. `api.runtime_json_documents` established as the public read-only Current JSON projection.
4. Every registered `LOC_DATA` runtime path verified present in the projection.
5. Text corpus and music search shards verified present.
6. Shared Next.js data loader changed from static JSON + IndexedDB cache to Neon Data API.
7. Statistics and Daily Rune switched to the Neon-backed loader.
8. Governance shared-state reads switched to Neon.
9. Browser shared-dataset IndexedDB cache/sync adapters removed.
10. Cloudflare KV state adapter, state Worker, and deployment configuration retired.
11. Management authentication detached from the retired state proxy.
12. CI contracts updated to prevent regression to the old shared-state architecture.

## Remaining separate work

- Design authenticated/RLS-governed Neon persistence only if browser-local user working records need cross-device storage.
- Continue normalizing Silver/Vault/Gold domain models without making the public frontend depend on private Vault content.
- Retire optional legacy services only after their external consumers are explicitly verified.

## Non-goals

- Do not expose database credentials to the browser.
- Do not reintroduce KV as a fallback shared-state authority.
- Do not make user-private data public merely to unify storage technology.
- Do not force heavy/offline analysis into the browser.
