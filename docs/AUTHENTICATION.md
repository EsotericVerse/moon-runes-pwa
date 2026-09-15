# Authentication architecture

This repository has two deliberately separate Google authorization flows. Management authentication protects shared Cloudflare KV mutations; Google Drive OAuth lets a user manually back up browser-local data into that user's private Drive app-data folder. Public reading, LunaRunes draws, and IndexedDB storage do not require an account.

## Components

| Component | Responsibility | Credentials it can see |
|---|---|---|
| `app/loc/auth-client.js` | Starts management sign-in, checks the session, and sends allowlisted management writes. | Only the HttpOnly session cookie through `credentials: 'include'`; JavaScript cannot read the cookie or the backend write token. |
| `services/cloudflare/auth-worker.js` | Better Auth endpoint, Google OAuth callback, admin-email authorization, session validation, and authenticated write proxy. | `BETTER_AUTH_SECRET`, Google client credentials, `LOC_ADMIN_EMAILS`, and `LOC_WRITE_TOKEN`, all server-side Worker secrets/config. |
| `services/cloudflare/loc-state-worker.js` | Reads shared KV publicly and guards mutations to eras, daily runes, and context. | `LOC_WRITE_TOKEN`; it accepts the proxy's Bearer token. A separate `/admin` break-glass form can exchange the same token for a derived HttpOnly cookie. |
| `app/loc/google-drive.js` | Requests `drive.appdata` and performs explicit backup/read operations against Google Drive. | A short-lived Google access token held only in module memory. No refresh token or Drive token is persisted by this repository. |
| IndexedDB/local storage adapters | Default local-first user data and UI state. | No account credential. |

## Management request flow

```text
Browser management UI
  -> auth-client signIn.social(provider: google)
  -> Auth Worker /api/auth/*
  -> Google OAuth (verified email)
  -> Auth Worker checks LOC_ADMIN_EMAILS
  -> secure HttpOnly Better Auth session cookie (fixed 2-hour TTL)

Browser write
  -> Auth Worker /management/state/{eras|daily-runes|context}
     with credentials: include
  -> server-side getSession + admin allowlist check
  -> Auth Worker adds Authorization: Bearer <LOC_WRITE_TOKEN>
  -> State Worker validates the token and mutates LOC_KV
```

The browser is restricted to three management paths and `POST`, `PUT`, or `DELETE`. The Auth Worker repeats authorization on every proxied write. Sessions use secure, HttpOnly, SameSite=Lax cookies, do not slide or refresh, and expire after two hours. CORS allows configured trusted origins and credentials; all authentication/session responses are `no-store`.

The State Worker also retains a break-glass `/admin` path. The operator enters `LOC_WRITE_TOKEN` directly into the Worker form; a successful login stores a SHA-256-derived value in a secure, HttpOnly, SameSite=Strict cookie for the configured admin TTL. The raw token is not placed in that cookie.

## Google Drive request flow

```text
User clicks backup or restore
  -> browser loads Google Identity Services
  -> token client requests https://www.googleapis.com/auth/drive.appdata
  -> access token is kept in JavaScript module memory
  -> Drive API request uses Authorization: Bearer <access token>
  -> JSON is read/written only in the user's appDataFolder
```

Drive access is user initiated; there is no background synchronization. `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is a public OAuth client identifier, not a secret. On a Drive `401`, the in-memory token is cleared and the user must authorize again. Signing out or clearing the Drive session also drops the in-memory token.

## Credential and token boundaries

- Server-only secrets: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `LOC_ADMIN_EMAILS`, `LOC_WRITE_TOKEN`, and the State Worker binding/configuration. They must be configured as deployment secrets and must never use a `NEXT_PUBLIC_` name.
- Browser-visible configuration: `NEXT_PUBLIC_LOC_AUTH_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. These locate public endpoints/identify the OAuth client; they do not authorize a shared-state write by themselves.
- Management session: carried as an HttpOnly cookie and validated server-side. Client code receives only the authorized user's name/email and expiry from `/management/session` after authorization succeeds.
- State write token: injected only between Workers. The normal management UI never receives it.
- Drive access token: scoped to `drive.appdata`, held in memory, attached only to Google Drive requests, and cleared after `401` or explicit session clearing.

`npm run verify:auth` guards the fixed session TTL, Google-only verified-email flow, server-side allowlist, session validation, browser credential mode, and mutation authorization checks.
