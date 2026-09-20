export const PAGE_PROFILES_V2=Object.freeze({
  context:Object.freeze({eyebrow:'Context',title:'脈絡'}),
  statics:Object.freeze({eyebrow:'Statistics',title:'統計'}),
  culture:Object.freeze({eyebrow:'Culture',title:'文化'}),
  governance:Object.freeze({eyebrow:'Governance',title:'治理'}),
  search:Object.freeze({eyebrow:'Search',title:'搜尋'})
});

export function pageProfileV2(featureId,scope){
  const base=PAGE_PROFILES_V2[featureId]||{eyebrow:'LOC',title:featureId};
  return {...base,subtitle:`${scope.label} Scope`};
}
