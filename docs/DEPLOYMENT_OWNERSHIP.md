# Deployment ownership

## Shared LOC data

Shared/canonical LOC runtime data is served directly from the Neon production Data API.

- Database: `neondb`
- Public runtime schema: `api`
- Current projection: `api.runtime_json_documents`
- Browser runtime: static Next export → Neon Data API
- Public runtime access is read-only through the database role grants.

Cloudflare KV is retired from LOC shared-state delivery. The repository must not contain a root `wrangler.toml` for `loc-state`, a `loc-state-worker.js`, or a browser KV state adapter. Do not restore those paths as a fallback.

## Management authentication

`services/cloudflare/auth-worker.js` remains an authentication/session boundary for the management UI. It does not own LOC data and must not proxy shared state. Shared data reads use Neon independently of the management auth session.

## Frontend

The Next application remains a static export. Cloudflare Pages/GitHub-hosted static frontend deployment does not require a Vercel server runtime, Vercel KV, or a Cloudflare KV data service.

## Migration status — 2026-09-18

The shared runtime loader, statistics, Daily Rune, Context/Culture/Search data consumers, and governance shared-state reads use the Neon Current projection. Legacy browser dataset caching and KV state adapters were removed.

User-owned local working records are a separate persistence concern. They must not be promoted to anonymous shared database writes; moving them to Neon requires an authenticated/RLS-governed design.

## PR verification

Use the current PR head SHA when checking deployment results. Verify that:

1. the static frontend build succeeds;
2. every registered runtime source path resolves in `api.runtime_json_documents`;
3. no shared runtime module imports IndexedDB dataset or KV state adapters;
4. no root KV Worker deployment configuration is reintroduced.
