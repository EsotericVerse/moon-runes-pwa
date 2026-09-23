export const PAGE_PROFILES_V2=Object.freeze({
  context:Object.freeze({eyebrow:'Context',title:'脈絡',subtitle:'整理既有關係，從節點與連結理解彼此如何相連。'}),
  statics:Object.freeze({eyebrow:'Statistics',title:'統計',subtitle:'以可觀察的數字與排行榜整理目前資料分布。'}),
  culture:Object.freeze({eyebrow:'Culture',title:'文化',subtitle:'把資料放回時間長河，查看不同時期的變化。'}),
  governance:Object.freeze({eyebrow:'Governance',title:'治理',subtitle:'宣示原則、權責、法律與管理邊界。'}),
  search:Object.freeze({eyebrow:'Search',title:'搜尋',subtitle:'從關鍵詞找到資料，再回到原本的 Scope 與關係位置。'})
});

const SCOPE_FEATURE_SUBTITLES=Object.freeze({
  lo3rwang:Object.freeze({
    context:'把文字、作品、事件與來源放回關係中，從關鍵詞與事件看彼此如何連結。',
    statics:'依年份、來源與時期整理筆數、關鍵詞與分布，先看整體，再回到作品。',
    culture:'把作品放回個人時期與時間長河，觀看文字風格、作品與生命經驗如何變化。',
    search:'從關鍵詞、作品、來源或日期開始，找到時間點，再查看附近的脈絡與作品。'
  }),
  runes:Object.freeze({
    context:'從符文、分組與既有關係查看月之符文彼此如何連結；跨 Scope 節點直接進入對方脈絡。',
    statics:'整理月之符文的關鍵詞、群組與資料分布，先看前 10 名，再回查實際內容。',
    culture:'把月之符文放回自己的時期與時間長河，查看符文系統在不同時間點的變化。',
    search:'從符文名稱、關鍵詞或相關文字開始；Scope 命中優先，再回到具體符文與內容。'
  }),
  loc:Object.freeze({
    context:'從 LOC 作為入口，查看 LunaRunes 與 lo3rwang 兩個 Scope 的直接關係。',
    statics:'聚合各 Scope 的可觀察統計，先看整體，再進入各自 Scope 查看細節。',
    culture:'從 Current 開始查看各 Scope 的現在時期，再進入各自的時間長河。',
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
