# LOC runtime authority / hardcoding review — 2026-10-09

## Acceptance principle
A field already maintained in PostgreSQL must not be independently defined as a second runtime authority in Next.js. Static Next.js output still requires technical routes, algorithms, localized UI text and emergency fallbacks; these are **not** user-owned configuration.

| Concern | Sole runtime authority | Changes / checks |
| --- | --- | --- |
| Scope ID / parent / active / Domain / Directory / sort order | `silver.scope_registry` | Domain and Directory mutually exclusive. `lrunes` = Domain `lrunes.lo3rwang.cc`; `lo3rwang` = Directory `/lo3rwang`. JS registers DB routes after hydration, not a second hostname table. |
| Scope `display_name` | `silver.<scope_id>.display_name` for Scope; Registry for Group/system | DB-synchronized Scope/navigation label; not the browser page title. |
| Browser page copy | `silver.manage."Title_TW"`, `"Desc_TW"` | Browser title/description use the two explicit fields through the limited public RPC. No forced suffix or exposed manager email. |
| Scope search aliases, intro | `silver.<scope_id>.search_aliases`, `search_intro` | No independent hardcoded Scope aliases in `SCOPES`; user-authored content remains in its own table. |
| Scope Theme selection / palette definition | `silver.<scope_id>.theme` owned by Scope Admin; `silver.loc_theme` owned by global Admin | Scope config stores which Theme is chosen. Global Admin defines all 43 shared palette CSS values as text columns and loc_theme.theme_id as smallint 1..8; no JSONB theme_attr remains. Internal CSS UI IDs may retain `theme-N` as ephemeral adapter identifiers, not DB keys. |
| Public feature availability | `silver.<scope_id>.search_able`, `statistics_able`, `culture_able` | Runtime FeatureGate checks DB flags. Mapping of UI feature to DB flag is a technical contract. |
| Rune66 Class copy | Scoped DB RPC and Scope Keyword Library | No copy button in global Admin; new copies receive independent Class IDs and do not switch active Class. |
| Domain collision validation | Registry CHECK / domain label function and creation UI | Repeated dot-delimited labels rejected while typing and by DB. No DNS state is invented. |
| DB/public data access | `silver.manage`, Scope mappings and provider-neutral Data API | Dynamic Scope tables and permissions remain DB-owned. |
| Navigation order / feature routes | Next.js UI composition; Registry supplies Scope identity, current URL and label | The relative locations of navigation slots and `/scope/?scope=ID` static-export shell remain technical presentation structure. |
| Rune draw/game/keyword algorithm | Algorithm and game code | Stable logic, canonical 66 group semantics, fixed gameplay identifiers are deliberate constants; not interchangeable with DB presentation fields. |
| Content authored as literals | Named, specifically fixed editorial pages and localized UI strings | Not a duplicated DB authority unless a matching editable/DB field exists. Author and LunaRunes editable Blocks continue to use their canonical storage. |
| Static HTML/Next page metadata | Next.js static build, not Scope name authority | Build-time metadata and canonical URLs are static-export artifacts. After hydration, the browser page title and description come from DB `Title_TW` / `Desc_TW`. Static hosting cannot fetch live database labels during build without moving to server rendering. |

## Manage / Scope ownership

- `silver.manage`: global-Admin-only changes (owner mapping, administrative permissions, public Nav/browser labels `Title_TW`/`Desc_TW`). Do not move Scope-owned toggles, current Theme selection or local settings here.
- `silver.<scope_id>`: writable by the Scope's own authorized manager (chosen Theme, locale, search/statistics/culture enabled flags and other Scope-specific settings).
- `silver.loc_theme`: global Admin manages the eight shared palette definitions and their numeric keys 1..8. Scope Admin only chooses an existing Theme via their own configuration table.
- The Scope's `theme` setting is a reference to the shared palette, not a duplicate of its 43 token values. It remains unchanged during this migration.

## Guardrails

- `scripts/verify-runtime-authority.mjs`, `scripts/verify-scope-registry.mjs`, `scripts/verify-theme-contract.mjs`, `scripts/verify-management-contract.mjs` enforce primary invariants.
- Do not create a separate JS `display_name` map, per-Scope `theme-#` default list, or independent Domain/Directory authority.
- Never infer DNS CNAME or hosting availability from a Registry value.
- Do not turn special-case LunaRunes draw/guide/game sections into generic editable content while removing duplicated settings.
- Preserve frozen-branch and main deployment workflow after merge.

## Explicit technical boundary
A GitHub Pages / Next.js static export cannot embed the **current** live value of `display_name` in the original response HTML without server rendering or rebuilding from a database snapshot. Consequently the client sets `document.title` from canonical database data after hydration. This is a delivery limitation, not an additional user-editable naming field.
