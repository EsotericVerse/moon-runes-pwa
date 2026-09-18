// Transitional physical-data bridge for the modular V2 cutover.
// Descriptive V2 features import this bridge so legacy storage identifiers do not become Current UI/architecture terminology.
import {LOC_DATA} from '../loc/data';

export const SEARCH_DATASETS_V2=Object.freeze({
  text:'loc4-text-corpus',
  music:'loc3-lyrics-search'
});

export const CULTURE_PATHS_V2=Object.freeze({
  eraRegistry:LOC_DATA.LOC_ERA_REGISTRY,
  eventSnapshot:LOC_DATA.LOC8_EVENT_SNAPSHOT,
  musicPeriods:LOC_DATA.LOC3_PERIOD_KEYWORD_ANALYSIS,
  writingGovernancePeriods:LOC_DATA.LOC6_PERIOD_KEYWORD_ANALYSIS,
  runeHistory:LOC_DATA.LUNARUNE_EVOLUTION_HISTORY,
  runeCoreHistory:LOC_DATA.HISTORY,
  runes:LOC_DATA.RUNES,
  authorKeywords:LOC_DATA.ZHENGDE_CULTURE_KEYWORDS
});
