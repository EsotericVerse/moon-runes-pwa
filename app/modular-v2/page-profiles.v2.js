import {UI_COPY} from '../i18n/ui-copy';

export const PAGE_PROFILES_V2=Object.freeze({
  statics:Object.freeze({eyebrow:'',...UI_COPY.features.statics}),
  culture:Object.freeze({eyebrow:'',...UI_COPY.features.culture}),
  governance:Object.freeze({eyebrow:'',...UI_COPY.features.governance}),
  search:Object.freeze({eyebrow:'',...UI_COPY.features.search})
});

const SCOPE_FEATURE_SUBTITLES=Object.freeze({
  lo3rwang:Object.freeze({
    search:UI_COPY.scope.author.search
  }),
  lunarunes:Object.freeze({
    statics:'查看月之符文相關資料的數量、來源與時間變化。',
    culture:'把月之符文相關紀錄放回時間順序，觀察不同時期的變化。',
    governance:'說明月之符文的使用原則、權利與管理入口。',
    search:'從符文名稱、關鍵字或相關文字找到對應內容。'
  }),
  loc:Object.freeze({
    statics:UI_COPY.scope.loc.statics,
    culture:UI_COPY.scope.loc.culture,
    governance:UI_COPY.scope.loc.governance,
    search:UI_COPY.scope.loc.search
  })
});

export function scopeFeatureSubtitleV2(scopeId,featureId){
  return SCOPE_FEATURE_SUBTITLES[scopeId]?.[featureId]||PAGE_PROFILES_V2[featureId]?.subtitle||'';
}

export function pageProfileV2(featureId,scope){
  const base=PAGE_PROFILES_V2[featureId]||{eyebrow:'',title:featureId,subtitle:''};
  return {...base,subtitle:scopeFeatureSubtitleV2(scope?.id,featureId)};
}
