'use client';

import {useState} from 'react';
import {FEATURES_V2,featureHrefV2,featureIdForPathV2,scopeHrefV2} from './scope-registry.v2';
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
function NavTarget({href,label,current=false}){
  return current?<span className="scope-v2-nav-current" aria-current="page">{label}</span>:<a href={href}>{label}</a>;
}

const NAV_FEATURE_ORDER=['culture','statics','governance'];

export default function ScopeNavV2(){
  const {scopeId,host,pathname}=useScopeRuntimeV2();
  const currentFeature=featureIdForPathV2(pathname);
  const [searchText,setSearchText]=useState('');
  const navScopeId=scopeId==='admin'?'loc':scopeId;
  const runeHome=scopeHrefV2('lunarunes');
  const authorHome=scopeHrefV2('lo3rwang');
  const locHome=scopeHrefV2('loc');

  function submitSearch(event){
    event.preventDefault();
    const q=searchText.trim();
    if(!q)return;
    const url=new URL(featureHrefV2(navScopeId,'search'));
    url.searchParams.set('q',q);
    window.location.assign(url.toString());
  }

  return <nav className="scope-v2-nav" aria-label="全站導覽">
    <NavTarget href={runeHome} label="月之符文" current={targetIsCurrent(runeHome,host,pathname)}/>
    {NAV_FEATURE_ORDER.map(id=>FEATURES_V2.find(item=>item.id===id)).filter(Boolean).map(item=>
      <NavTarget key={item.id} href={featureHrefV2(navScopeId,item.id)} label={item.label} current={scopeId!=='admin'&&currentFeature===item.id}/>
    )}
    <form onSubmit={submitSearch} role="search" className="scope-v2-search">
      <input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋" value={searchText} onChange={event=>setSearchText(event.target.value)}/>
    </form>
    <NavTarget href={authorHome} label="作者介紹" current={targetIsCurrent(authorHome,host,pathname)}/>
    <NavTarget href={locHome} label="回月典首頁" current={targetIsCurrent(locHome,host,pathname)}/>
  </nav>;
}
