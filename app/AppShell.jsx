'use client';

import {useEffect,useMemo,useState} from 'react';
import {motion,useScroll,useSpring} from 'motion/react';
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
import {UI_COPY} from './i18n/ui-copy';
import {FEATURES,SCOPES,featureHref,featureIdForPath,getScope,scopeHref} from './modular/scope-registry';
import {applyTheme,getThemeSlot,THEME_SLOTS} from './modular/theme-registry';
import {useScopeRuntime} from './modular/use-scope-runtime';
import {selectScopeConfig} from './loc/scope-data';

const SYSTEM_THEME_ID='system-default';
const DAY_THEME_ID='theme-7';
const NIGHT_THEME_ID='theme-1';
const THEME_TIME_ZONE='Asia/Taipei';
const NAV_FEATURE_ORDER=['culture','statics','governance'];
const NAV_SCOPES=Object.values(SCOPES)
  .filter(scope=>scope.nav)
  .sort((a,b)=>String(a.nav.position).localeCompare(String(b.nav.position))||Number(a.nav.order||0)-Number(b.nav.order||0));

function shouldRetryQuery(failureCount,error){
  const cause=error?.cause||error;
  const message=String(cause?.message||error?.message||'').toLowerCase();
  if(cause?.status===429||/too many requests|rate.?limit|\b429\b/.test(message))return false;
  return failureCount<1;
}

function taipeiHour(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:THEME_TIME_ZONE,
      hour:'2-digit',
      hourCycle:'h23'
    }).formatToParts(date);
    return Number(parts.find(part=>part.type==='hour')?.value);
  }catch{
    return date.getHours();
  }
}

function automaticThemeId(date=new Date()){
  const hour=taipeiHour(date);
  return hour>=6&&hour<18?DAY_THEME_ID:NIGHT_THEME_ID;
}

function ThemeSelect({scopeId}){
  const scope=getScope(String(scopeId||'').trim());
  const policy=scope.theme||{mode:'auto'};
  const fixedDefaultThemeId=policy.mode==='fixed'?String(policy.themeId||'').trim():'';
  const configQuery=useQuery({
    queryKey:['scope-public-config',scopeId],
    queryFn:()=>selectScopeConfig(scopeId),
    staleTime:60_000,
    enabled:!fixedDefaultThemeId&&!scope.aggregateChildren&&scope.id!=='admin'
  });
  const configuredDefaultThemeId=String(configQuery.data?.theme||'').trim();
  const [selection,setSelection]=useState(()=>({scopeId,themeId:SYSTEM_THEME_ID}));
  const [now,setNow]=useState(()=>new Date());
  const selectedThemeId=selection.scopeId===scopeId?selection.themeId:SYSTEM_THEME_ID;
  const systemDefaultThemeId=fixedDefaultThemeId||configuredDefaultThemeId||automaticThemeId(now);
  const effectiveThemeId=selectedThemeId===SYSTEM_THEME_ID?systemDefaultThemeId:selectedThemeId;
  const slot=useMemo(()=>getThemeSlot(effectiveThemeId),[effectiveThemeId]);

  useEffect(()=>{
    const root=document.documentElement;
    if(root.dataset.themeId===slot.id)return;
    applyTheme(slot);
  },[slot,scopeId]);

  useEffect(()=>{
    if(selectedThemeId!==SYSTEM_THEME_ID||fixedDefaultThemeId||configuredDefaultThemeId)return undefined;
    setNow(new Date());
    const timer=window.setInterval(()=>setNow(new Date()),30_000);
    return ()=>window.clearInterval(timer);
  },[selectedThemeId,fixedDefaultThemeId,configuredDefaultThemeId]);

  useEffect(()=>{
    setSelection({scopeId,themeId:SYSTEM_THEME_ID});
  },[scopeId]);

  return <label className="scope-theme-control">
    <span>{UI_COPY.common.theme}</span>
    <select value={selectedThemeId} onChange={event=>setSelection({scopeId,themeId:event.target.value})} aria-label={UI_COPY.common.theme}>
      <option value={SYSTEM_THEME_ID}>{UI_COPY.common.systemTheme}</option>
      {THEME_SLOTS.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
    </select>
  </label>;
}
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

export default function AppShell({children}){
  const [client]=useState(()=>new QueryClient({
    defaultOptions:{queries:{staleTime:30_000,retry:shouldRetryQuery,refetchOnWindowFocus:false}}
  }));
  const {scrollYProgress}=useScroll();
  const scaleX=useSpring(scrollYProgress,{stiffness:220,damping:34,mass:.28});
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

  return <QueryClientProvider client={client}>
    <motion.div className="loc-scroll-progress" style={{scaleX}} aria-hidden="true"/>
    <header className="scope-global">
      <nav className="scope-nav" aria-label={UI_COPY.nav.aria}>
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
      </nav>
    </header>
    {children}
    <footer className="scope-footer" data-scope={scopeId}>
      <div className="scope-footer-row">
        <a href="mailto:sopa2306@gmail.com">{UI_COPY.nav.contact}</a>
        <ThemeSelect scopeId={scopeId}/>
      </div>
    </footer>
  </QueryClientProvider>;
}
