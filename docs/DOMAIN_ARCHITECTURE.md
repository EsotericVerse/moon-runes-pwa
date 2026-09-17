# Domain Architecture

## Responsibility model

```text
lo3rwang.cc             lo3rwang personal identity and public portal
loc.lo3rwang.cc         LOC model, knowledge, governance, search, context, evolution
lrunes.lo3rwang.cc      LunaRunes product identity and rune reference
app.lo3rwang.cc         interactive applications and workspace
api.lo3rwang.cc         machine-service interface
```

## Canonical domains

### `lo3rwang.cc`
Canonical public identity and portal for 王政德 / Lucas Oscar Wang / lo3rwang. It may present personal roles, selected work, personal context and public links, and may route visitors into LOC or LunaRunes without duplicating their full functionality.

There is no Current `author.lo3rwang.cc`, `whoami.lo3rwang.cc`, or `lo3rwang.lo3rwang.cc` identity domain.

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
LunaRunes product/reference identity. It describes and exposes LunaRunes as a symbolic language module, including rune reference, draw semantics, companion datasets and learning material.

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
- LunaRunes = symbolic language module identity
- lo3rwang = personal identity and portal

`app` and `api` may share the same repository and schemas, but must remain separate deployment responsibilities.
