export const PAGE_PROFILES_V2=Object.freeze({
  context:Object.freeze({eyebrow:'Context',title:'脈絡',subtitle:'人事物的分析關聯表達',description:'知道各點的關係圖，才會知道種子長出根的方向。'}),
  statics:Object.freeze({eyebrow:'Statics',title:'統計',subtitle:'統計關鍵字排行榜與資料來源的分佈，來做風格的分析。',description:'風格跟時期的設定，以及關鍵字排行榜集中於此。'}),
  culture:Object.freeze({eyebrow:'Cuture',title:'文化',subtitle:'透過以時間作為分類標準，來找尋各項時期的變化趨勢。',description:'文字留下風格，風格經過時間累積，才看得見文字風格的變化。'}),
  governance:Object.freeze({eyebrow:'Governance',title:'治理',subtitle:'宣示原則性與法律規定。管理也在此。'}),
  search:Object.freeze({eyebrow:'Cross-format Search',title:'多元搜尋',subtitle:'跨文字、音樂、多媒體、符文、脈絡與知識搜尋。'})
});

const SCOPE_FEATURE_SUBTITLES=Object.freeze({
  lo3rwang:Object.freeze({
    context:'人事物的分析關聯表達',
    statics:'統計關鍵字排行榜與資料來源的分佈，來做風格的分析。',
    culture:'透過以時間作為分類標準，來找尋各項時期的變化趨勢。',
    governance:'宣示原則性與法律規定。管理也在此。',
    search:'從關鍵詞、作品、來源或日期開始，找到時間點，再查看附近的脈絡與作品。'
  }),
  runes:Object.freeze({
    context:'人事物的分析關聯表達',
    statics:'統計關鍵字排行榜與資料來源的分佈，來做風格的分析。',
    culture:'透過以時間作為分類標準，來找尋各項時期的變化趨勢。',
    governance:'宣示原則性與法律規定。管理也在此。',
    search:'從符文名稱、關鍵詞或相關文字開始；Scope 命中優先，再回到具體符文與內容。'
  }),
  loc:Object.freeze({
    context:'人事物的分析關聯表達',
    statics:'統計關鍵字排行榜與資料來源的分佈，來做風格的分析。',
    culture:'透過以時間作為分類標準，來找尋各項時期的變化趨勢。',
    governance:'宣示原則性與法律規定。管理也在此。',
    search:'跨 LOC 的關鍵詞入口；Scope 命中優先，再進入對應資料與關係位置。'
  })
});

export function scopeFeatureSubtitleV2(scopeId,featureId){
  return SCOPE_FEATURE_SUBTITLES[scopeId]?.[featureId]||PAGE_PROFILES_V2[featureId]?.subtitle||'';
}

export function pageProfileV2(featureId,scope){
  const base=PAGE_PROFILES_V2[featureId]||{eyebrow:'LOC',title:featureId,subtitle:''};
  return {...base,subtitle:scopeFeatureSubtitleV2(scope?.id,featureId)};
}
