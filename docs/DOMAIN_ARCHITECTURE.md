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

Data Scope 與 Galaxy／Time 對應由 Supabase PostgreSQL 的 `silver.manage` 管理。既有部署範例包含：

- `lo3rwang` — role admin
- `lrunes` — role scope

上述是範例而不是完整 Scope 清單；透過 Admin 新增的一般 Scope 也應由相同 mapping contract 解析，不在文件中維護另一份固定可用 Scope 名冊。Scope Group 成員關係則由 `silver.scope_registry.parent_scope_id` 維護，Group 只提供 Overview／導引，不跨 Scope 聚合 corpus。

Current deployment 與 data Scope 都使用 canonical id `lrunes`；不保留 `lunarunes` runtime alias。

## Shared feature paths

Current shared features：

- /statics
- /culture
- /governance
- /search

LunaRunes 另外擁有自己的特殊 route，例如 game、list、duel/*、daily/*。這些特殊 route 由 Next filesystem 擁有，只屬 LunaRunes，不建立一般 Scope 的預設 route allowlist。
