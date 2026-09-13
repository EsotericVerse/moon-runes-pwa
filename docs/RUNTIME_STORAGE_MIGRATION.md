# Runtime / Storage Migration Note

## Current position

LOC currently runs primarily through the Next.js static/runtime path. Render and KV are not required for the present website hot path, but neither is considered retired permanently.

## Primary maintenance surface

Next.js is the single primary application maintenance surface.

Daily application work should converge here: UI, routes, feature modules, Search, data loading, cache orchestration, local state, storage orchestration, dynamic loading, metadata, and PWA assembly should be implemented through the Next.js application layer whenever practical.

Canonical data remains independent from Next.js. Render, KV, Google Drive, or another backend remains an optional provider behind adapters / services rather than becoming a second application layer.

The maintenance target is therefore:

- update canonical data once;
- update the Next.js application layer once;
- let shared loaders, indexes, cache engines, search logic, and storage adapters serve all relevant features;
- do not maintain parallel UI/search/cache/data-model implementations for each backend provider.

## Backend principle

Render, KV, Google Drive, or another future backend should connect through adapter / service layers. UI, canonical records, Search, and local persistence must not become coupled to one provider.

## Storage roles

Use one canonical record model with interchangeable storage adapters:

- IndexedDB: local-first browser storage for draw history, daily rune records, preferences, and offline-capable working data.
- KV: optional lightweight remote state / synchronization backend when a remote key-value store is useful.
- Google Drive via OAuth: user-owned remote persistence and cross-device synchronization. A typical future flow is a daily rune created or viewed on a phone, then synchronized by the authenticated user into their own Google Drive.
- Render or another backend: optional future server-side computation, API, synchronization, or heavier service work when needed.

These are storage/runtime implementations, not separate data models.

## Migration rule

Do not delete an integration merely because it is not active in the current Next.js runtime. Instead, distinguish between:

1. durable capability that should remain possible through an adapter; and
2. legacy provider-specific workarounds that only existed to cope with an earlier deployment constraint.

Provider-specific timeout, memory, cache, or fallback logic may be simplified when the present runtime no longer needs it. General large-data safeguards such as partitioning, indexing, I/O budgets, bounded browser memory, incremental loading, and cache eviction remain valid regardless of provider.

When legacy code contains application logic that can now live cleanly in Next.js, migrate that logic into shared Next.js modules and keep only the provider-specific transport or persistence implementation in the service adapter.

## Design objective

Next.js is the current application assembly/runtime layer, not a reason to remove future remote services. The goal is to keep the current site light while preserving a clean path to mobile, cross-device, OAuth-backed user storage, KV, and server-side services without reintroducing historical coupling or duplicate data formats.
