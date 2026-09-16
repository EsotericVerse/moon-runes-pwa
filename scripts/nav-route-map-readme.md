# Scope NAV extension rule

`app/nav-route-map.js` is the runtime resolver. `scripts/nav-route-map.json` is the declarative contract used by CI.

When a new Scope is introduced, register its host/base, reserved first entry, role links, and home links. Shared functions (`context`, `statics`, `evolution`, `governance`, `search`) are inherited automatically. Do not hand-copy a new NAV per page.
