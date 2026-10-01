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
    statics:UI_COPY.scope.lunarunes.statics,
    culture:UI_COPY.scope.lunarunes.culture,
    governance:UI_COPY.scope.lunarunes.governance,
    search:UI_COPY.scope.lunarunes.search
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
