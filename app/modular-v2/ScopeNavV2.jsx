'use client';

import {FEATURES_V2,featureHrefV2,featureIdForPathV2,getScopeV2} from './scope-registry.v2';
import {useScopeRuntimeV2} from './use-scope-runtime.v2';

function normalizePath(value='/'){
  const path=String(value||'/').replace(/\/+$/,'');
  return path||'/';
}
function targetIsCurrent(href,host,pathname){
  if(!host)return false;
  try{
    const url=new URL(href);
    return url.hostname===host.split(':')[0]&&normalizePath(url.pathname)===normalizePath(pathname);
  }catch{return false;}
}
function forbiddenNavTarget(href=''){
  try{
    const url=new URL(href,typeof window!=='undefined'?window.location.origin:'http://localhost');
    return url.hostname===getScopeV2('admin').domain||url.pathname==='/admin'||url.pathname.startsWith('/admin/');
  }catch{return true;}
}

function NavTarget({href,label,current=false}){
  if(forbiddenNavTarget(href))return null;
  return current?<span className="scope-v2-nav-current" aria-current="page">{label}</span>:<a href={href}>{label}</a>;
}

export default function ScopeNavV2(){
  const {scopeId,scope,host,pathname}=useScopeRuntimeV2();
  const currentFeature=featureIdForPathV2(pathname);
  const searchHref=featureHrefV2(scopeId,'search');

  return <nav className="scope-v2-nav" aria-label="全站導覽">
    <NavTarget href={scope.primary.href} label={scope.primary.label} current={targetIsCurrent(scope.primary.href,host,pathname)}/>
    {FEATURES_V2.filter(item=>item.id!=='search').map(item=>
      <NavTarget key={item.id} href={featureHrefV2(scopeId,item.id)} label={item.label} current={currentFeature===item.id}/>
    )}
    {!forbiddenNavTarget(searchHref)&&<form action={searchHref} method="get" role="search" className="scope-v2-search">
      <input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋"/>
    </form>}
    {scope.homes.map(item=><NavTarget key={item.label} href={item.href} label={item.label} current={targetIsCurrent(item.href,host,pathname)}/>)}
  </nav>;
}
