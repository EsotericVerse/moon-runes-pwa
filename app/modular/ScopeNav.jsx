'use client';

import {useState} from 'react';
import {UI_COPY} from '../i18n/ui-copy';
import {FEATURES,SCOPES,featureHref,featureIdForPath,getScope,scopeHref} from './scope-registry';
import {useScopeRuntime} from './use-scope-runtime';

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
function NavTarget({href,label,current=false}){
  return current?<span className="scope-nav-current" aria-current="page">{label}</span>:<a href={href}>{label}</a>;
}

const NAV_FEATURE_ORDER=['culture','statics','governance'];
const NAV_SCOPES=Object.values(SCOPES)
  .filter(scope=>scope.nav)
  .sort((a,b)=>String(a.nav.position).localeCompare(String(b.nav.position))||Number(a.nav.order||0)-Number(b.nav.order||0));

export default function ScopeNav(){
  const {scopeId,host,pathname}=useScopeRuntime();
  const currentFeature=featureIdForPath(pathname);
  const [searchText,setSearchText]=useState('');
  const currentScope=getScope(scopeId);
  const navScopeId=currentScope.featureScope||scopeId;
  const beforeScopes=NAV_SCOPES.filter(item=>item.nav.position==='before');
  const afterScopes=NAV_SCOPES.filter(item=>item.nav.position!=='before');

  function submitSearch(event){
    event.preventDefault();
    const q=searchText.trim();
    if(!q)return;
    const url=new URL(featureHref(navScopeId,'search'));
    url.searchParams.set('q',q);
    window.location.assign(url.toString());
  }

  return <nav className="scope-nav" aria-label={UI_COPY.nav.aria}>
    {beforeScopes.map(item=>{
      const href=scopeHref(item.id);
      return <NavTarget key={item.id} href={href} label={item.nav.label||item.label} current={targetIsCurrent(href,host,pathname)}/>;
    })}
    {NAV_FEATURE_ORDER.map(id=>FEATURES.find(item=>item.id===id)).filter(Boolean).map(item=>
      <NavTarget key={item.id} href={featureHref(navScopeId,item.id)} label={item.label} current={!currentScope.featureScope&&currentFeature===item.id}/>
    )}
    <form onSubmit={submitSearch} role="search" className="scope-search">
      <input name="q" type="search" aria-label={UI_COPY.nav.searchAria} placeholder={UI_COPY.nav.search} value={searchText} onChange={event=>setSearchText(event.target.value)}/>
    </form>
    {afterScopes.map(item=>{
      const href=scopeHref(item.id);
      return <NavTarget key={item.id} href={href} label={item.nav.label||item.label} current={targetIsCurrent(href,host,pathname)}/>;
    })}
  </nav>;
}
