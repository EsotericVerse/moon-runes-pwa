# LOC SQL engine ports / portable connection contract

This repository uses **Kysely**, not vendor-specific application CRUD. A database provider is a deployment target; an **engine** selects the Kysely dialect and driver.

## Engine matrix (prewired; not a claim of live cross-engine verification)

| Engine | Kysely dialect | Driver | Runtime / namespace | Session strategy |
|---|---|---|---|---|
| PostgreSQL (Supabase, Neon, Cloud SQL, RDS, Azure) | `PostgresDialect` | `pg` | Trusted Edge, `silver` schema | PostgreSQL roles and existing RLS |
| MySQL / MariaDB | `MysqlDialect` | `mysql2` | Trusted SQL gateway, `silver` database | External ACL port; not yet implemented for private writes |
| SQL Server / Azure SQL | `MssqlDialect` | `tedious` + `tarn` | Trusted SQL gateway, `silver` schema | External ACL port; not yet implemented for private writes |
| SQLite | `SqliteDialect` | Compatible persistent SQLite driver | Trusted persistent local gateway, attached `silver` namespace | External ACL port; not deployable on ephemeral Edge filesystem |

Kysely API references:

- [Dialect interface](https://kysely-org.github.io/kysely-apidoc/interfaces/Dialect.html)
- [MySQL driver configuration](https://kysely-org.github.io/kysely-apidoc/interfaces/MysqlDialectConfig.html)
- [SQL Server driver configuration](https://kysely-org.github.io/kysely-apidoc/interfaces/MssqlDialectConfig.html)
- [SQLite dialect](https://kysely-org.github.io/kysely-apidoc/classes/SqliteDialect.html)
- [Migrations and dialect-dependent DDL](https://kysely-org.github.io/kysely-apidoc/interfaces/DialectAdapter.html)

## Contract ownership

1. `app/loc/providers/sql-engine-ports.mjs`: **single engine port registry** shared by Admin UI and Edge target execution. All engine additions register here; LOC feature modules should never branch on cloud vendor.
2. `app/loc/providers/selected-database-target.mjs`: validates chosen engine, provider, mode and **server-side connection alias**.
3. `supabase/functions/loc-kysely/drivers.ts`: maps the selected port to the documented Kysely driver; credentials stay on the trusted runtime. `database-connections.ts` stores Admin-entered credentials in encrypted Supabase Vault and resolves saved aliases.
4. `app/loc/providers/kysely-runtime.mjs`: centralized parameterized SQL query builders (select, insert, update, delete, upsert).
5. `supabase/functions/loc-kysely/index.ts`: authenticated request/session boundary. PostgreSQL uses existing role/RLS; a database without compatible RLS must implement a trusted authorization adapter before permitting protected data or mutations.
6. `sql/portable-current-schema.sql`: current PostgreSQL schema snapshot. This file is **not** an automatically executable MySQL or SQL Server DDL conversion. Use Kysely's schema builder plus explicit type/index/constraint adapters when provisioning a destination, then the existing transactional snapshot importer.

## Connection configuration

Admin → 資料庫設定 exposes **Type → Provider → Link**. PostgreSQL providers include Supabase, Neon and Standard SQL. MySQL and SQL Server use Standard SQL. The Link stores a server location, **not a password**.

- Standard SQL: **Host/IP:Port**, Database, User, Password.
- Supabase: Project ID or project URL, optional Region and Database/User/Password (required when configuring a new connection).
- Neon: database endpoint or Data API URL (Project ID alone does not identify a PostgreSQL endpoint), optional Region, Database/User/Password.
- Existing current Supabase / Neon connections may reuse their trusted server-side credentials without re-entering a password. A **changed Link without matching credentials must fail closed** rather than accidentally query the previous database.

The authenticated Admin save action calls `save_database_target` on the trusted Edge function. It validates Admin permissions, stores new credentials in **Supabase Vault**, and saves only non-secret connection metadata in `silver.database_targets`. After saving, the Kysely driver factory resolves the selected **Link + credential profile** dynamically on subsequent requests. It does not require source edits or an Edge redeploy for the selected target.

The older `LOC_DB_CONNECTIONS_JSON` environment variable remains a compatibility fallback; it is no longer the required Admin workflow. Supabase stays the management and authentication control plane even if another database is selected.

The target database must still exist and have the LOC schema and permissions available. Changing Type/Link does not migrate data or manufacture a user account. For now, Neon mirror requests remain read-only; MySQL and SQL Server protected writes need their authorization adapter before those operations may be enabled.

## Acceptance standard

- PostgreSQL is the only live database integration target required for this release.
- Verify adapter metadata, SQL dialect compilation, credential separation, safety checks and shared CRUD contracts automatically; do not require the developer to create MySQL, SQL Server or SQLite test servers.
- Do not claim complete protected-data portability while MySQL / SQL Server ACL and PostgreSQL-specific RPC replacements remain pending.
- Follow Kysely's documented `Dialect` / `Driver` / `DialectAdapter` interfaces; do not replicate ORM internals.
