# Authentication architecture

Management authentication and LOC data delivery are separate concerns.

## Management authentication

`services/cloudflare/auth-worker.js` provides the management Google OAuth/session boundary. It validates the administrator allowlist and issues a fixed two-hour secure HttpOnly session. It does not own, proxy, or mutate shared LOC state.

`app/loc/auth-client.js` only starts sign-in/sign-out and checks `/management/session`.

## Shared LOC data

Shared/canonical LOC runtime data is delivered directly from Neon Data API through `api.runtime_json_documents`. Public runtime access is read-only. No Cloudflare KV state proxy, Vercel KV, browser database credential, or server-side Postgres credential is used by the static frontend.

Public/current data flow:

```text
Static Next frontend
  -> Neon Data API
  -> api.runtime_json_documents
  -> governed Current payload
```

## Google Drive

Google Drive OAuth remains a separate, user-initiated backup path for browser-local working records. It uses `drive.appdata`; its access token is kept in browser module memory and is unrelated to shared LOC data.

## Credential boundaries

- Server-only management auth secrets: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `LOC_ADMIN_EMAILS`.
- Browser-visible configuration: `NEXT_PUBLIC_LOC_AUTH_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and optional `NEXT_PUBLIC_NEON_DATA_API_URL`.
- The Neon Data API URL is an endpoint identifier, not a database password. Access control is enforced by the Data API/Postgres role grants.
- Shared LOC runtime must remain read-only for anonymous/public access.
- User-owned records must not be moved to anonymous database writes; remote writes require authenticated/RLS-governed tables.

`npm run verify:auth` verifies the management session boundary and also prevents the retired KV state proxy/deployment path from returning.
