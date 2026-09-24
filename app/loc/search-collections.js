import {getScopeV2,resolveScopeV2} from '../modular-v2/scope-registry.v2';

export const SEARCH_SCOPE_FIELDS=Object.freeze(['person','family','generation','era','source','corpus','language','culture']);

export const SEARCH_COLLECTIONS = Object.freeze({
  all: Object.freeze({
    id: 'all',
    label: '全部',
    description: '跨 LOC 文字、音樂、治理、FAQ 與月之符文資料搜尋。',
    scopeProfile:Object.freeze({id:'loc',fields:SEARCH_SCOPE_FIELDS}),
    // LOC 搜尋只讀月典自身資料；月之符文與作者有各自的 Scope 搜尋入口。
  }),
  '月之符文': Object.freeze({
    id: '月之符文',
    label: '月之符文',
    description: '搜尋 LunaRunes 核心資料、抽牌語法與相關文字。',
    scopeProfile:Object.freeze({id:'lunarunes',fields:Object.freeze(['source','corpus','language','culture'])}),
  }),
  lo3rwang: Object.freeze({
    id:'lo3rwang',
    label:'lo3rwang',
    description:'搜尋作者正文。',
    scopeProfile:Object.freeze({id:'personal',fields:Object.freeze(['person','era','source','corpus','language','culture'])}),
  }),
  '治理': Object.freeze({
    id:'治理',
    label:'治理',
    description:'搜尋管理與治理資料。',
    scopeProfile:Object.freeze({id:'governance',fields:Object.freeze(['source','corpus','language','culture'])}),
  })
});

export const SEARCH_COLLECTION_ORDER = Object.freeze(['all', '月之符文', 'lo3rwang', '治理']);
export function getSearchCollection(value) {
  const key = String(value || '').trim();
  return SEARCH_COLLECTIONS[key] || SEARCH_COLLECTIONS.all;
}
export function getSearchScopeProfile(value){return getSearchCollection(value).scopeProfile;}
export function searchCollectionForHost(host='',pathname='/'){
  const scopeId=resolveScopeV2(host,pathname);
  return getSearchCollection(getScopeV2(scopeId).searchCollection);
}
