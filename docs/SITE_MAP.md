# Site Map

## Public navigation model

```text
lo3rwang.cc
├─ whoami.lo3rwang.cc
│  ├─ identity
│  ├─ professional roles
│  ├─ selected systems / creative work
│  ├─ selected articles
│  └─ public links
│
├─ loc.lo3rwang.cc
│  ├─ /
│  ├─ /search
│  ├─ /context
│  ├─ /statics
│  ├─ /evolution
│  ├─ /governance
│  ├─ /game              compatibility / public demo where appropriate
│  └─ /docs
│
├─ lrunes.lo3rwang.cc
│  ├─ rune reference
│  ├─ draw/lots semantics
│  ├─ history
│  ├─ harmony
│  ├─ grammar
│  └─ tutorial
│
├─ app.lo3rwang.cc
│  ├─ /
│  ├─ /draw
│  ├─ /game
│  ├─ /dashboard
│  └─ /tools
│
└─ api.lo3rwang.cc
   └─ versioned machine endpoints
```

## Boundary rules

- `loc` explains, searches, analyzes and governs.
- `app` executes interactive workflows.
- `api` exposes machine contracts.
- `lrunes` owns LunaRunes product/module identity.
- `whoami` owns author identity.
- Personal/daily-life records are local-only and must not appear in the public site map or remote API.

## Search and modules

LOC Search should remain module-aware rather than creating a separate website for each language module. Examples:

```text
/search?c=月之符文
/search?c=政德風
```

Future modules can register their own collection/configuration without duplicating the Search application.