# LOC Release Roadmap

## RC8 — Stable baseline

RC8 is frozen as the stable Current architecture/data/runtime baseline. It establishes Neon as SSOT, removes retired runtime architecture, consolidates shared editing/loading behavior, restores canonical LunaRunes guidance, and preserves the first graphical Game pass.

RC8 is the reference point for regressions; it is not reopened for ordinary post-freeze UI corrections.

## RC9 — Final release candidate

RC9 focuses on completing and arranging the functions that already exist. Its scope includes Game completion and interface configuration, but does not reopen the RC8 architecture baseline.

### RC9 completion criteria

1. Governance/Admin management pages are manually reviewed and corrected.
2. Existing installed modules are used more broadly where they fit the current functions and remove unnecessary custom infrastructure.
3. LunaRunes interpretation sentences are completed and consistently routed through the intended existing rules.
4. LunaRunes keyword handling is completed: canonical vocabulary, rules, management, Search/Statistics integration, and definition consistency.
5. LunaRunes Game rules, graphical presentation, interaction flow, and interface placement/configuration are completed to the intended RC9 level.
6. Existing LOC/LunaRunes interface configuration is consolidated so shared layout and feature placement are predictable rather than page-specific exceptions.
7. Existing functionality remains stable against the RC8 invariants.

RC9 is complete when the Current product surface is functionally coherent and the main remaining release work is image multimedia integration and final visual stabilization.

## 1.0 Release

There is **no RC10**. The version sequence after RC9 goes directly to **1.0 Release (1.0R)**.

**Target:** complete 1.0R by mid-October 2026, with 2026-10-15 as the working target date.

### 1.0 completion criteria

**Release gate:** OAuth-authorized page import with governed two-layer text/link parsing is mandatory for 1.0R. If this capability is not operational, 1.0R is not considered complete.

### Import security and responsibility boundary

- Import is unavailable without a valid OAuth-backed source authorization.
- Import actions require Scope management authority or Admin authority; ordinary non-manager Scope users cannot run the importer.
- OAuth establishes authenticated access to content the connected account is permitted to read. It does not itself certify copyright ownership.
- The importing user must affirm that they have the right or authorization to import/use the selected source content. LOC records the authenticated source context and provenance but does not independently adjudicate copyright ownership.
- Source provenance must be retained for imported records so origin, source-native identity, and original link remain traceable.
- Newly imported records default to private/non-public visibility. Publication requires a separate explicit management action after import.
- Import remains bounded by the two-layer traversal rule and usage limits so it cannot function as a bulk backup/mirroring service.

1. Image multimedia from existing source material—including Facebook, Threads, Instagram, and other media-bearing sources—is integrated into the Current media model.
2. Images remain media/reference entities and are linked to Galaxy/content records through the existing relationship model; they are not represented by fabricated empty text content.
3. Search, Culture, Statistics, and other relevant surfaces can use the image metadata/relationships that already belong in their current responsibilities.
4. All graphical pages are stable: graphs, timelines, statistical visualizations, Daily, Game, management visualization, and other visual surfaces.
5. Scope/Group extension is mature: ordinary new Scope/Group instances can extend from the shared architecture without requiring a new bespoke core implementation.
6. Admin provides simple configuration for ordinary Scope/Group governance and feature setup, so routine extension can be completed through managed settings rather than source-level rewiring.
7. Shared Scope/Group behavior, permissions, navigation, feature mounting, and visual conventions remain consistent as the system extends.
8. Admin import is operational for managed text/link ingestion rather than being a placeholder flow.
9. A basic authenticated page importer/crawler supports OAuth-backed access where required: the user provides a starting page, LOC reads the accessible page text and links, then follows only the directly linked page layer. The crawler is limited to two total layers (start page + one linked-page layer) and does not recursively expand beyond that boundary.
10. Imported page text, links, source identity, and relationships enter the existing governance/import pipeline; authenticated crawling does not bypass validation, permissions, duplicate handling, or Neon SSOT rules.
11. A private personal-analysis app is delivered alongside 1.0R for the author's own analysis use. It remains private and uses the same governed Current data model rather than creating a second corpus authority.
12. Personal Scope onboarding initializes a private birth date and an AI-analysis anchor. Birth date is treated as stable identity/time-axis data and is editable only to correct an initially wrong entry. The default AI anchor is 2023-01-01 and remains user-adjustable.
13. Personal multimedia chronology may begin at birth. Text-style analysis is a separate layer and defaults to age 10 onward (`birth date + 10 years`), because earlier-life media records do not imply independently authored text style.
14. The AI anchor does not define when text analysis begins; it only partitions eligible text into pre-anchor human-default and post-anchor AI-possible periods. If the AI anchor predates the text-style start, the analyzed text simply begins inside the AI-possible period.
15. These analysis settings affect derived periods only. They must not rewrite original content timestamps, provenance, or historical records.
16. Final responsive, loading, failure-state, regression, and deployment validation passes.

The resulting build is the LOC **1.0 Release (1.0R)**: a mature, extensible product whose ordinary Scope/Group growth is handled by shared architecture plus simple Admin configuration, with a working governed import path and an accompanying private personal-analysis app.
