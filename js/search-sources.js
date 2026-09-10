// Canonical browser-side search source registry.
// Search data remains in its governed source files; this JS owns the browser source routing.
window.LOC_SEARCH_SOURCES = Object.freeze({
  "data/json/registries/LOC2_EVENT_REGISTRY.json": "data/json/registries/LOC2_EVENT_REGISTRY.json",
  "data/json/core/runes66.json": "data/json/core/runes66.json",
  "data/json/search/loc3/LOC3_LYRICS_SEARCH_v0.1.json": "data/json/search/loc3/LOC3_LYRICS_SEARCH_v0.1.json",
  "data/json/registries/LOC4_WRITING_REGISTRY.json": "data/json/registries/LOC4_WRITING_REGISTRY.json",
  "data/json/registries/LOC6_GOVERNANCE_REGISTRY.json": "data/json/registries/LOC6_GOVERNANCE_REGISTRY.json",
  "data/json/registries/LOC_MEDIA_REGISTRY.json": "data/json/registries/LOC_MEDIA_REGISTRY.json",
  "data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json": "data/json/registries/LOC_KNOWLEDGE_ASSET_REGISTRY.json",
  "data/json/search/faq/LOC_FAQ_RAG_v0.4.json": "data/json/search/faq/LOC_FAQ_RAG_v0.4.json",
  "data/json/registries/LOC_ERA_REGISTRY.json": "data/json/registries/LOC_ERA_REGISTRY.json",
  "data/json/generated/search/SEARCH_SOURCE_STATS.json": "data/json/generated/search/SEARCH_SOURCE_STATS.json",
});

window.addEventListener("DOMContentLoaded",()=>{
  const status=document.querySelector(".status");
  const results=document.querySelector(".groups");
  if(status&&results&&results.parentNode) results.after(status);
});
