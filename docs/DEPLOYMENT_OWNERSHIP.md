# Deployment ownership

## Shared LOC data

Shared/canonical LOC runtime data is served directly from the Neon production Data API.

- Database: `neondb`
- Canonical runtime schemas: `silver`, `vault`, and protected `api` user/scope tables
- Runtime: Next.js static-export clients → direct Neon SELECT / controlled link writes
- Public reads are route-scoped and read-only; no JSON document table or copied projection is used.

Cloudflare KV is retired from LOC shared-state delivery. The repository must not contain a root `wrangler.toml` for `loc-state`, a `loc-state-worker.js`, or a browser KV state adapter. Do not restore those paths as a fallback.

## Management authentication

The former Cloudflare authentication/state Worker is not part of the current deployment. Management authentication uses Neon Managed Auth from the static client; it does not proxy shared state. Shared data reads use Neon independently.

## Frontend

The Next application is exported as static assets for GitHub Pages. Public Neon reads use the configured client/Data API boundary; no server route or deployment DATABASE_URL is required by the static frontend.

## Migration status — 2026-09-18

The shared runtime loader, statistics, Daily Rune, Context/Culture/Search data consumers, and governance shared-state reads use direct Neon canonical SELECTs. Legacy browser dataset caching and KV state adapters were removed.

User-owned local working records are a separate persistence concern. They must not be promoted to anonymous shared database writes; moving them to Neon requires an authenticated/RLS-governed design.

## PR verification

Use the current PR head SHA when checking deployment results. Verify that:

1. the Next static build succeeds;
2. every registered runtime source path resolves to an explicit Neon canonical client/table;
3. no shared runtime module imports local JSON, IndexedDB dataset, or KV state adapters;
4. no root KV Worker deployment configuration is reintroduced.
