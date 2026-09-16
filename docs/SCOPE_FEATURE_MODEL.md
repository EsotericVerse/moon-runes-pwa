# Scope × Feature Model

Current implementation rule:

- Route resolves Scope.
- Scope selects dataset/corpus/governance state.
- Feature selects the shared processing/view model.
- Shared feature copy lives in `app/scope-feature-model.js`; changing it updates every Scope using that feature.
- Scope-specific labels are generated from Scope configuration, e.g. `LOC 統計排行榜` and `月之符文統計排行榜`.
- Home pages remain Scope-specific compositions.
- LunaRunes may add draw and rune-list modules; Author may compose articles/works; Management may compose governance explanation.
- Governance data and authorization remain Scope-owned even when the UI component is shared.
- LOC Search is federated. Other Scope searches are local by default.

Adding a Scope is a registry operation rather than copying Context/Statics/Culture/Governance/Search pages. Minimum administrative fields are Chinese name, English name, input/Scope id, and manager-home link. Standard feature routes are derived from the registry.
