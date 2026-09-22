# Next.js / Service Migration Inventory

## Current governing model

Next.js is the primary application surface. The deployed frontend runs through the Next server on OpenNext/Cloudflare. Shared/canonical LOC runtime data is provided by Neon; provider-specific storage must not grow into a parallel application layer.

## Shared data — Current

`app/loc/data.js` is the single shared runtime loader.

```text
Next.js feature
  -> fetchLocJson / fetchLocJsonBatch / fetchLocDataSegments
  -> Next server route
  -> direct Neon canonical tables
```

Current rules:

- Shared/canonical runtime reads use explicit Neon server routes only.
- Statistics and Daily Rune use direct Neon SQL against canonical tables.
- Context, Culture, Search, LunaRunes data, and registries use shared route/client modules over canonical tables.
- Large text/music sources are loaded on demand from their canonical Neon relations; no local JSON shard is a runtime source.
- Browser IndexedDB is not a cache/source for shared datasets.
- Cloudflare KV and Vercel KV are not shared LOC state providers.
- `app/loc/data-local.js`, `app/loc/data-sync.js`, `app/loc/kv-state.js`, `services/cloudflare/loc-state-worker.js`, and root `wrangler.toml` are retired.
- CI must reject reintroduction of the old shared IndexedDB/KV path.

## User-owned records and settings

Authenticated personal persistence is now part of Neon rather than browser storage.

- `api.user_records` stores draw history, Library records, and classification results.
- `api.user_settings` stores personal style, style groups, theme, language, and UI preferences.
- Neon Managed Auth supplies the user session.
- Row-level security restricts each authenticated user to rows where `auth.user_id() = owner_id`.
- Anonymous/public users do not receive CRUD access to these tables.
- Legacy IndexedDB/localStorage durable data is imported once after the first Neon login and the old browser database is then removed.
- Search routing hints and telemetry remain session-memory performance state and are not authoritative persisted data.

The former `local-db.js`, `storage.js`, Google Drive persistence adapter, and Cloudflare management-auth proxy are retired.

## Management authentication

Management and personal sign-in use Neon Managed Auth. Shared Current reads remain public/read-only through the Neon Data API; user records/settings require an authenticated JWT and RLS.

## Search governance

Search uses the shared Neon table allowlist and schema-qualified canonical SELECTs; query policy stays in the application module and no local JSON registry is loaded.

## Optional/offline services

Python search/analysis services, Render-era compatibility code, Apps Script, and offline build utilities are not the primary website runtime. They may be retained when they provide distinct heavy/offline/migration capability, but they must not become a second Current shared-state authority.

## Completed migration — 2026-09-18

1. Neon Bronze/Silver/Vault/Gold foundation established.
2. Neon Data API enabled for the production branch.
3. Explicit Next server routes established for canonical rune, context, culture, search, writing, and statistics reads.
4. Every active runtime path now resolves to an explicit Neon canonical table or an explicit unmapped response.
5. Search, Culture, Context and Statistics use shared modules and controlled error responses.
6. Shared Next.js data loader changed from static JSON + IndexedDB cache to the Neon canonical route.
7. Statistics and Daily Rune switched to direct Neon-backed reads.
8. Governance shared-state reads switched to Neon.
9. Browser shared-dataset IndexedDB cache/sync adapters removed.
10. Cloudflare KV state adapter, state Worker, and deployment configuration retired.
11. Management authentication detached from the retired state proxy.
12. CI contracts updated to prevent regression to the old shared-state architecture.
13. Authenticated personal records/settings migrated to Neon `user_records` / `user_settings` with RLS.
14. IndexedDB, Google Drive persistence, and the old Cloudflare auth proxy retired from the Current application path.

## Remaining separate work

- Continue validating and refining the existing authenticated/RLS-governed Neon user persistence as features expand.
- Continue normalizing Silver/Vault/Gold domain models without making the public frontend depend on private Vault content.
- Retire optional legacy services only after their external consumers are explicitly verified.

## Non-goals

- Do not expose database credentials to the browser.
- Do not reintroduce KV as a fallback shared-state authority.
- Do not make user-private data public merely to unify storage technology.
- Do not force heavy/offline analysis into the browser.
