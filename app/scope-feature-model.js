import {getScope,getScopeDataSet,scopeRoute} from './scope-registry';

export const FEATURE_MODEL=Object.freeze({
 context:Object.freeze({name:'脈絡',description:'整理資料之間的關係、事件、時期與語意脈絡。'}),
 statics:Object.freeze({name:'統計排行榜',description:'依目前 Scope 範圍統計關鍵詞、來源與相關排行。'}),
 evolution:Object.freeze({name:'文化',description:'把目前 Scope 範圍的資料放回時間與時期中，觀察形成、延續、轉變、分化、消退、回返與擺盪。'}),
 governance:Object.freeze({name:'治理',description:'管理目前 Scope 自己的規則、資料邊界、時期設定與治理狀態。'}),
 search:Object.freeze({name:'搜尋',description:'搜尋目前 Scope 範圍可用的資料與內容。'})
});

export function featurePage(scopeId,featureId){
 const scope=getScope(scopeId);const feature=FEATURE_MODEL[featureId];
 if(!feature)throw new Error(`Unknown feature: ${featureId}`);
 const label=scope.displayName||scope.zhName;
 // Governance never inherits write authority from aggregation/ref composition.
 const datasets=featureId==='governance'?[scope.dataset]:getScopeDataSet(scope.id);
 return Object.freeze({scope,feature,id:featureId,title:`${label}${feature.name}`,description:feature.description,href:scopeRoute(scope,featureId),dataset:scope.dataset,datasets,searchMode:scope.searchMode||'local'});
}

export function scopeFeatureList(scopeId){return Object.keys(FEATURE_MODEL).map(id=>featurePage(scopeId,id));}
