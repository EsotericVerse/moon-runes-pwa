'use client';

import {FEATURES_V2,featureHrefV2,featureIdForPathV2} from './scope-registry.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

function NavTarget({href,label,current=false}){
  return current?<span className="scope-v2-nav-current" aria-current="page">{label}</span>:<a href={href}>{label}</a>;
}

export default function ScopeNavV2(){
  const {scopeId,scope,pathname}=useScopeRuntimeV2();
  const currentFeature=featureIdForPathV2(pathname);
  const atScopeHome=pathname==='/'||pathname==='/runes'||pathname==='/lo3rwang'||pathname==='/management';

  return <nav className="scope-v2-nav" aria-label="全站導覽">
    <NavTarget href={scope.primary.href} label={scope.primary.label} current={atScopeHome}/>
    {FEATURES_V2.filter(item=>item.id!=='search').map(item=>
      <NavTarget key={item.id} href={featureHrefV2(scopeId,item.id)} label={item.label} current={currentFeature===item.id}/>
    )}
    <form action={featureHrefV2(scopeId,'search')} method="get" role="search" className="scope-v2-search">
      <input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋"/>
    </form>
    <NavTarget href={scope.role.href} label={scope.role.label}/>
    {scope.homes.map(item=><NavTarget key={item.label} href={item.href} label={item.label}/>)}
  </nav>;
}
