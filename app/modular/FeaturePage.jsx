'use client';

import {UI_COPY} from '../i18n/ui-copy';
import {useScopeRuntime} from './use-scope-runtime';




export default function FeaturePage({featureId,children,subtitle=null,description=null}){
  const {scope}=useScopeRuntime();
  const profile=UI_COPY.features?.[featureId]||{title:featureId,subtitle:'',description:''};
  const resolvedSubtitle=scope?.featureSubtitles?.[featureId]||profile.subtitle||'';
  const resolvedDescription=description??profile.description;
  const finalSubtitle=subtitle||resolvedSubtitle;
  return <main className="scope-main">
    <section className="scope-page">
      <header className="loc-card scope-hero">
        <div className="home-title-row">
          <h1>{profile.title}</h1>
          {finalSubtitle?<p className="loc-subtitle scope-subtitle">{finalSubtitle}</p>:null}
        </div>
        {resolvedDescription?<div className="scope-hero-description">{resolvedDescription}</div>:null}
      </header>
      <div className="scope-content">{children}</div>
    </section>
  </main>;
}
