'use client';

import {FEATURES_V2,featureHrefV2,featureIdForPathV2} from './scope-registry.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

function NavTarget({href,label,current=false}){
  return current?<span className="scope-v2-nav-current" aria-current="page">{label}</span>:<a href={href}>{label}</a>;
}

const NAV_FEATURE_ORDER=['culture','statics','governance'];

export default function ScopeNavV2(){
  const {scopeId,pathname}=useScopeRuntimeV2();
  const currentFeature=featureIdForPathV2(pathname);

  return <nav className="scope-v2-nav" aria-label="全站導覽">
    {NAV_FEATURE_ORDER.map(id=>FEATURES_V2.find(item=>item.id===id)).filter(Boolean).map(item=>
      <NavTarget key={item.id} href={featureHrefV2(scopeId,item.id)} label={item.label} current={currentFeature===item.id}/>
    )}
    <form action={featureHrefV2(scopeId,'search')} method="get" role="search" className="scope-v2-search">
      <input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋"/>
    </form>
  </nav>;
}
