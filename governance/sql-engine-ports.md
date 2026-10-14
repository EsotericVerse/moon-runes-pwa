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
3. `supabase/functions/loc-kysely/drivers.ts`: maps the selected port to the documented Kysely driver; credentials must only exist in server secrets.
4. `app/loc/providers/kysely-runtime.mjs`: centralized parameterized SQL query builders (select, insert, update, delete, upsert).
5. `supabase/functions/loc-kysely/index.ts`: authenticated request/session boundary. PostgreSQL uses existing role/RLS; a database without compatible RLS must implement a trusted authorization adapter before permitting protected data or mutations.
6. `sql/portable-current-schema.sql`: current PostgreSQL schema snapshot. This file is **not** an automatically executable MySQL or SQL Server DDL conversion. Use Kysely's schema builder plus explicit type/index/constraint adapters when provisioning a destination, then the existing transactional snapshot importer.

## Connection configuration

Select Admin → Database Settings → New target → Vendor = Generic SQL → Engine/Driver → connection alias. The alias identifies a **server-side** secret, not a password field.

`LOC_DB_CONNECTIONS_JSON` (server/Edge secret only; do not commit real values):
```json
{
  "office_mysql": {"engine": "mysql", "url": "mysql://USER:PASSWORD@HOST:3306/silver", "tls": true},
  "azure_sql": {"engine": "mssql", "url": "mssql://USER:PASSWORD@HOST:1433/loc", "tls": true},
  "cloud_postgres": {"engine": "postgres", "url": "postgresql://USER:PASSWORD@HOST:5432/loc", "tls": true}
}
```

Target activation validates the secret alias and permissions before changing the selected row. The original Supabase control database stays authoritative for Admin target registry and authentication. Other engines **must already have a compatible schema, data and permissions**; selecting a driver does not itself create a database, migrate data or manufacture its credentials.

## Acceptance standard

- PostgreSQL is the only live database integration target required for this release.
- Verify adapter metadata, SQL dialect compilation, credential separation, safety checks and shared CRUD contracts automatically; do not require the developer to create MySQL, SQL Server or SQLite test servers.
- Do not claim complete protected-data portability while MySQL / SQL Server ACL and PostgreSQL-specific RPC replacements remain pending.
- Follow Kysely's documented `Dialect` / `Driver` / `DialectAdapter` interfaces; do not replicate ORM internals.
