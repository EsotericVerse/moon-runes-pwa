// Transitional physical-data bridge for the modular V2 cutover.
// Descriptive Current features import this bridge so legacy storage identifiers do not become Current architecture terminology.
import {LOC_DATA} from '../loc/data';

export const SEARCH_DATASETS_V2=Object.freeze({
  text:'loc4-text-corpus',
  music:'loc3-lyrics-search'
});

export const SEARCH_PATHS_V2=Object.freeze({
  runes:LOC_DATA.RUNES,
  runeSongs:'data/json/registries/LOC3_RUNE_SONG_REGISTRY.json',
  runeLiterature:'data/json/registries/RUNE_LITERATURE_REGISTRY.json',
  runeGrammar:LOC_DATA.RUNE_GRAMMAR,
  runeInterpretations:LOC_DATA.RUNE_INTERPRETATIONS,
  eventRegistry:LOC_DATA.LOC2_EVENT_REGISTRY,
  writingRegistry:LOC_DATA.LOC4_WRITING_REGISTRY,
  governanceRegistry:LOC_DATA.LOC6_GOVERNANCE_REGISTRY,
  mediaRegistry:LOC_DATA.LOC_MEDIA_REGISTRY,
  knowledgeRegistry:LOC_DATA.LOC_KNOWLEDGE_ASSET_REGISTRY,
  faq:LOC_DATA.LOC_FAQ,
  authorKeywords:LOC_DATA.ZHENGDE_CULTURE_KEYWORDS,
  lots:LOC_DATA.LOTS,
  runeHistory:LOC_DATA.HISTORY,
  harmony:LOC_DATA.HARMONY,
  searchGovernance:LOC_DATA.LOC_SEARCH_GOVERNANCE
});

export const CULTURE_PATHS_V2=Object.freeze({
  eraRegistry:LOC_DATA.LOC_ERA_REGISTRY,
  eventSnapshot:LOC_DATA.LOC8_EVENT_SNAPSHOT,
  musicPeriods:LOC_DATA.LOC3_PERIOD_KEYWORD_ANALYSIS,
  writingGovernancePeriods:LOC_DATA.LOC6_PERIOD_KEYWORD_ANALYSIS,
  runeHistory:LOC_DATA.LUNARUNE_EVOLUTION_HISTORY,
  runeCoreHistory:LOC_DATA.HISTORY,
  runes:LOC_DATA.RUNES,
  runeSongs:'data/json/registries/LOC3_RUNE_SONG_REGISTRY.json',
  runeLiterature:'data/json/registries/RUNE_LITERATURE_REGISTRY.json',
  authorKeywords:LOC_DATA.ZHENGDE_CULTURE_KEYWORDS
});

export const ADMIN_DATA_PATHS_V2=Object.freeze({
  eras:LOC_DATA.LOC_ERA_REGISTRY,
  dailyRunes:LOC_DATA.DAILY_RUNE_REPO_HISTORY||LOC_DATA.LOC8_DAILY_RUNE_REPO_HISTORY,
  contextEvents:LOC_DATA.LOC8_EVENT_SNAPSHOT,
  contextRelations:LOC_DATA.LOC_CROSS_RELATIONSHIP_REGISTRY
});
