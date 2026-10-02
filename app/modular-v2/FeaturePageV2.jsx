'use client';

import {UI_COPY} from '../i18n/ui-copy';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

const PROFILES={
  statics:UI_COPY.features.statics,
  culture:UI_COPY.features.culture,
  governance:UI_COPY.features.governance,
  search:UI_COPY.features.search
};
const SCOPE_SUBTITLES={
  lo3rwang:{search:UI_COPY.scope.author.search},
  lrunes:{
    statics:'查看月之符文相關資料的數量、來源與時間變化。',
    culture:'把月之符文相關紀錄放回時間順序，觀察不同時期的變化。',
    governance:'說明月之符文的使用原則、權利邊界與管理方式。',
    search:'從符文名稱、關鍵字或相關文字找到對應內容。'
  },
  loc:{
    statics:UI_COPY.scope.loc.statics,
    culture:UI_COPY.scope.loc.culture,
    governance:UI_COPY.scope.loc.governance,
    search:UI_COPY.scope.loc.search
  }
};

export default function FeaturePageV2({featureId,children,subtitle=null,description=null}){
  const {scopeId}=useScopeRuntimeV2();
  const profile=PROFILES[featureId]||{title:featureId,subtitle:'',description:''};
  const resolvedSubtitle=SCOPE_SUBTITLES[scopeId]?.[featureId]||profile.subtitle||'';
  const resolvedDescription=description??profile.description;
  const finalSubtitle=subtitle||resolvedSubtitle;
  return <main className="scope-v2-main">
    <section className="scope-v2-page">
      <header className="loc-card scope-v2-hero">
        <div className="home-title-row">
          <h1>{profile.title}</h1>
          {finalSubtitle?<p className="loc-subtitle scope-v2-subtitle">{finalSubtitle}</p>:null}
        </div>
        {resolvedDescription?<div className="scope-v2-hero-description">{resolvedDescription}</div>:null}
      </header>
      <div className="scope-v2-content">{children}</div>
    </section>
  </main>;
}
