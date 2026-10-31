# LOC independent Authority / recovery control

This is an **opt-in** Cloudflare Worker + SQLite-backed Durable Object control plane. It is not the LOC article database and does not use Supabase Auth, Neon Auth, RLS, PostgREST, or a live business database query to authenticate a recovery administrator.

## Boundary

- Public LOC homepage remains Guest and **never loads Clerk**.
- `/recovery/` loads ClerkJS only after the administrator opens that route. The Settings homepage merely links to it.
- Clerk authenticates the principal. The server verifies the signed session JWT (RS256, issuer, authorized party, expiration, not-before, signed subject/session). The **LOC root allowlist**, stored as a Cloudflare secret, controls recovery privileges. Never accept a user-supplied role claim.
- The control Worker stores database profiles in one SQLite-backed Durable Object. Credential bodies are encrypted using a separately managed 32-byte AES-GCM key. Public APIs return only nonsecret metadata.
- The trusted gateway (when implemented) may use Durable Object RPC `getProfileForGateway(id)`, which is not exposed over the public HTTP Worker entrypoint.
- The existing LOC app still uses its deployed Supabase/Neon routes. Selecting a control-plane primary currently **only records a target preference**. It must not be presented as a live cutover.
- All stored control information belongs to the independent control plane; never store it in `silver.manage`, `loc`, or the business database target list as the only copy.

## One-time provisioning (by the operator)

1. Create a Clerk application, turn on the desired Google OAuth/MFA settings, and obtain a verified Clerk recovery administrator user ID. No account is silently assigned root rights.
2. For the separate Worker `workers/loc-authority/wrangler.jsonc`, configure *secrets* (not source code):
   - `LOC_CLERK_ISSUER`: exact HTTPS session-token issuer.
   - `LOC_CLERK_JWT_PUBLIC_KEY`: Clerk JWT RSA public key in PEM format.
   - `LOC_RECOVERY_ROOT_CLERK_IDS`: one or more exact Clerk user IDs (comma-separated).
   - `LOC_CONTROL_ORIGIN`: exact LOC public HTTPS origin, e.g. `https://loc.lo3rwang.cc`.
   - `LOC_CONTROL_ENCRYPTION_KEY`: base64 of 32 random bytes; **keep a secure backup**. Losing it makes encrypted profiles unreadable.
3. Deploy `loc-authority-control` as an independent Cloudflare Worker with the Durable Object binding. Do not replace or alter `loc-isr`.
4. At the LOC web build, configure the **public** variables `NEXT_PUBLIC_LOC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_LOC_CLERK_FRONTEND_API_URL` (HTTPS Frontend API root URL), `NEXT_PUBLIC_LOC_CONTROL_URL` (HTTPS control Worker origin). Never put a Clerk secret key or the AES key into a `NEXT_PUBLIC_` variable.
5. Open `/recovery/`, sign in using Clerk, verify root access, and save a connection profile. Nothing is migrated or switched.

## Validated behaviors

Run `node --test scripts/test-independent-authority.mjs`. Tests cover signed/forged/wrong-origin/expired JWTs, root allowlist, encrypted secret storage, no password leakage to public API, and fail-closed behavior when unconfigured.

## Remaining production gate

Until a separate *trusted SQL Gateway* reads this control plane's selected target and enforces **LOC Scope authorization server-side** before queries, the deployed app cannot hot-switch databases based only on saved control data. This is intentional: a UI that says “切換成功” while the real app still uses another database would be a false recovery promise.

The portable SQL layer must then support PostgreSQL (including Google Cloud SQL), MySQL/MariaDB, SQL Server, and a persistent SQLite backend through engine-specific Kysely drivers. Authoritative permissions must be checked at the gateway, not outsourced to any single database's RLS. Only public reference data can bypass private Scope authorization. A signed-in user's recovery administration and business-data rights are distinct.

This project addition is deliberately isolated: it creates no business tables, changes no Supabase/Neon settings, and causes no background database queries or Clerk requests from Guest pages.
