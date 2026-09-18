import { LOC_DATA } from './data';
import {getScopeV2,resolveScopeV2} from '../modular-v2/scope-registry.v2';

export const SEARCH_SCOPE_FIELDS=Object.freeze(['person','family','generation','era','source','corpus','language','culture']);

const ZHENGDE_CULTURE_COLLECTION = Object.freeze({
  id: '政德文化',
  label: '政德文化',
  description: '搜尋政德文化的文字、歌曲、治理資料與文化關鍵字；用時期、概念與作品一起理解演變。',
  scopeProfile:Object.freeze({id:'personal',fields:Object.freeze(['person','era','source','corpus','language','culture'])}),
  smallSources: [
    [LOC_DATA.ZHENGDE_CULTURE_KEYWORDS, '政德文化'],
    [LOC_DATA.LOC4_WRITING_REGISTRY, '文字創作'],
    [LOC_DATA.LOC6_GOVERNANCE_REGISTRY, '治理']
  ],
  includeTextCorpus: true,
  includeMusic: true
});

export const SEARCH_COLLECTIONS = Object.freeze({
  all: Object.freeze({
    id: 'all',
    label: '全部',
    description: '跨 LOC 文字、音樂、治理、事件、知識庫與月之符文資料搜尋。',
    scopeProfile:Object.freeze({id:'loc',fields:SEARCH_SCOPE_FIELDS}),
    smallSources: [
      [LOC_DATA.RUNES, '月之符文'],
      [LOC_DATA.RUNE_GRAMMAR, '符文演算法'],
      [LOC_DATA.RUNE_INTERPRETATIONS, '每日符文'],
      [LOC_DATA.LOC2_EVENT_REGISTRY, '事件'],
      [LOC_DATA.LOC4_WRITING_REGISTRY, '文字創作'],
      [LOC_DATA.LOC6_GOVERNANCE_REGISTRY, '治理'],
      [LOC_DATA.LOC_MEDIA_REGISTRY, '多媒體'],
      [LOC_DATA.LOC_KNOWLEDGE_ASSET_REGISTRY, '知識庫'],
      [LOC_DATA.LOC_FAQ, 'FAQ'],
      [LOC_DATA.ZHENGDE_CULTURE_KEYWORDS, '政德文化']
    ],
    includeTextCorpus: true,
    includeMusic: true
  }),
  '月之符文': Object.freeze({
    id: '月之符文',
    label: '月之符文',
    description: '搜尋 LunaRunes 核心資料、抽牌語法、每日解讀與 companion datasets。',
    scopeProfile:Object.freeze({id:'lunarunes',fields:Object.freeze(['source','corpus','language','culture'])}),
    smallSources: [
      [LOC_DATA.RUNES, '月之符文'],
      [LOC_DATA.RUNE_GRAMMAR, '符文演算法'],
      [LOC_DATA.RUNE_INTERPRETATIONS, '每日符文'],
      [LOC_DATA.LOTS, '籤詩'],
      [LOC_DATA.HISTORY, '符文歷史'],
      [LOC_DATA.HARMONY, '符文調和']
    ],
    includeTextCorpus: false,
    includeMusic: false
  }),
  '政德文化': ZHENGDE_CULTURE_COLLECTION,
  '政德風': ZHENGDE_CULTURE_COLLECTION,
  '治理': Object.freeze({
    id:'治理',
    label:'治理',
    description:'搜尋管理與治理資料。',
    scopeProfile:Object.freeze({id:'governance',fields:Object.freeze(['source','corpus','language','culture'])}),
    smallSources:[
      [LOC_DATA.LOC6_GOVERNANCE_REGISTRY,'治理'],
      [LOC_DATA.LOC_SEARCH_GOVERNANCE,'搜尋治理'],
      [LOC_DATA.LOC_KNOWLEDGE_ASSET_REGISTRY,'知識庫']
    ],
    includeTextCorpus:false,
    includeMusic:false
  })
});

export const SEARCH_COLLECTION_ORDER = Object.freeze(['all', '月之符文', '政德文化', '治理']);

export function getSearchCollection(value) {
  const key = String(value || '').trim();
  return SEARCH_COLLECTIONS[key] || SEARCH_COLLECTIONS.all;
}
export function getSearchScopeProfile(value){return getSearchCollection(value).scopeProfile;}
export function searchCollectionForHost(host='',pathname='/'){
  const scopeId=resolveScopeV2(host,pathname);
  return getSearchCollection(getScopeV2(scopeId).searchCollection);
}
