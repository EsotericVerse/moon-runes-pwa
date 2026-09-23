export const PAGE_PROFILES_V2=Object.freeze({
  context:Object.freeze({eyebrow:'Context',title:'脈絡',subtitle:'關鍵詞的分析與交互的關係圖。'}),
  statics:Object.freeze({eyebrow:'Statistics',title:'統計',subtitle:'各文字作品的相關統計與排行榜'}),
  culture:Object.freeze({eyebrow:'Culture',title:'文化',subtitle:'在時間長河上的文字風格變化。'}),
  governance:Object.freeze({eyebrow:'Governance',title:'治理',subtitle:'權責立場與法律層面表述。管理功能。'}),
  search:Object.freeze({eyebrow:'Search',title:'搜尋',subtitle:'從關鍵詞找到資料，再回到原本的 Scope 與關係位置。'})
});

const SCOPE_FEATURE_SUBTITLES=Object.freeze({
  lo3rwang:Object.freeze({
    context:'關鍵詞的分析與交互的關係圖。',
    statics:'各文字作品的相關統計與排行榜',
    culture:'在時間長河上的文字風格變化。',
    governance:'權責立場與法律層面表述。管理功能。',
    search:'從關鍵詞、作品、來源或日期開始，找到時間點，再查看附近的脈絡與作品。'
  }),
  runes:Object.freeze({
    context:'關鍵詞的分析與交互的關係圖。',
    statics:'各文字作品的相關統計與排行榜',
    culture:'在時間長河上的文字風格變化。',
    governance:'權責立場與法律層面表述。管理功能。',
    search:'從符文名稱、關鍵詞或相關文字開始；Scope 命中優先，再回到具體符文與內容。'
  }),
  loc:Object.freeze({
    context:'關鍵詞的分析與交互的關係圖。',
    statics:'各文字作品的相關統計與排行榜',
    culture:'在時間長河上的文字風格變化。',
    governance:'權責立場與法律層面表述。管理功能。',
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
