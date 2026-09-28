'use client';

import PageShellV2 from './PageShellV2';
import {pageProfileV2} from './page-profiles.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

export default function FeaturePageV2({featureId,children,subtitle=null,description=null,expandedPath=null}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const profile=pageProfileV2(featureId,scope);
  const featureContext={
    featureId,scopeId,scope,
    searchCollection:scope.searchCollection
  };
  const content=typeof children==='function'?children(featureContext):children;
  return <PageShellV2
    eyebrow={profile.eyebrow}
    title={profile.title}
    subtitle={subtitle||profile.subtitle}
    description={description??profile.description}
    featureId={featureId}
    scopeId={scopeId}
    expandedPath={expandedPath}
  >{content}</PageShellV2>;
}
