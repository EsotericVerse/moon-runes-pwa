# Runtime / Storage Migration Note

## Current position

LOC uses Next.js as the application layer and Neon as the Current persistence/data layer.

- Shared/canonical runtime data: Next.js static-export clients → direct Neon silver/vault canonical tables.
- Authenticated user records: `api.user_records`.
- Authenticated user settings: `api.user_settings`.
- Authentication: Neon Managed Auth.
- Authorization: PostgreSQL RLS using `auth.user_id() = owner_id`.

Vercel KV and Cloudflare KV are retired. IndexedDB and Google Drive are not Current persistence providers.

## Browser role

The browser performs interaction, rendering, draw computation, transient React state, and bounded in-memory performance caching. Durable records or preferences are not stored as a second browser database.

A one-time compatibility migration may read old IndexedDB/localStorage data after the user signs in, write it into Neon, then remove the old browser database/settings. That migration code is transitional compatibility, not a second Current storage layer.

Search routing hints and performance telemetry may remain in process/session memory because they are disposable optimization state rather than user data or source-of-truth data. They are never persisted as JSON copies.

## Maintenance rule

Do not add a second persistence authority for convenience. New durable application data must be assigned explicitly to either:

1. direct Neon canonical SELECTs and controlled link tables;
2. authenticated/RLS-governed Neon user data.

Heavy/offline analysis may still use separate tools or services, but their output must enter the governed data pipeline before becoming Current application data.

## Non-goals

- Do not reintroduce KV as a fallback.
- Do not expose Postgres credentials in the browser.
- Do not use anonymous writes for personal data.
- Do not treat local browser caches as source of truth.
