export const PAGE_PROFILES_V2=Object.freeze({
  statics:Object.freeze({eyebrow:'Statistics',title:'統計',subtitle:'排行榜、關鍵詞設定與各項統計圖集中於此。',description:'透過排行、關鍵詞設定與圖表，查看資料的分布。'}),
  culture:Object.freeze({eyebrow:'Cuture',title:'文化',subtitle:'透過以時間作為分類標準，來找尋各項時期的變化趨勢。',description:'文字留下風格，風格經過時間累積，才看得見文字風格的變化。'}),
  governance:Object.freeze({eyebrow:'Governance',title:'治理',subtitle:'宣示原則與權利邊界。管理也在此。'}),
  search:Object.freeze({eyebrow:'Cross-format Search',title:'多元搜尋',subtitle:'跨文字、音樂、多媒體、符文、脈絡與知識搜尋。'})
});

const SCOPE_FEATURE_SUBTITLES=Object.freeze({
  lo3rwang:Object.freeze({
    statics:'彙整各 Scope 的作品總數與共同來源分布。',
    culture:'顯示各 Scope 的 Current 時期交會、作品密度與來源數量。',
    governance:'個人治理、作品與權利邊界。管理也在此。',
    search:'從關鍵詞、作品、來源或日期開始，找到時間點，再查看附近的脈絡與作品。'
  }),
  lunarunes:Object.freeze({
    statics:'排行榜、關鍵詞設定與各項統計圖集中於此。',
    culture:'透過以時間作為分類標準，來找尋各項時期的變化趨勢。',
    governance:'符號式語言的治理、Canon 與權利邊界。管理也在此。',
    search:'從符文名稱、關鍵詞或相關文字開始；Scope 命中優先，再回到具體符文與內容。'
  }),
  loc:Object.freeze({
    statics:'排行榜、關鍵詞設定與各項統計圖集中於此。',
    culture:'透過以時間作為分類標準，來找尋各項時期的變化趨勢。',
    governance:'LOC 原則、Copyleft 與 GNU GPL。管理也在此。',
    search:'跨 LOC 的關鍵詞入口；Scope 命中優先，再進入對應資料與關係位置。'
  })
});

export function scopeFeatureSubtitleV2(scopeId,featureId){
  return SCOPE_FEATURE_SUBTITLES[scopeId]?.[featureId]||PAGE_PROFILES_V2[featureId]?.subtitle||'';
}

export function pageProfileV2(featureId,scope){
  const base=PAGE_PROFILES_V2[featureId]||{eyebrow:'LOC',title:featureId,subtitle:''};
  if(scope?.id==='loc'&&featureId==='statics')return {...base,subtitle:scopeFeatureSubtitleV2('loc','statics'),description:'只比較各 Scope 可共同對照的作品數量與來源統計；不跨 Scope 統計關鍵詞或風格。'};
  if(scope?.id==='loc'&&featureId==='culture')return {...base,subtitle:scopeFeatureSubtitleV2('loc','culture'),description:'只呈現 Current 時期交會、作品密度與來源數量；明細請進入各 Scope 的時間長河。'};
  return {...base,subtitle:scopeFeatureSubtitleV2(scope?.id,featureId)};
}
