# Domain Architecture

## Responsibility model

```text
lo3rwang.cc          root brand / portal
whoami.lo3rwang.cc   author identity
loc.lo3rwang.cc      LOC model, knowledge, governance, search, context, evolution
lrunes.lo3rwang.cc   LunaRunes product identity and rune reference
a pp.lo3rwang.cc      interactive applications and workspace
api.lo3rwang.cc      machine-service interface
```

> Note: the intended application hostname is `app.lo3rwang.cc` (without a space); the architecture rule below uses that canonical hostname.

## Canonical domains

### `lo3rwang.cc`
Root brand and navigation portal. It should not duplicate full LOC or application functionality.

### `whoami.lo3rwang.cc`
Public identity for 王政德 / Lucas Oscar Wang / lo3rwang: professional roles, selected work, author context and public links.

### `loc.lo3rwang.cc`
Public LOC knowledge/system surface. Responsibilities include:

- LOC overview
- Search
- Context
- Statistics
- Evolution
- Governance
- Documentation
- Language-module discovery

### `lrunes.lo3rwang.cc`
LunaRunes product/reference identity. It describes and exposes LunaRunes as a symbolic language model, including rune reference, draw semantics, companion datasets and learning material.

### `app.lo3rwang.cc`
Interactive execution surface. Candidate routes include:

- `/draw`
- `/game`
- `/dashboard`
- `/tools`

It must not contain remote personal/daily-life data. Daily/personal life records remain local-only.

### `api.lo3rwang.cc`
Machine-service boundary. API contracts, search endpoints, module endpoints and future programmatic services belong here.

## Governing principle

Domains are divided by responsibility, not by LOC1–8 numbering.

- LOC = understand / discover / govern
- App = operate / interact
- API = serve machines
- LunaRunes = product/module identity
- WhoAmI = author identity

`app` and `api` may share the same repository and schemas, but must remain separate deployment responsibilities.