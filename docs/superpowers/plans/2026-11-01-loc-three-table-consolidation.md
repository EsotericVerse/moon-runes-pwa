# LOC Three-Table Consolidation Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkboxes for tracking.

**Goal:** Retire per-module production tables for the lo3rwang Scope and LOC Group without losing records, authorization boundaries, or existing article relationships.

**Architecture:** A single per-Scope article table and an independently typed Anchor table; a single Group/Scope-management table for the LOC Group. Edge adapters translate existing feature-specific record shapes, allowing a tested cutover rather than permanent dual writes. The schema and runtime switch must be coordinated.

**Tech Stack:** PostgreSQL/Supabase silver schema, Kysely, Cloudflare, Clerk, JavaScript/Next.js, Node test runner.

**Spec:** docs/superpowers/specs/2026-11-01-loc-three-table-consolidation-design.md

## Global Constraints
- Targets are silver.lo3rwang, silver.lo3rwang_anchor, silver.loc; existing silver.manage/Clerk stays above this scope.
- No Neon changes, Facebook/Threads reimport, table-per-feature expansion, permanent temporary tables, or long-lived dual writes.
- One JSONB and one text[] association list per Anchor; UID Base62 case-sensitive; no timestamp PK, no uid lowercasing.
- Each Scope supplies its actual DB/table routing; no hardcoded suffix-only assumptions.
- Strict per-object authorization / disclosure follows the current AGENTS.md; read-only prep is not permission for DDL, data backfill, privileged RPC, or destructive DROP.
- New index beyond the UID PK requires separate evidence. One special case: UID uniqueness across four Anchor kinds must be tested and preserved.
- No PR merge or Cloudflare deploy before complete npm run check:syntax and real functional verification.

## Review Focus
1. New Time/Trace four-character UID colliding across kinds: enforce same-scope UID uniqueness and a shared allocator.
2. Group/Scope config currently occupying final table names: do not overwrite it; prove config row restoration and read permissions.
3. Keyword item JSONB may hold hundreds of thousands of hit entries: preserve times exactly and avoid full-blob rereads in list screens.
4. Media Rune record and original Music are independent; preserve both UIDs, article media_link and media URL.
5. LOC MCP currently public-read only: do not expose admin writes as anonymous routes; establish Clerk authorization separately.

---

### Task 1: Reversible Anchor contract [IN PROGRESS]

**Files:** Create app/loc/anchor-contract.mjs; test scripts/test-unified-anchor-contract.mjs.

**Interfaces:** toAnchorRecord(kind,row), fromAnchorRecord(record), validateAnchorCollection(rows). kind is time|trace|keywords|media; output fields are uid/kind/type/title/description/url/meta_tags/createtime/date/location/invisible/links/attrs.

- [x] Write unit tests first for Time, Trace, Keywords, Music, Rune, Base62 case, UID collisions and invalid links.
- [x] Verify the test initially fails because the module does not yet exist.
- [x] Implement minimal reversible adapter and verify eight tests pass locally.
- [ ] Commit source and tests to this task branch and validate the committed file contents with a fresh test run.

### Task 2: Registry and routing contract

**Files:** Modify app/loc/scope-data.js, app/loc/db-contract.mjs, app/loc/providers/database-list-relation.mjs and the matching scope tests.

**Interfaces:** resolved Scope gives an explicit config relation, article relation and Anchor relation, with actual Postgres schema/database routing; no arbitrary user-supplied SQL identifiers.

- [ ] Write a failing scope-route test that resolves explicit "lo3rwang" / "lo3rwang_anchor" without appending "_galaxy" or "_time".
- [ ] Verify still resolves legacy Scope from silver.manage while the old schema is active.
- [ ] Implement a typed relation registry, initially non-active behind an explicit cutover state; verify tests and no added queries on guest homepage.
- [ ] Review permission isolation for changing a Scope's target database/table; commit only when syntax checks can run.

### Task 3: Full column and dependence inventory

**Files:** Add a review appendix to the spec (no SQL file); update schema-test scripts.

- [ ] Inspect all columns/indexes/constraints/RLS/views/triggers/RPCs for all 15 old and target tables, and all dynamic references in worker/MCP.
- [ ] Write test cases for all 15 old-table row counts and full-data fingerprints, including lo3rwang_blocks, search_terms, loc_theme, loc_dblists.
- [ ] Specify new Group table's every column and privilege, its migration source, and the RLS/Clerk boundary. Validate it has one JSONB object.
- [ ] Before any production DDL/backfill/drop, surface the complete required per-object scope for the repository authorization rules.

### Task 4: PostgreSQL Anchor and Group shadow copy

**Files:** Reusable migration executor code and tests (no persistent SQL scripts). Schema only under explicit reviewed scope.

- [ ] Write failing tests for a transaction that creates final Anchor table with precise fields from the spec, one PK, one JSONB, one text[].
- [ ] Build and run a rollbackable rehearsal on an isolated PG target/transaction, verifying 14,696 exact UID records, per-kind counts, attrs and preserved URL / Rune meta_tags.
- [ ] Verify all 54,196 Galaxy records and 655 search-term records have a defined destination, including previously populated Group auxiliary records.
- [ ] Confirm RLS/GRANT privilege parity and cancellation restores original schema; do not call DROP CASCADE.
- [ ] Execute approved production copy only after independent preflight; make temporary structures transaction-scoped.

### Task 5: Feature read/write adapters and test suite

**Files:** app/loc/galaxy-query.js, app/loc/culture-query.js, app/loc/keyword-tree.mjs, app/loc/providers/local-sqlite.mjs and feature-specific writers.

- [ ] Test exact round trip for anchor/period/era; space_anchor/path/trace; Category/Class/Group/Item; Music/Rune with independent media URLs.
- [ ] Use one shared Anchor relation and kind discriminator in the new provider, maintaining current lazy-load and per-article on-demand read behavior.
- [ ] Preserve date-based counts, keyword group hit counts, visibility semantics and all article media_link targets.
- [ ] Complete local SQLite compatibility and full syntax + integration tests.

### Task 6: Group, Clerk, Gateway, LOC MCP cutover

**Files:** app/loc/scope-data.js, workers/loc-gateway/index.mjs, app/loc/mcp/galaxy-read.mjs, Group admin UI and their tests.

- [ ] Migrate current lo3rwang/loc configs, both sets of Blocks, Group Themes, DB lists, keyword catalog, runtime and search terms to one Group table.
- [ ] Prove public-guest reads contain no private article/authorization fields; protected actions must verify Clerk subject and scope rights.
- [ ] Remove hardcoded "_galaxy" from LOC public reader only after new endpoint has been tested; do not promise writes when MCP is read-only.
- [ ] Re-run manage/publish/query/read/write tests as the final Scope table mapping becomes authoritative.

### Task 7: Atomic cutover, cleanups and deployment verification

- [ ] Run full npm run check:syntax and integration suite before creating a ready-to-merge PR.
- [ ] In one coordinated operation, switch table routing, check complete record / relationship counts and Cloudflare worker compatibility.
- [ ] Retire old tables only after verifying there are no remaining API, RPC, view, trigger, sequence or code dependencies; expire transitional objects per the agreed bounded lifecycle.
- [ ] Check GitHub main SHA, Cloudflare Production deployment and LOC MCP public/admin behavior as distinct results.
- [ ] Report which previous tables were removed, final row counts, remaining exceptions and exact SHA. No stalled Draft PR.

## Current status
Only Task 1's reversible adapter has completed its local red/green tests; production schema, Group consolidation, app cutover and MCP management have not been changed by this plan.