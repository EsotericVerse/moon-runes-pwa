# PostgreSQL Data and Schema Migration

## Current target

The runtime target is Supabase PostgreSQL. Application queries pass through a database provider boundary. The configured adapters currently support Supabase and PostgreSQL services that expose the same PostgREST query and RPC contract. Canonical table names, export files and batch tooling use provider-neutral names.

This is PostgreSQL-to-PostgreSQL portability. Feature code uses the shared client/query boundary; vendor SDK imports are restricted to `app/loc/providers/` and checked by `npm run verify:db-adapters`. The provider contract covers schema/table reads, filters, OR filters, ordering, exact counts, ranges, authenticated CRUD, keyword writes, management writes and account sessions.


Public-read continuity is a default portability capability. Supabase is the primary public data source and Neon is the backup public data source. Anonymous public SELECTs automatically retry against Neon when the primary read fails. Authenticated writes, management operations and account actions never fail over automatically. The UI must always disclose both sources and must label backup reads as 備援資料 because the two PostgreSQL copies can have synchronization delay.

A single paged read chain is pinned to one source after its first successful page so a result set never mixes Supabase and Neon rows. A new query starts by trying the primary source again.

Public feature queries may rely only on the common Data API contract: SELECT, filters, ordering, exact count and range pagination. Optional PostgREST grouped aggregate features are not part of the portable contract and must not be required by Search, Statistics, Culture or other public features.

For Google Cloud SQL PostgreSQL, keep pages and features unchanged: provide a secure Data API gateway that implements this contract, add one adapter under `app/loc/providers/`, and register it in `configured.mjs`. Do not connect a browser directly to Cloud SQL or expose database credentials. If the gateway speaks PostgREST, the existing generic adapter can be configured.

Moving to a database without the PostgreSQL/PostgREST contract requires translating the same adapter contract and schema. The checked-in schema generator emits PostgreSQL DDL; MySQL and SQLite are not configuration-only targets.

## Refresh the checked-in schema

1. In the active PostgreSQL SQL editor, run `docs/sql/portability-source-inventory.sql` and save its single JSON result as a private local `current-catalog.json`.
2. Run `docs/sql/portability-source-boundary.sql` and save its JSON result as a private local `current-boundary.json`. This boundary export contains management and user-owned records; never commit it.
3. Run:

```sh
python scripts/refresh-portable-schema.py /path/to/current-catalog.json /path/to/current-boundary.json
```

This regenerates `docs/sql/portable-current-schema.sql` from every current relation in `silver` and `api`, including tables added for new Scopes. The catalog SQL discovers columns, types, defaults, keys, indexes, views, functions, triggers and grants. No table-by-table schema lookup is needed.

## Prepare a data transfer

Use `scripts/export-public-db.mjs` to export canonical rows from the configured provider, then `scripts/prepare-data-load.py` to create bounded SQL batches and field-by-field verification queries. Keep row exports, owner boundary data and batch files in a private temporary directory; do not commit them.

## Supabase application settings

The Supabase Data API must expose `silver` and `api` under Project Settings → API. Public reads use the publishable key and database grants/RLS; Google OAuth sign-in uses the Supabase Auth project configuration. Keep the publishable key public and never place a service-role key in browser code.
