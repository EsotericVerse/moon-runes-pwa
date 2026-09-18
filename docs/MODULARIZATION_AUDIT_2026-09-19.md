# LOC Modularization Audit — 2026-09-19

**Status:** Current audit

## 已完成

### 1. 單一 Scope Registry
Current Scope authority 集中在 `app/modular-v2/scope-registry.v2.js`。

Registry 已分離：
- internal `scope_id`
- `scopeType`
- canonical `domain`
- optional `mount`
- optional `aliasName`
- display `label`
- search/data projection
- theme
- Scope-local routes

`scope_id` 不再被假設等於 hostname label 或 pathname slug。

### 2. Canonical 與 ingress 分離
`scopeType` 決定 canonical URL：
- domain Scope → canonical 使用 domain
- directory Scope → canonical 使用 mount

`mount` 是額外 ingress，不等於 alias，也不只屬於 directory Scope。

LunaRunes：
- internal id：`runes`
- canonical：`lrunes.lo3rwang.cc`
- alternate mount：`loc.lo3rwang.cc/lrunes`
- `lrunes` 不是 alias

Author：
- internal id：`lo3rwang`
- canonical：`loc.lo3rwang.cc/lo3rwang`
- external alias：`dlwang.lo3rwang.cc`

### 3. 共用 Feature 模組化
`context`、`statics`、`culture`、`governance`、`search` 使用同一組 Feature registry、renderer 與 Scope runtime。

NAV 由 `ScopeNavV2` 依目前 Scope 動態產生，不保存第二套 route map。

### 4. Scope-local route 模組化
新增 `scopeHrefV2(scopeId, localPath)`。

`duel/*`、`list`、`history` 等不再各自硬拼 LunaRunes URL，而是由 Scope Registry 的 canonical 規則產生。

LunaRunes local routes 已登記：
- `list`
- `history`
- `duel/one`
- `duel/daily`
- `duel/two`
- `duel/three`
- `duel/five`
- `duel/ow3gs`

### 5. Source module 與 public route 分離
`app/loc` 與 `app/runes` 保留作 source module directory。

已移除會直接輸出以下 public route 的 route shell：
- `/loc`
- `/runes`
- `/runes/context`
- `/runes/statics`
- `/runes/culture`
- `/runes/governance`
- `/runes/search`
- `/runes/list`
- `/runes/history`

CI 已禁止這些 route shell 回流。

### 6. Deployment-scoped governance
Current Scope ID 暫時使用 `^[A-Za-z]+$`。

`loc` 是本 deployment 的 reserved word，不是全球禁用字。其他使用者、部門、團隊或 deployment 可以自由使用 LOC / loc。

Current default Scope 與 reserved-word policy 已抽入 Registry；Admin 目前顯示 Current 預設值，後續可升級成可編輯設定。

## 目前最重要的剩餘邊界

### Static export 無法單靠 Next 根據 Host 做 route-level 404
目前 `next.config.mjs` 使用：

```
output: 'export'
```

因此同一份 static output 只依 pathname 產生檔案，不知道請求 Host。

例如為了讓 canonical：
`lrunes.lo3rwang.cc/list`
存在，就需要輸出：
`/list/index.html`

若 `loc.lo3rwang.cc` 與 `lrunes.lo3rwang.cc` 指向同一份 static output，則 physical `/list/index.html` 也可能被：
`loc.lo3rwang.cc/list`
命中。

這不是 Scope resolver 或 NAV 的問題，而是 deployment routing boundary。

若要求所有錯誤跨 Scope pathname 必須在 HTTP 層真正 404，需要下列其中一種：
1. Cloudflare / edge 依 Host + pathname 做 allow/deny 或 internal rewrite。
2. 不同 Scope 使用分離 deployment/output。
3. 改成有 request-time middleware/server routing 的部署模式。

Current repo 已能避免 source folder 自動洩漏 `/loc`、`/runes`；但 host-level physical route admissibility 仍需 deployment layer 配合。

## 現況判定

### 已模組化
- Scope identity
- canonical URL generation
- domain / mount / alias separation
- shared NAV
- shared Feature renderer
- Scope-local URL generation
- data-view injection
- theme registry
- CI registry contract

### 仍需繼續收斂
- host-level route admissibility under static export
- legacy static HTML / sitemap / README 中的舊 `/runes` 路徑
- 未執行中的舊 parity 文件／script 中仍存在歷史 route 字串
- Admin 對 default Scope / reserved words / Scope registration 的可編輯能力

## 核心測試案例

LunaRunes 是目前最適合的 modularization contract：

```
scope_id = runes
canonical = https://lrunes.lo3rwang.cc
mount = https://loc.lo3rwang.cc/lrunes
```

以下應代表同一 Scope：

```
https://lrunes.lo3rwang.cc/context
https://loc.lo3rwang.cc/lrunes/context
```

```
https://lrunes.lo3rwang.cc/duel/one
https://loc.lo3rwang.cc/lrunes/duel/one
```

canonical 顯示優先 domain；internal `scope_id` 不得被自動插入 URL。

以下不得被 Current 視為 canonical：

```
https://lrunes.lo3rwang.cc/runes/...
https://lrunes.lo3rwang.cc/lrunes/...
https://loc.lo3rwang.cc/lrunes/runes/...
```

這組測試能直接驗證系統是否真的將 identity、ingress、canonical 與 path namespace 分離。
