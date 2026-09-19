import {SEARCH_PATHS_V2} from '../migration-bridges/current-data-compat.v2';
import {getScopeV2,resolveScopeV2} from '../modular-v2/scope-registry.v2';

export const SEARCH_SCOPE_FIELDS=Object.freeze(['person','family','generation','era','source','corpus','language','culture']);

const ZHENGDE_CULTURE_COLLECTION = Object.freeze({
  id: '政德文化',
  label: '政德文化',
  description: '搜尋政德文化的文字、歌曲、治理資料與文化關鍵字；用時期、概念與作品一起理解演變。',
  scopeProfile:Object.freeze({id:'personal',fields:Object.freeze(['person','era','source','corpus','language','culture'])}),
  smallSources: [
    [SEARCH_PATHS_V2.authorKeywords, '政德文化'],
    [SEARCH_PATHS_V2.writingRegistry, '文字創作'],
    [SEARCH_PATHS_V2.governanceRegistry, '治理']
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
    // LOC 搜尋只讀月典自身資料；月之符文與作者有各自的 Scope 搜尋入口。
    smallSources: [
      [SEARCH_PATHS_V2.eventRegistry, '事件'],
      [SEARCH_PATHS_V2.governanceRegistry, '治理'],
      [SEARCH_PATHS_V2.mediaRegistry, '多媒體'],
      [SEARCH_PATHS_V2.knowledgeRegistry, '知識庫'],
      [SEARCH_PATHS_V2.faq, 'FAQ']
    ],
    includeTextCorpus: false,
    includeMusic: false
  }),
  '月之符文': Object.freeze({
    id: '月之符文',
    label: '月之符文',
    description: '搜尋 LunaRunes 核心資料、抽牌語法、每日解讀與 companion datasets。',
    scopeProfile:Object.freeze({id:'lunarunes',fields:Object.freeze(['source','corpus','language','culture'])}),
    smallSources: [
      [SEARCH_PATHS_V2.runes, '月之符文'],
      [SEARCH_PATHS_V2.runeGrammar, '符文演算法'],
      [SEARCH_PATHS_V2.runeInterpretations, '每日符文'],
      [SEARCH_PATHS_V2.lots, '籤詩'],
      [SEARCH_PATHS_V2.runeHistory, '符文歷史'],
      [SEARCH_PATHS_V2.harmony, '符文調和']
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
      [SEARCH_PATHS_V2.governanceRegistry,'治理'],
      [SEARCH_PATHS_V2.searchGovernance,'搜尋治理'],
      [SEARCH_PATHS_V2.knowledgeRegistry,'知識庫']
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
