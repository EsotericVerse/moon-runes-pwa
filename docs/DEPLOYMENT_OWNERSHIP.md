# Deployment ownership

## Canonical API

The root `wrangler.toml` deploys `services/cloudflare/loc-state-worker.js` as the `loc-state` Worker. Its configured endpoints are `api.lo3rwang.cc` and the compatibility route `loc.lo3rwang.cc/api/loc-state/*`. `LOC_KV` belongs to this service and must be retained.

Connect this root configuration only to the `loc-state` Workers Builds project. Connecting it to a second Worker named `moon-runes-pwa` causes the CI Worker-name override to deploy the same API under another name and compete for the same routes (Cloudflare error 10020).

## Frontend

GitHub Pages and Cloudflare Pages are separate from the retired `moon-runes-pwa` Worker. Do not disable either frontend deployment solely because its repository has the same name. Verify live domain ownership and consumers before retiring a frontend host.

## Cleanup evidence — 2026-09-14

The owner reported disconnecting Git builds, disabling the public Worker URL, and deleting the duplicate `moon-runes-pwa` Worker. Before deletion, its Domains screen showed no custom domains or routes.

After deletion, live checks returned HTTP 200 for the LOC homepage, `https://api.lo3rwang.cc/health`, and the `loc-state` workers.dev health endpoint. The API health responses reported `ok: true`, `service: loc-state`, and `kv: true`. This health response is not a full data or write-path test.

The compatibility URL `https://loc.lo3rwang.cc/api/loc-state/health` returned HTTP 404 from GitHub Pages; do not treat that route as verified merely because it appears in Wrangler configuration. Its pre-deletion status and current consumers remain unverified.

## PR verification

Use the current PR head SHA when checking CI results. Successful Pages deployment does not by itself establish Workers deployment success. Verify that the retired Worker no longer creates new build checks on subsequent changes.
