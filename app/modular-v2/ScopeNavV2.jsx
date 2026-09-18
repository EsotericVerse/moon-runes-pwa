'use client';

import {FEATURES_V2,featureHrefV2} from './scope-registry.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

export default function ScopeNavV2(){
  const {scopeId,scope}=useScopeRuntimeV2();
  return <nav className="scope-v2-nav" aria-label="全站導覽">
    <a href={scope.primary.href}>{scope.primary.label}</a>
    {FEATURES_V2.filter(item=>item.id!=='search').map(item=>
      <a key={item.id} href={featureHrefV2(scopeId,item.id)}>{item.label}</a>
    )}
    <form action={featureHrefV2(scopeId,'search')} method="get" role="search">
      <input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋"/>
    </form>
    <a href={scope.role.href}>{scope.role.label}</a>
    {scope.homes.map(item=><a key={item.label} href={item.href}>{item.label}</a>)}
  </nav>;
}
