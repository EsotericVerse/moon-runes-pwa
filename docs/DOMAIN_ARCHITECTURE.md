# Domain Architecture

## Current deployment surfaces

| Surface | Canonical location | Responsibility |
| --- | --- | --- |
| LOC | https://loc.lo3rwang.cc/ | framework homepage and shared analysis/navigation |
| LunaRunes | https://lrunes.lo3rwang.cc/ | Symbolic Language product/runtime |
| LunaRunes mount | https://loc.lo3rwang.cc/lrunes/ | alternate ingress to the same `lrunes` Scope |
| Author | https://loc.lo3rwang.cc/lo3rwang/ | author Scope |
| Admin | https://admin.lo3rwang.cc/ | management/admin surface |

不存在第二套 Current whoami、manage、app 或 api domain architecture 定義。

## Responsibility

Domain/mount 是 deployment identity，不是資料表名稱。

Current route authority 是 Next filesystem。`app/modular/scope-registry.js` 只保存 deployment/navigation metadata，用來解析 canonical domain、mount 與 shared feature URL。

Data Scope 由 Supabase PostgreSQL 管理。Current `silver.manage` managed rows：

- `lo3rwang` — role admin
- `lrunes` — role scope

Current deployment 與 data Scope 都使用 canonical id `lrunes`；不保留 `lunarunes` runtime alias。

## Shared feature paths

Current shared features：

- /statics
- /culture
- /governance
- /search

LunaRunes 另外擁有自己的特殊 route，例如 game、list、duel/*、daily/*。這些特殊 route 由 Next filesystem 擁有，只屬 LunaRunes，不建立一般 Scope 的預設 route allowlist。
