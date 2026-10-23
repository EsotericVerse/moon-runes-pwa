'use client';

import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {Capacitor} from '@capacitor/core';
import {QueryClient,QueryClientProvider,useQuery,useQueryClient} from '@tanstack/react-query';
import {translateUiField,UI_COPY,UI_LOCALE_OPTIONS,normalizeUiLocale,uiCopy,registerDefaultSection,isSectionLoaded,loadSection} from './i18n/ui-copy';
import {UiLocaleProvider,useLoadedUiLocale,useUiLocale,useUiSection} from './i18n/ui-locale';
import FieldText from './i18n/FieldText';
import fieldsZh from './i18n/sections/fields.zh_tw.js';
import dataSourceStatusZh from './i18n/sections/uiExtra.dataSourceStatus.zh_tw.js';
registerDefaultSection('fields',fieldsZh);
registerDefaultSection('uiExtra.dataSourceStatus',dataSourceStatusZh);
import {FEATURES,SCOPES,featureIdForPath,getScope,setScopeRegistryRouteRows} from './modular/scope-registry';
import {applyTheme,themeSignature,THEME_SLOTS} from './modular/theme-registry';
import {mergeThemeSlot} from './loc/theme-data';
import {useScopeRuntime} from './modular/use-scope-runtime';
import {faviconForScope} from './site-favicons';
import {appBootstrapPageCopy,useAppBootstrap} from './loc/app-bootstrap';
import {getDbSourceStatus,subscribeDbSourceStatus} from './loc/db-source-status.mjs';
import {useNavigationPreferences} from './loc/use-navigation-preferences';
import {NavigationPreferences} from './modular/navigation-preferences';
import {navigationHref} from './modular/scope-registry.js';
import BottomNavIcon from './modular/BottomNavIcon';
import ScrollableScopeNav from './modular/ScrollableScopeNav';
import ScopeLink from './modular/ScopeLink';

const {account:accountNavigation,device:deviceNavigation}=NavigationPreferences;

const SYSTEM_THEME_ID='system-default';
const DAY_THEME_ID='theme-7';
const NIGHT_THEME_ID='theme-1';
const THEME_TIME_ZONE='Asia/Taipei';
const NAV_SCOPES=Object.values(SCOPES)
  .filter(scope=>scope.nav)
  .sort((a,b)=>String(a.nav.position).localeCompare(String(b.nav.position))||Number(a.nav.order||0)-Number(b.nav.order||0));

function DataSourceStatus(){
  const {copy}=useUiLocale();
  useUiSection('uiExtra.dataSourceStatus');
  const section=copy.uiExtra.dataSourceStatus||{};
  const status=useSyncExternalStore(subscribeDbSourceStatus,getDbSourceStatus,getDbSourceStatus);
  const current=status.unavailable
    ?`${section.unavailable||''}`
    :status.degraded
      ?`${section.backup||''}（${status.backupLabel}）`
      :`${section.primary||''}（${status.primaryLabel}）`;
  return <div className={'scope-data-source-global'+(status.unavailable?' is-unavailable':status.degraded?' is-backup':'')}>
    <details className="scope-data-source-details" open={status.degraded||undefined}>
      <summary>{section.detailsTitle}</summary>
      <div className="scope-data-source-values">
        <span><FieldText text="主要資料來源："/>{status.primaryLabel}</span>
        <span><FieldText text="備用資料來源："/>{status.backupLabel}</span>
        <span><FieldText text="目前使用："/>{current}</span>
      </div>
    </details>
    {status.unavailable
      ?<span role="status"><FieldText text="主要與備援資料來源目前皆無法讀取，部分內容可能暫時無法顯示。"/></span>
      :status.degraded?<span role="status"><FieldText text="備援資料可能有同步時間差。"/></span>:null}
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

function ThemeSelect({scopeId,scopeMeta=null,copy=UI_COPY,defaultThemeIdOverride='',pageName='index'}){
  const scope=scopeMeta||getScope(String(scopeId||'').trim());
  // Scope defaults are owned by the Scope config table; the game route alone
  // has its own purpose-built temporary default, never persisted to the DB.
  const fixedDefaultThemeId=String(defaultThemeIdOverride||'').trim();
  // Shares the ONE bootstrap request other shell parts already make for this
  // page: nothing here issues a second round trip for config or Themes.
  const bootstrap=useAppBootstrap(scopeId,pageName);
  const configEnabled=!fixedDefaultThemeId&&!scope.aggregateChildren&&scope.id!=='admin';
  const configuredTheme=configEnabled?String(bootstrap.data?.config?.theme||'').trim():'';
  const configuredDefaultThemeId=configuredTheme===SYSTEM_THEME_ID?'':configuredTheme;
  const [selection,setSelection]=useState(()=>({scopeId,themeId:SYSTEM_THEME_ID}));
  const [now,setNow]=useState(()=>new Date());
  const selectedThemeId=selection.scopeId===scopeId?selection.themeId:SYSTEM_THEME_ID;
  const systemDefaultThemeId=fixedDefaultThemeId||configuredDefaultThemeId||automaticThemeId(now);
  const effectiveThemeId=selectedThemeId===SYSTEM_THEME_ID?systemDefaultThemeId:selectedThemeId;
  const themeRows=Array.isArray(bootstrap.data?.themes)?bootstrap.data.themes:[];
  const override=themeRows.find(row=>row.theme_id===effectiveThemeId)||null;
  const slot=useMemo(
    ()=>mergeThemeSlot(effectiveThemeId,override),
    [effectiveThemeId,override]
  );
  const themeChoices=themeRows.length
    ?themeRows.map(row=>({id:row.theme_id,label:row.theme_name||row.theme_id}))
    :THEME_SLOTS.map(item=>({id:item.id,label:item.label}));

  useEffect(()=>{
    // Show the page as soon as it hydrates, in the built-in day/night palette, and
    // never wait on the network. The DB palette and the Scope's configured theme
    // are applied the moment they arrive (slot changes). No palette is stored.
    const root=document.documentElement;
    if(root.dataset.themeSignature===themeSignature(slot)){
      delete root.dataset.themeBootstrap;
      return;
    }
    applyTheme(slot);
  },[slot,scopeId,effectiveThemeId]);

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
function ScopePageCopy({scopeId,display_name,pageName='index'}){
  const enabled=Boolean(scopeId)&&scopeId!=='loc'&&scopeId!=='admin';
  const bootstrap=useAppBootstrap(scopeId,pageName);
  const pageCopy=enabled?appBootstrapPageCopy(bootstrap.data,scopeId):null;
  useEffect(()=>{
    const title=String(pageCopy?.Title_TW||display_name||'').trim();
    if(title&&document.title!==title)document.title=title;
    const description=String(pageCopy?.Desc_TW||'').trim();
    if(description){
      let meta=document.head.querySelector('meta[name="description"]');
      if(!meta){
        meta=document.createElement('meta');
        meta.setAttribute('name','description');
        document.head.appendChild(meta);
      }
      if(meta.getAttribute('content')!==description)meta.setAttribute('content',description);
    }
  },[scopeId,display_name,pageCopy?.Title_TW,pageCopy?.Desc_TW]);
  return null;
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
    const url=new URL(href,'https://'+host);
    return url.hostname===host.split(':')[0]&&normalizePath(url.pathname)===normalizePath(pathname);
  }catch{return false;}
}

// A two-pixel progress indicator should not eagerly download motion/react
// on every route. Use native scroll-driven CSS; older browsers get a tiny,
// passive, requestAnimationFrame-throttled fallback.
function ScrollProgress(){
  const elementRef=useRef(null);
  useEffect(()=>{
    if(typeof CSS!=='undefined'&&CSS.supports?.('animation-timeline: scroll(root block)'))return undefined;
    let frame=0;
    const paint=()=>{
      frame=0;
      if(!elementRef.current)return;
      const height=Math.max(document.documentElement.scrollHeight,document.body?.scrollHeight||0);
      const remaining=height-window.innerHeight;
      const ratio=remaining>0?Math.max(0,Math.min(1,window.scrollY/remaining)):0;
      elementRef.current.style.transform='scaleX('+ratio+')';
    };
    const schedule=()=>{if(!frame)frame=window.requestAnimationFrame(paint);};
    paint();
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule);
    return()=>{
      window.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',schedule);
      if(frame)window.cancelAnimationFrame(frame);
    };
  },[]);
  return <div ref={elementRef} className="loc-scroll-progress"
    style={{transform:'scaleX(0)'}} aria-hidden="true"/>;
}

function NavTarget({href,label,current=false,native=false}){
  return current?<span className="scope-nav-current" aria-current="page">{label}</span>:<ScopeLink href={href} native={native}>{label}</ScopeLink>;
}

// The provider must sit ABOVE the component that calls useAppBootstrap, so it
// lives in this thin wrapper (a hook cannot read a provider rendered by itself).
export default function AppShell({children}){
  const [client]=useState(()=>new QueryClient({
    defaultOptions:{queries:{staleTime:30_000,retry:shouldRetryQuery,refetchOnWindowFocus:false}}
  }));
  return <QueryClientProvider client={client}><AppShellInner>{children}</AppShellInner></QueryClientProvider>;
}

function AppShellInner({children}){
  const {scopeId,scope,host,pathname,registryRow,configRow}=useScopeRuntime();
  const queryClient=useQueryClient();
  const localReadyQuery=useQuery({
    queryKey:['local-scope-content-ready'],
    enabled:scopeId==='local',
    queryFn:async()=>{
      const {hasLocalScopeContent}=await import('./loc/providers/local-sqlite.mjs');
      return hasLocalScopeContent();
    },
    staleTime:30_000
  });
  useEffect(()=>{
    if(scopeId!=='local')return undefined;
    const refresh=()=>queryClient.invalidateQueries({queryKey:['local-scope-content-ready']});
    window.addEventListener('loc-local-scope-data-changed',refresh);
    return()=>window.removeEventListener('loc-local-scope-data-changed',refresh);
  },[scopeId,queryClient]);
  // Static export serves the same root HTML on multiple Scope subdomains.
  // Update the browser tab icon after the client resolves the actual Scope.
  useEffect(()=>{
    if(!host)return;
    let link=document.getElementById('loc-active-favicon');
    if(!link){
      link=document.createElement('link');
      link.id='loc-active-favicon';
      link.rel='icon';
      link.type='image/png';
      document.head.appendChild(link);
    }
    link.href=faviconForScope(scopeId);
  },[scopeId,host]);
  const currentFeature=featureIdForPath(pathname);
  const pageName=currentFeature||'index';
  const isSettings=['/settings','/settings/index.html','/local/setting','/local/setting/index.html','/local/settings','/local/settings/index.html'].includes(normalizePath(pathname));
  const [native,setNative]=useState(false);
  const [mobileFavorite,setMobileFavorite]=useState(true);
  const [nativeHomepage,setNativeHomepage]=useState('loc');
  const preferences=useNavigationPreferences();
  const [openFolderId,setOpenFolderId]=useState('');
  // ONE request for this page. The Scope Registry, every registered Scope's
  // NAV title, the active Themes and this Scope's own config and blocks all
  // come from it; ThemeSelect and ScopePageCopy below ask for the exact same
  // (scopeId, pageName) key, so React Query serves them from this one call.
  const bootstrap=useAppBootstrap(scopeId,pageName);
  const registryScopes=bootstrap.data?.registry||[];
  const registryLoaded=bootstrap.isSuccess||bootstrap.isError;
  const navDisplayNames=useMemo(()=>{
    const entries=(bootstrap.data?.page_copy||[])
      .map(row=>[String(row.scope_id||''),String(row.Title_TW||'').trim()])
      .filter(([,label])=>label);
    return Object.fromEntries(entries);
  },[bootstrap.data]);
  useEffect(()=>{
    const actual=Capacitor.isNativePlatform();
    setNative(actual);
    if(!actual)return;
    const sync=()=>{
      setMobileFavorite(deviceNavigation.mobileFavoriteEnabled(window.localStorage));
      setNativeHomepage(deviceNavigation.mobileHomepageChoice(window.localStorage));
    };
    sync();
    window.addEventListener('loc-device-navigation-changed',sync);
    return()=>window.removeEventListener('loc-device-navigation-changed',sync);
  },[]);
  useEffect(()=>{
    if(bootstrap.data?.registry)setScopeRegistryRouteRows(bootstrap.data.registry);
  },[bootstrap.data]);
  const currentScope=scope||getScope(scopeId);
  // The Scope's locale travels inside the same bootstrap request as its config;
  // no separate fetch. A manual pick stands until the Scope changes.
  const [manualLocale,setManualLocale]=useState(null);
  const configLocaleEnabled=Boolean(scopeId)&&!currentScope.aggregateChildren&&scopeId!=='admin';
  const configuredLocale=configLocaleEnabled?normalizeUiLocale(bootstrap.data?.config?.locale):'zh-Hant';
  const activeLocale=manualLocale?.scopeId===scopeId?manualLocale.locale:configuredLocale;
  const localeReady=useLoadedUiLocale(activeLocale);
  const copy=useMemo(()=>uiCopy(activeLocale),[activeLocale,localeReady]);
  useEffect(()=>{
    if(isSectionLoaded(activeLocale,'fields'))return undefined;
    let active=true;
    loadSection(activeLocale,'fields').catch(()=>{});
    return ()=>{active=false;};
  },[activeLocale]);
  const navScopeId=scopeId==='local'&&!localReadyQuery.data?'loc':currentScope.featureScope||scopeId;
  const gameThemeDefault=/(^|\/)game\/?$/.test(String(pathname||''))?'theme-4':'';

  useEffect(()=>{
    if(typeof document!=='undefined')document.documentElement.lang=activeLocale;
  },[activeLocale]);
  // Favorite targets are workspaces, not feature tabs. Unregistered/inactive
  // dynamic IDs are omitted; built-in fallback links work before DB hydration.
  const scopeNavLabel=item=>navDisplayNames[item.id]||item.nav.label;
  const registryMap=new Map(registryScopes.map(item=>[item.scope_id,item]));
  const layout=accountNavigation.folders.visibleFavoriteLayout(preferences.favorites,preferences.folders);
  const favoriteLinks=layout.direct.filter(id=>!native||id!=='lrunes').map(id=>{
    const builtIn=NAV_SCOPES.find(item=>item.id===id);
    const active=registryMap.get(id);
    if(!builtIn&&!active)return null;
    return {id,label:builtIn?scopeNavLabel(builtIn):(navDisplayNames[id]||id)};
  }).filter(Boolean);
  // LunaRunes is the immutable core native App workspace, not a removable cloud favorite.
  if(native){
    favoriteLinks.unshift({id:'lrunes',label:'月之符文'});
    if(mobileFavorite)favoriteLinks.splice(1,0,{id:deviceNavigation.MOBILE_HOME_ID,label:translateUiField(activeLocale,'我的手機')});
  }
  const navLabel=id=>{
    const builtIn=NAV_SCOPES.find(item=>item.id===id);
    if(!builtIn&&!registryMap.has(id))return null;
    return builtIn?scopeNavLabel(builtIn):(navDisplayNames[id]||id);
  };
  const visibleFolders=layout.directories.map(folder=>({
    ...folder,links:folder.scopes.filter(id=>!native||id!=='lrunes').map(id=>({id,label:navLabel(id)})).filter(item=>item.label)
  }));
  const openFolder=visibleFolders.find(folder=>folder.id===openFolderId)||null;
  const isMyPhone=native&&normalizePath(pathname)==='/my-phone';
  const featureTabs=[
    {id:'home',icon:'home',label:translateUiField(activeLocale,'首頁'),href:isMyPhone?deviceNavigation.mobileHomeHref(true):navigationHref(navScopeId,'',native)+(native&&navScopeId==='loc'?'?loc_direct=1':'')},
    ...['culture','statics','search','governance'].map(id=>{
      const feature=FEATURES.find(item=>item.id===id);
      return {id,icon:id,label:copy.features?.[id]?.title||feature.label,
        href:isMyPhone?deviceNavigation.mobileHomeHref(true)+'#'+id:navigationHref(navScopeId==='local'&&id==='governance'?'loc':navScopeId,feature.path,native)};
    }),
    {id:'settings',icon:'settings',label:copy.common.settings||'設定',href:native?'/local/settings/index.html':'/local/settings/'}
  ];

  useEffect(()=>{
    // A saved homepage changes the native App launch destination, not the
    // meaning of the "首頁" tab or the explicit LOC favorite link.
    if(!native||pathname!=='/'||preferences.loading||!registryLoaded)return;
    // Explicit LOC navigation remains possible even with a saved default.
    if(new URLSearchParams(window.location.search).has('loc_direct'))return;
    if(nativeHomepage===deviceNavigation.MOBILE_HOME_ID){
      window.location.replace(deviceNavigation.mobileHomeHref(true));return;
    }
    const target=nativeHomepage==='lrunes'?'lrunes':accountNavigation.homeScopeForAccount(nativeHomepage,preferences.account,
      ['loc',...NAV_SCOPES.map(item=>item.id),...registryScopes.map(item=>item.scope_id)]);
    if(target!=='loc')window.location.replace(navigationHref(target,'',true));
  },[native,nativeHomepage,pathname,preferences.loading,preferences.account,registryLoaded,registryScopes]);


  return <UiLocaleProvider locale={activeLocale}>
    <ScopePageCopy scopeId={scopeId} display_name={configRow?.display_name||registryRow?.display_name} pageName={pageName}/>
    <ScrollProgress/>
    <header className="scope-global" data-native={native?'ios':'web'}>
      <nav className="scope-nav" aria-label={copy.nav.aria}>
        <ScrollableScopeNav label={translateUiField(activeLocale,'常用空間')} resetKey={preferences.favorites.join(',')+'|'+mobileFavorite+'|'+native+'|'+visibleFolders.map(folder=>folder.id+':'+folder.label).join(',')}>
          {favoriteLinks.map(item=>{
            const href=item.id===deviceNavigation.MOBILE_HOME_ID?deviceNavigation.mobileHomeHref(native):navigationHref(item.id,'',native);
            return <NavTarget key={item.id} href={href} label={item.label} current={targetIsCurrent(href,host,pathname)} native={native}/>;
          })}
          {visibleFolders.map(folder=><button type="button" key={folder.id}
            className="scope-nav-folder" aria-expanded={openFolderId===folder.id}
            aria-controls="scope-nav-folder-contents" onClick={()=>setOpenFolderId(current=>current===folder.id?'':folder.id)}>
            {folder.label} <span aria-hidden="true">{openFolderId===folder.id?'▴':'▾'}</span>
          </button>)}
          {!favoriteLinks.length&&!visibleFolders.length?<ScopeLink href={native?'/local/settings/index.html':'/local/settings/'} native={native} className="scope-nav-empty"><FieldText text="到設定加入常用空間"/></ScopeLink>:null}
        </ScrollableScopeNav>
        <ScopeLink href={navigationHref('loc','',native)+(native?'?loc_direct=1':'')} native={native}
          className="scope-nav-loc-home" aria-current={scopeId==='loc'&&pathname==='/'?'page':undefined}>
          {copy.nav.home}
        </ScopeLink>
      </nav>
      {openFolder?<div id="scope-nav-folder-contents" className="scope-nav-subrow" aria-label={openFolder.label+' '+translateUiField(activeLocale,'目錄')}>
        <ScrollableScopeNav label={openFolder.label+' '+translateUiField(activeLocale,'目錄內容')} resetKey={openFolder.id+'|'+openFolder.links.map(item=>item.id).join(',')}>
          {openFolder.links.map(item=>{
            const href=navigationHref(item.id,'',native);
            return <NavTarget key={item.id} href={href} label={item.label} current={targetIsCurrent(href,host,pathname)} native={native}/>;
          })}
          {!openFolder.links.length?<span className="scope-nav-folder-empty"><FieldText text="目錄尚無入口"/></span>:null}
        </ScrollableScopeNav>
        <button type="button" className="scope-nav-close-folder" aria-label={translateUiField(activeLocale,'收合目錄')} onClick={()=>setOpenFolderId('')}>×</button>
      </div>:null}
    </header>
    {children}
    <nav className="scope-feature-dock" aria-label={translateUiField(activeLocale,'固定功能選單')} data-scope={scopeId}>
      {featureTabs.map(tab=><ScopeLink key={tab.id} href={tab.href} native={native}
        aria-current={tab.id==='settings'?isSettings?'page':undefined:
          !isSettings&&(tab.id==='home'?!currentFeature:currentFeature===tab.id)?'page':undefined}>
        <BottomNavIcon name={tab.icon}/>
        <span>{tab.label}</span>
      </ScopeLink>)}
    </nav>
    <footer className="scope-footer" data-scope={scopeId}>
      <div className="scope-footer-row">
        <a href="mailto:sopa2306@gmail.com">{copy.nav.contact}</a>
        <ThemeSelect scopeId={scopeId} scopeMeta={currentScope} copy={copy} defaultThemeIdOverride={gameThemeDefault} pageName={pageName}/>
        <LanguageSelect
          locale={activeLocale}
          copy={copy}
          onChange={locale=>setManualLocale({scopeId,locale:normalizeUiLocale(locale)})}
        />
      </div>
      <DataSourceStatus/>
    </footer>
  </UiLocaleProvider>;
}
