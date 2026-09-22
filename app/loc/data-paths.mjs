// Logical identifiers map to Neon runtime_json_documents. Physical JSON files are not part of the Next runtime.
export const LOC_DATA=Object.freeze({
  RUNES:'core/runes',
  LOTS:'core/lots',
  HISTORY:'core/history',
  HARMONY:'core/harmony',
  RUNE_GRAMMAR:'core/rune_grammar',
  RUNE_INTERPRETATIONS:'core/rune_interpretations',
  THREE_CARD_COMBINATIONS:'core/three_card_combinations',
  LOC2_EVENT_REGISTRY:'registries/LOC2_EVENT_REGISTRY',
  LOC3_PERIOD_KEYWORD_ANALYSIS:'registries/LOC3_PERIOD_KEYWORD_ANALYSIS',
  LOC4_WRITING_REGISTRY:'registries/LOC4_WRITING_REGISTRY',
  LOC6_GOVERNANCE_REGISTRY:'registries/LOC6_GOVERNANCE_REGISTRY',
  PERIOD_KEYWORD_ANALYSIS:'registries/LOC6_PERIOD_KEYWORD_ANALYSIS',
  LOC6_PERIOD_KEYWORD_ANALYSIS:'registries/LOC6_PERIOD_KEYWORD_ANALYSIS',
  DAILY_RUNE_REPO_HISTORY:'registries/LOC8_DAILY_RUNE_REPO_HISTORY',
  LOC8_DAILY_RUNE_REPO_HISTORY:'registries/LOC8_DAILY_RUNE_REPO_HISTORY',
  LOC8_EVENT_SNAPSHOT:'registries/LOC8_EVENT_SNAPSHOT',
  LOC_CROSS_RELATIONSHIP_REGISTRY:'registries/LOC_CROSS_RELATIONSHIP_REGISTRY',
  LO3RWANG_ERA:'registries/lo3rwang_era',
  LOC_GRAPH_SCHEMA:'registries/LOC_GRAPH_SCHEMA',
  LOC_STYLE_GROUP_REGISTRY:'registries/LOC_STYLE_GROUP_REGISTRY',
  LOC_MEDIA_REGISTRY:'registries/LOC_MEDIA_REGISTRY',
  LOC_KNOWLEDGE_ASSET_REGISTRY:'registries/LOC_KNOWLEDGE_ASSET_REGISTRY',
  LOC_SEARCH_GOVERNANCE:'registries/LOC_SEARCH_GOVERNANCE',
  LRUNES_ERA:'registries/lrunes_era',
  ZHENGDE_CULTURE_KEYWORDS:'registries/ZHENGDE_CULTURE_KEYWORDS',
  LOC_FAQ:'search/faq/LOC_FAQ_RAG_v0.4',
  TEXT_CORPUS_MANIFEST:'generated/loc4/corpus/LOC4_TEXT_CORPUS_MANIFEST',
  OFFLINE_HISTORY_MANIFEST:'generated/loc4/offline_history/LOC4_OFFLINE_HISTORY_MANIFEST',
  THREADS_BROWSER_MANIFEST:'generated/loc4/threads/LOC4_THREADS_BROWSER_MANIFEST',
  FACEBOOK_MANIFEST:'sources/facebook/manifest',
  MUSIC_SEARCH_MANIFEST:'search/loc3/LOC3_LYRICS_SEARCH_v0.1',
  RUNE_RESERVED_SNAPSHOT:'generated/search/reserved/moon-runes',
  SEARCH_SOURCE_STATS:'generated/search/SEARCH_SOURCE_STATS'
});

export function neonSourceCandidates(identifier){
  const value=String(identifier||'').trim().replace(/^\/+/,'').replace(/\.json$/,'');
  if(!value)return [];
  const logical=value.startsWith('data/json/')?value.slice('data/json/'.length):value;
  return [...new Set([value,`${value}.json`,`data/json/${logical}.json`])];
}
