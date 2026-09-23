# Scope feature table-split integration handoff (historical)

This document records the table-split handoff that preceded the static-export
and direct-Neon-client cutover. It is retained as migration evidence; the
route-based contract below is not the current runtime boundary.

Current runtime boundaries are the direct Neon clients under `app/loc/` and
the shared contracts in `app/loc/scope-feature-contracts.js`. Neon table names
and physical split details stay out of feature components.

## Stable responses

The authoritative runtime schemas are in `app/loc/scope-feature-contracts.js`.
The direct Neon feature clients parse against those schemas.

| Feature | Endpoint | Normalized fields |
| --- | --- | --- |
| Context | `GET /api/context?scopeId=...` | `rows[]`, `nodes[]`, `edges[]`, `trends[]` |
| Culture | `GET /api/culture?scopeId=...` | `eras`, `runeEras`, `runeHistory`, `periods[]`, `events[]`, `trajectories[]`, `works[]`, keyword and period summaries |
| Statistics | `GET /api/statistics/rankings?scopeId=...&page=...&pageSize=...&rankingType=...` | paginated `rows[]`, `count`, `page`, `pageSize`, `types[]` |

Context graph nodes use `node_id` and `label`; graph edges use `edge_id`,
`source_node_id`, `target_node_id`, and `relation_type`. Keep identifiers
stable and make edge endpoints refer to node identifiers in the same Scope.
Rows may keep source-specific fields because the schemas are passthrough, but
the normalized fields above are required for shared UI behavior.

## Table split adapter work (historical)

No final table names are assumed here. Once the schema split is complete, map
the resulting authoritative tables in these server-side adapters only:

1. `app/api/context/route.js`: read Scope context records, graph nodes,
   relations, and trends; normalize them to the Context response fields.
2. `app/api/culture/route.js`: read Scope eras, events, trajectories, and works;
   normalize those records to the Culture response fields.
3. `app/api/statistics/rankings/route.js`: aggregate the split work and semantic
   sources, while preserving the existing explicit inclusion/visibility rules.
4. `app/api/loc/data/route.js`: add an explicit mapping for each newly
   authoritative dataset; unmapped keys intentionally return
   `NEON_SOURCE_UNMAPPED`, never a fabricated empty result.

Do not treat schema defaults (`[]` or `{}`) as proof that a source has no data.
The route adapter must query and map each authoritative source before a feature
can report complete data. Do not write or migrate Neon data from this handoff.

## Superseded integration state

- Context graph renderer is installed and accepts normalized node/edge arrays;
  the route currently emits empty graph arrays until split tables are mapped.
- Culture UI renders Events and Trajectories sections; the current route does
  not yet populate them from the split culture source.
- Statistics endpoint reads without an account-level scope grant, because this
  is a public read view; inclusion and visibility filters remain in its query.
  Its aggregation still needs remapping to the final split schema.
- Client and API contracts are ready for adapter changes without client table
  access or UI rewrites.

## Current integration state

- Context, Culture, Statistics, and canonical LOC data read through direct Neon
  clients (`neon-context-client.js`, `neon-culture-client.js`,
  `neon-ranking-client.js`, and `data.js`); no `app/api` route is required.
- Search reads the current Neon tables and builds a bounded FlexSearch index in
  `neon-search.js`; it does not load a JSON corpus.
- The split table names are centralized in `neon-repository.js` and the clients
  use read-only queries for public data. Writes remain behind the existing
  authentication and Casbin/Scope authorization boundaries.
