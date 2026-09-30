export const PAGE_PROFILES_V2=Object.freeze({
  statics:Object.freeze({
    eyebrow:'',
    title:'統計',
    subtitle:'用圖表查看作品數量、來源比例與時間變化。',
    description:'選擇統計項目、圖形與時間範圍，比較資料在不同時期的分布與變化。'
  }),
  culture:Object.freeze({
    eyebrow:'',
    title:'文化',
    subtitle:'把作品放回時間順序，觀察不同時期的累積與變化。',
    description:'時間長河依日期呈現作品與來源；定錨點用來切分時期，方便比較前後差異。'
  }),
  governance:Object.freeze({
    eyebrow:'',
    title:'治理',
    subtitle:'說明使用原則、權利邊界與管理入口。',
    description:'治理頁整理這個區域的基本原則、著作權與授權方式，並提供對應的管理入口。'
  }),
  search:Object.freeze({
    eyebrow:'',
    title:'搜尋',
    subtitle:'輸入關鍵字，從文字、作品、多媒體與符文中找到相關內容。',
    description:'搜尋結果會保留原本的來源與關係，方便回到完整內容或延伸查看前後脈絡。'
  })
});

const SCOPE_FEATURE_SUBTITLES=Object.freeze({
  lo3rwang:Object.freeze({
    search:'從關鍵字、作品、來源或日期找到相關內容，再查看前後脈絡。'
  }),
  lunarunes:Object.freeze({
    statics:'查看月之符文相關資料的數量、來源與時間變化。',
    culture:'把月之符文相關紀錄放回時間順序，觀察不同時期的變化。',
    governance:'說明月之符文的使用原則、權利與管理入口。',
    search:'從符文名稱、關鍵字或相關文字找到對應內容。'
  }),
  loc:Object.freeze({
    statics:'用圖表查看作品數量、來源比例與時間變化。',
    culture:'把作品放回時間順序，觀察不同時期的累積與變化。',
    governance:'說明月典的使用原則、權利與管理入口。',
    search:'從關鍵字找到月典中的文字、作品、多媒體與相關內容。'
  })
});

export function scopeFeatureSubtitleV2(scopeId,featureId){
  return SCOPE_FEATURE_SUBTITLES[scopeId]?.[featureId]||PAGE_PROFILES_V2[featureId]?.subtitle||'';
}

export function pageProfileV2(featureId,scope){
  const base=PAGE_PROFILES_V2[featureId]||{eyebrow:'',title:featureId,subtitle:''};
  return {...base,subtitle:scopeFeatureSubtitleV2(scope?.id,featureId)};
}
