import { LOC_DATA } from './data';

export const SEARCH_COLLECTIONS = Object.freeze({
  all: Object.freeze({
    id: 'all',
    label: '全部',
    description: '跨 LOC 文字、音樂、治理、事件、知識庫與月之符文資料搜尋。',
    smallSources: [
      [LOC_DATA.RUNES, '月之符文'],
      [LOC_DATA.LOC2_EVENT_REGISTRY, '事件'],
      [LOC_DATA.LOC4_WRITING_REGISTRY, '文字創作'],
      [LOC_DATA.LOC6_GOVERNANCE_REGISTRY, '治理'],
      [LOC_DATA.LOC_MEDIA_REGISTRY, '多媒體'],
      [LOC_DATA.LOC_KNOWLEDGE_ASSET_REGISTRY, '知識庫'],
      [LOC_DATA.LOC_FAQ, 'FAQ']
    ],
    includeTextCorpus: true,
    includeMusic: true
  }),
  '月之符文': Object.freeze({
    id: '月之符文',
    label: '月之符文',
    description: '只搜尋 LunaRunes 主資料與 Lots／History／Harmony companion datasets。',
    smallSources: [
      [LOC_DATA.RUNES, '月之符文'],
      [LOC_DATA.LOTS, '籤詩'],
      [LOC_DATA.HISTORY, '符文歷史'],
      [LOC_DATA.HARMONY, '符文調和']
    ],
    includeTextCorpus: false,
    includeMusic: false
  }),
  '政德風': Object.freeze({
    id: '政德風',
    label: '政德風',
    description: '以文字創作與治理資料為主的作者風格搜尋視角。',
    smallSources: [
      [LOC_DATA.LOC4_WRITING_REGISTRY, '文字創作'],
      [LOC_DATA.LOC6_GOVERNANCE_REGISTRY, '治理']
    ],
    includeTextCorpus: true,
    includeMusic: false
  })
});

export const SEARCH_COLLECTION_ORDER = Object.freeze(['all', '月之符文', '政德風']);

export function getSearchCollection(value) {
  const key = String(value || '').trim();
  return SEARCH_COLLECTIONS[key] || SEARCH_COLLECTIONS.all;
}
