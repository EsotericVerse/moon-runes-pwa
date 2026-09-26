'use client';

import PageShellV2 from './PageShellV2';
import {pageProfileV2} from './page-profiles.v2';
import {scopeDataViewV2} from './scope-registry.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';
import SpatialViewerHost from './modules/spatial-3d/SpatialViewerHost';

export default function FeaturePageV2({featureId,children,subtitle=null,description=null,expandedPath=null}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const profile=pageProfileV2(featureId,scope);
  const featureContext={
    featureId,scopeId,scope,
    contextView:scopeDataViewV2(scopeId,'context'),
    rankingsView:scopeDataViewV2(scopeId,'rankings'),
    searchCollection:scope.searchCollection
  };
  const content=typeof children==='function'?children(featureContext):children;
  const showAuthorHomeLink=scopeId==='lo3rwang'&&(featureId==='statics'||featureId==='governance');
  const pageContent=<>
    {showAuthorHomeLink&&<nav aria-label="作者首頁導覽" style={{marginBottom:'1rem'}}>
      <a href="/lo3rwang/" style={{display:'inline-flex',alignItems:'center',gap:'.35rem',padding:'.55rem .85rem',border:'1px solid currentColor',borderRadius:'999px',fontWeight:700,textDecoration:'none'}}>
        ← 回首頁
      </a>
    </nav>}
    {content}
  </>;
  return <PageShellV2
    eyebrow={profile.eyebrow}
    title={profile.title}
    subtitle={subtitle||profile.subtitle}
    description={description??profile.description}
    featureId={featureId}
    scopeId={scopeId}
    expandedPath={expandedPath}
  >{pageContent}<SpatialViewerHost/></PageShellV2>;
}
