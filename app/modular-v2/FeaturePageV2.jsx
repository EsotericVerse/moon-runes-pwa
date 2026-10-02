'use client';

import {UI_COPY} from '../i18n/ui-copy';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

const PROFILES={
  statics:UI_COPY.features.statics,
  culture:UI_COPY.features.culture,
  governance:UI_COPY.features.governance,
  search:UI_COPY.features.search
};


export default function FeaturePageV2({featureId,children,subtitle=null,description=null}){
  const {scope}=useScopeRuntimeV2();
  const profile=PROFILES[featureId]||{title:featureId,subtitle:'',description:''};
  const resolvedSubtitle=scope?.featureSubtitles?.[featureId]||profile.subtitle||'';
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
