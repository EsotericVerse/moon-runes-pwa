# Scope Edge Routing (historical Worker design)

> The current deployment is a Next.js static export on GitHub Pages. No
> Cloudflare Worker performs document routing in the current path. The policy
> and Worker notes below are retained as historical migration evidence and are
> not a deployment requirement.

## Authority

Edge routing does not own Scope truth.

Current authority remains:

`app/modular-v2/scope-registry.v2.js`

Build-time policy is derived by:

`scripts/scope-route-policy.mjs`

and emitted to:

`public/scope-route-policy.json`

Cloudflare enforcement uses:

`scripts/edge/cloudflare-scope-router.js`

The Worker must never duplicate domain, mount, alias or route lists.

## Policy model

The generated policy is default-deny for document/navigation routes.

Each host receives an explicit allowlist derived from:

- shared Feature routes
- Scope-local routes
- registered mount routes
- registered directory alias redirect metadata

Static assets and data requests are passed through and are not treated as Scope pages.

## Current examples

LunaRunes canonical domain:

```
https://lrunes.lo3rwang.cc/
https://lrunes.lo3rwang.cc/context
https://lrunes.lo3rwang.cc/list
https://lrunes.lo3rwang.cc/duel/one
```

Equivalent LOC mount:

```
https://loc.lo3rwang.cc/lrunes
https://loc.lo3rwang.cc/lrunes/context
https://loc.lo3rwang.cc/lrunes/list
https://loc.lo3rwang.cc/lrunes/duel/one
```

Examples that must be denied as document routes:

```
https://lrunes.lo3rwang.cc/loc
https://lrunes.lo3rwang.cc/runes
https://lrunes.lo3rwang.cc/lrunes
https://loc.lo3rwang.cc/loc
https://loc.lo3rwang.cc/runes
```

Author directory Scope:

```
https://loc.lo3rwang.cc/lo3rwang
```

The external author alias domain may redirect to the registered directory mount according to generated policy.

## Cloudflare Worker configuration (superseded)

The Worker requires one environment variable:

`ORIGIN_BASE`

It must point to the underlying static Pages origin, not back to a hostname routed through the same Worker.

Example concept:

```
ORIGIN_BASE=https://<underlying-pages-origin>
```

The Worker then:

1. passes non-document assets/data to the origin;
2. loads `/scope-route-policy.json` from the origin;
3. checks the request host and normalized pathname;
4. returns 404 when the document route is not registered;
5. performs registered alias redirects;
6. proxies valid requests to the static origin.

The policy is cached inside the Worker isolate for 60 seconds.

## Governance

- Scope ID is not a URL slug.
- Domain, mount and alias are separate ingress concepts.
- `scopeType` controls canonical URL generation.
- `mount` does not imply alias.
- Unknown pathnames are not guessed.
- New page patterns must be explicitly registered.
- Reserved words are deployment-scoped governance settings, not global restrictions.
