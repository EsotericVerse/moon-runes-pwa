export const PAGE_PROFILES_V2=Object.freeze({
  context:Object.freeze({eyebrow:'Context',title:'脈絡',subtitle:'人事物的分析關聯表達'}),
  statics:Object.freeze({eyebrow:'Statics',title:'統計',subtitle:'統計關鍵字排行榜與資料來源的分佈，來做風格的分析。'}),
  culture:Object.freeze({eyebrow:'Cuture',title:'文化',subtitle:'透過以時間作為分類標準，來找尋各項時期的變化趨勢。'}),
  governance:Object.freeze({eyebrow:'Governance',title:'治理',subtitle:'宣示原則性與法律規定。管理也在此。'}),
  search:Object.freeze({eyebrow:'Search',title:'搜尋'})
});

export function pageProfileV2(featureId,scope){
  const base=PAGE_PROFILES_V2[featureId]||{eyebrow:'LOC',title:featureId};
  return {...base,subtitle:`${scope.label} Scope`};
}
