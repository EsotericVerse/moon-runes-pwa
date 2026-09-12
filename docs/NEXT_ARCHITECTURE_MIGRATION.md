# Next Architecture Migration

This migration is intentionally additive first. The current static runtime remains active until each capability is moved and verified.

## Phase 1 — Introduce architecture

- Add Next.js App Router with static export.
- Keep the existing site runtime untouched.
- Reuse the current canonical `js/runes.js` through `lib/runes.js`.
- Reuse the current `js/galaxy.js` through `lib/galaxy.js`.
- Keep the current visual canon by importing `css/style.css` from `app/globals.css`.
- Validate the new architecture with a separate build workflow; do not deploy it yet.

## Phase 2 — Move existing capabilities

Target routes:

- `/runes` — one LunaRunes application. Absorbs the current `runes.html` and `lots.html` responsibilities.
- `/galaxy` — all-data / multi-system application. Absorbs the current `statics.html` responsibilities plus works, systems, statistics, algorithm, KM and FAQ views.
- `/context`
- `/evolution`
- `/governance`
- `/search`
- `/game`
- `/whoami`

Migration rules:

1. Move one capability at a time.
2. Preserve current behavior before visual refactoring.
3. Fixed canonical knowledge is imported as JS modules; do not add runtime JSON parse layers.
4. Large historical corpora may remain sharded and lazy-loaded.
5. Dynamic computation and user state stay behind `api.lo3rwang.cc`.
6. Shared UI belongs in layouts/components; feature presentation moves gradually to CSS Modules.

## Phase 3 — Remove legacy architecture

Only after equivalent routes are verified:

- replace legacy page links with Next routes;
- keep thin compatibility redirects where public links may still exist;
- remove retired HTML pages/loaders;
- remove obsolete JSON-to-runtime pipelines and duplicate fixed-data sources;
- switch deployment to the verified static export.

## Runtime principle

> Pre-structure static knowledge; minimize runtime interpretation.

Build-time and governance-time work should not be repeated by every browser session.
