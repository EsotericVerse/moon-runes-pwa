'use client';

import {useEffect,useMemo,useState,useSyncExternalStore} from 'react';
import {motion,useScroll,useSpring} from 'motion/react';
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
import {UI_COPY,UI_LOCALE_OPTIONS,normalizeUiLocale,uiCopy} from './i18n/ui-copy';
import {UiLocaleProvider} from './i18n/ui-locale';
import {FEATURES,SCOPES,featureHref,featureIdForPath,getScope,scopeHref} from './modular/scope-registry';
import {applyTheme,themeSignature,THEME_SLOTS} from './modular/theme-registry';
import {mergeThemeSlot,selectThemeRegistry} from './loc/theme-data';
import {useScopeRuntime} from './modular/use-scope-runtime';
import {selectScopeConfig} from './loc/scope-data';
import {getDbSourceStatus,subscribeDbSourceStatus} from './loc/db-source-status.mjs';

const SYSTEM_THEME_ID='system-default';
const DAY_THEME_ID='theme-7';
const NIGHT_THEME_ID='theme-1';
const THEME_TIME_ZONE='Asia/Taipei';
const NAV_FEATURE_ORDER=['culture','statics','governance'];
const NAV_SCOPES=Object.values(SCOPES)
  .filter(scope=>scope.nav)
  .sort((a,b)=>String(a.nav.position).localeCompare(String(b.nav.position))||Number(a.nav.order||0)-Number(b.nav.order||0));

function DataSourceStatus(){
  const status=useSyncExternalStore(subscribeDbSourceStatus,getDbSourceStatus,getDbSourceStatus);
  const current=status.degraded
    ?`備援資料（${status.backupLabel}）`
    :`主要資料（${status.primaryLabel}）`;
  return <div className={'scope-data-source-global'+(status.degraded?' is-backup':'')} role="status">
    <span>主要資料來源：{status.primaryLabel}</span>
    <span>備用資料來源：{status.backupLabel}</span>
    <span>目前使用：{current}</span>
    {status.degraded?<span>備援資料可能有同步時間差。</span>:null}
  </div>;
}

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

function ThemeSelect({scopeId,scopeMeta=null,copy=UI_COPY,defaultThemeIdOverride=''}){
  const scope=scopeMeta||getScope(String(scopeId||'').trim());
  const policy=scope.theme||{mode:'auto'};
  const fixedDefaultThemeId=String(defaultThemeIdOverride||'').trim()||(policy.mode==='fixed'?String(policy.themeId||'').trim():'');
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
  const themeRegistryQuery=useQuery({
    queryKey:['theme-registry'],
    queryFn:selectThemeRegistry,
    staleTime:60_000
  });
  const themeRows=Array.isArray(themeRegistryQuery.data)?themeRegistryQuery.data:[];
  const override=themeRows.find(row=>row.theme_id===effectiveThemeId)||null;
  const slot=useMemo(
    ()=>mergeThemeSlot(effectiveThemeId,override),
    [effectiveThemeId,override]
  );
  const themeChoices=themeRows.length
    ?themeRows.map(row=>({id:row.theme_id,label:row.theme_name||row.theme_id}))
    :THEME_SLOTS.map(item=>({id:item.id,label:item.label}));

  useEffect(()=>{
    if(!override&&effectiveThemeId!=='theme-7')return;
    const root=document.documentElement;
    if(root.dataset.themeSignature===themeSignature(slot))return;
    applyTheme(slot);
  },[slot,scopeId,effectiveThemeId,override]);

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
    <span>{copy.common.theme}</span>
    <select value={selectedThemeId} onChange={event=>setSelection({scopeId,themeId:event.target.value})} aria-label={copy.common.theme}>
      <option value={SYSTEM_THEME_ID}>{copy.common.systemTheme}</option>
      {themeChoices.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}
    </select>
  </label>;
}
function LanguageSelect({locale,onChange,copy=UI_COPY}){
  return <label className="scope-theme-control scope-language-control">
    <span>{copy.common.language||'語系'}</span>
    <select value={locale} onChange={event=>onChange?.(event.target.value)} aria-label={copy.common.language||'語系'}>
      {UI_LOCALE_OPTIONS.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}
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
  const {scopeId,scope,host,pathname}=useScopeRuntime();
  const currentFeature=featureIdForPath(pathname);
  const [searchText,setSearchText]=useState('');
  const currentScope=scope||getScope(scopeId);
  const [localeSelection,setLocaleSelection]=useState(()=>({scopeId:'',locale:'zh-Hant',manual:false}));
  const activeLocale=localeSelection.scopeId===scopeId?normalizeUiLocale(localeSelection.locale):'zh-Hant';
  const copy=useMemo(()=>uiCopy(activeLocale),[activeLocale]);
  const navScopeId=currentScope.featureScope||scopeId;
  const gameThemeDefault=/(^|\/)game\/?$/.test(String(pathname||''))?'theme-4':'';

  useEffect(()=>{
    let active=true;
    setLocaleSelection({scopeId,locale:'zh-Hant',manual:false});
    if(!scopeId||currentScope.aggregateChildren||scopeId==='admin')return()=>{active=false};
    selectScopeConfig(scopeId).then(row=>{
      if(!active)return;
      const locale=normalizeUiLocale(row?.locale);
      setLocaleSelection(current=>{
        if(current.scopeId===scopeId&&current.manual)return current;
        return {scopeId,locale,manual:false};
      });
    }).catch(()=>{});
    return()=>{active=false};
  },[scopeId,currentScope.aggregateChildren]);

  useEffect(()=>{
    if(typeof document!=='undefined')document.documentElement.lang=activeLocale;
  },[activeLocale]);
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

  const featureLabel=item=>copy.features?.[item.id]?.title||item.label;
  const scopeNavLabel=item=>{
    if(item.id==='lrunes')return copy.nav.lunarunes;
    if(item.id==='lo3rwang')return copy.nav.author;
    if(item.id==='loc')return copy.nav.home;
    return item.nav?.label||item.label;
  };

  return <QueryClientProvider client={client}><UiLocaleProvider locale={activeLocale}>
    <motion.div className="loc-scroll-progress" style={{scaleX}} aria-hidden="true"/>
    <header className="scope-global">
      <nav className="scope-nav" aria-label={copy.nav.aria}>
        {beforeScopes.map(item=>{
          const href=scopeHref(item.id);
          return <NavTarget key={item.id} href={href} label={scopeNavLabel(item)} current={targetIsCurrent(href,host,pathname)}/>;
        })}
        {NAV_FEATURE_ORDER.map(id=>FEATURES.find(item=>item.id===id)).filter(Boolean).map(item=>
          <NavTarget key={item.id} href={featureHref(navScopeId,item.id)} label={featureLabel(item)} current={!currentScope.featureScope&&currentFeature===item.id}/>
        )}
        <form onSubmit={submitSearch} role="search" className="scope-search">
          <input name="q" type="search" aria-label={copy.nav.searchAria} placeholder={copy.nav.search} value={searchText} onChange={event=>setSearchText(event.target.value)}/>
        </form>
        {afterScopes.map(item=>{
          const href=scopeHref(item.id);
          return <NavTarget key={item.id} href={href} label={scopeNavLabel(item)} current={targetIsCurrent(href,host,pathname)}/>;
        })}
      </nav>
    </header>
    {children}
    <footer className="scope-footer" data-scope={scopeId}>
      <div className="scope-footer-row">
        <a href="mailto:sopa2306@gmail.com">{copy.nav.contact}</a>
        <ThemeSelect scopeId={scopeId} scopeMeta={currentScope} copy={copy} defaultThemeIdOverride={gameThemeDefault}/>
        <LanguageSelect
          locale={activeLocale}
          copy={copy}
          onChange={locale=>setLocaleSelection({scopeId,locale:normalizeUiLocale(locale),manual:true})}
        />
      </div>
      <DataSourceStatus/>
    </footer>
  </UiLocaleProvider></QueryClientProvider>;
}
