# Authentication architecture

## Current authentication

The Current application uses Neon Managed Auth. The browser initializes `@neondatabase/neon-js` with the Neon HTTPS database endpoint and uses the managed Google OAuth flow.

The authenticated JWT is forwarded by the Neon client to the Data API, where PostgreSQL RLS controls personal records and settings.

## Data boundaries

### Public/shared Current data

```text
Static Next frontend
  -> Next server route
  -> Neon silver/vault canonical tables
  -> read-only response assembled per request
```

Public roles receive read-only access to the canonical tables allowed for that route; no runtime JSON document or copied projection is used.

### Authenticated personal data

```text
Next.js client
  -> Neon Managed Auth
  -> authenticated JWT
  -> Neon Data API
  -> api.user_records / api.user_settings
  -> RLS: auth.user_id() = owner_id
```

`api.user_records` stores user-owned records such as selected draw history, Library text, and classification results. `api.user_settings` stores personal style, style groups, theme, language, and UI preferences.

Anonymous users may browse/use public features but cannot CRUD personal tables.

## Retired paths

The Current application does not use:

- Vercel KV;
- Cloudflare KV;
- Cloudflare management-auth/state proxy;
- IndexedDB as durable persistence;
- Google Drive as an application persistence provider.

A temporary browser migration helper may read legacy IndexedDB/localStorage only once after successful Neon login, migrate those values into the authenticated Neon tables, and remove the old browser storage.

## Credential boundary

No Postgres password is exposed to the browser. The public Neon endpoint identifies the service; authentication and database permissions are enforced by Managed Auth, Data API roles, and RLS.

`npm run verify:auth` guards this architecture against reintroducing retired persistence/auth paths.
