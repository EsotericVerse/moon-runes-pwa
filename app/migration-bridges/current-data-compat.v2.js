// Transitional physical-data bridge for the modular V2 cutover.
// Descriptive Current features import this bridge so legacy storage identifiers do not become Current architecture terminology.
import {LOC_DATA} from '../loc/data';

export const CULTURE_PATHS_V2=Object.freeze({
  eraByScope:Object.freeze({
    lo3rwang:LOC_DATA.LO3RWANG_ERA,
    runes:LOC_DATA.LRUNES_ERA
  }),
  musicPeriods:LOC_DATA.LOC3_PERIOD_KEYWORD_ANALYSIS,
  writingGovernancePeriods:LOC_DATA.LOC6_PERIOD_KEYWORD_ANALYSIS,
  runeHistory:LOC_DATA.LRUNES_ERA,
  runeCoreHistory:LOC_DATA.HISTORY,
  runes:LOC_DATA.RUNES,
  authorKeywords:LOC_DATA.ZHENGDE_CULTURE_KEYWORDS
});

export const ADMIN_DATA_PATHS_V2=Object.freeze({
  eras:LOC_DATA.LO3RWANG_ERA,
  dailyRunes:LOC_DATA.DAILY_RUNE_REPO_HISTORY||LOC_DATA.LOC8_DAILY_RUNE_REPO_HISTORY,
  contextEvents:LOC_DATA.LOC8_EVENT_SNAPSHOT,
  contextRelations:LOC_DATA.LOC_CROSS_RELATIONSHIP_REGISTRY
});
