'use client';

import dynamic from 'next/dynamic';
import {useEffect,useMemo,useState} from 'react';
import {resolveScopeV2} from '../modular-v2/scope-registry.v2';
import AboutView from './views/AboutView';
import AuthorHomeView from './views/AuthorHomeView';
import AdminHomeView from './views/AdminHomeView';
import GenericScopeHomeV2 from '../modular-v2/GenericScopeHomeV2';

const loading=()=> <div className="loc-loading">載入功能模組…</div>;
const RunesHomeView=dynamic(()=>import('../runes/RunesClient'),{ssr:false,loading});
const GameView=dynamic(()=>import('./views/GameView'),{ssr:false,loading});
// Feature shells render synchronously so title, shared CSS and local link menus
// never wait for Neon canonical data or client-only module hydration.
const ContextView=dynamic(()=>import('../modular-v2/features/ContextV2'),{loading});
const StaticsView=dynamic(()=>import('../modular-v2/features/StatisticsV2'),{loading});
const CultureView=dynamic(()=>import('../modular-v2/features/CultureV2'),{loading});
const SearchView=dynamic(()=>import('../modular-v2/features/SearchV2'),{loading});
const GovernanceView=dynamic(()=>import('../modular-v2/features/GovernanceV2'),{loading});
const StyleGroupsView=dynamic(()=>import('./views/StyleGroupsView'),{ssr:false,loading});
const ClassifyView=dynamic(()=>import('./views/ClassifyView'),{ssr:false,loading});
const LibraryView=dynamic(()=>import('./views/LibraryView'),{ssr:false,loading});
const MyStyleView=dynamic(()=>import('./views/MyStyleView'),{ssr:false,loading});
const MediaView=dynamic(()=>import('./views/MediaView'),{ssr:false,loading});

function BlockedScopeRoute(){return <section className="loc-view"><h1>此頁面不屬於目前 Scope</h1><p>管理功能只在 admin Scope 提供。</p></section>;}
function AdminRedirect(){useEffect(()=>{window.location.replace('https://admin.lo3rwang.cc/');},[]);return <section className="loc-view"><h1>前往系統掌控者頁面</h1><p>正在轉往 admin.lo3rwang.cc…</p></section>;}

const VIEWS={
  game:GameView,context:ContextView,classify:ClassifyView,
  library:LibraryView,multimedia:MediaView,'my-style':MyStyleView,statics:StaticsView,
  culture:CultureView,search:SearchView,governance:GovernanceView,
  'style-groups':StyleGroupsView
};

const HOME_VIEWS={loc:AboutView,runes:RunesHomeView,lo3rwang:AuthorHomeView,admin:AdminHomeView};

function routeState(){
  if(typeof window==='undefined')return {scope:'loc',view:'home'};
  const pathname=window.location.pathname.replace(/\/$/,'')||'/';
  const host=window.location.hostname.toLowerCase();
  const scope=resolveScopeV2(host,pathname);
  if(pathname==='/admin'||pathname.startsWith('/admin/')){
    if(host==='loc.lo3rwang.cc')return {scope:'loc',view:'admin-redirect'};
    if(host!=='admin.lo3rwang.cc')return {scope,view:'blocked'};
  }
  if(scope==='runes'&&/^\/lo3rwang(?:\/|$)/.test(pathname))return {scope,view:'blocked'};
  const route=pathname.split('/').filter(Boolean).at(-1)||'home';
  return {scope,view:VIEWS[route]?route:'home'};
}

export default function LocApp({forcedView=null,forcedSection=null,forcedScope=null}){
  const [state,setState]=useState({scope:forcedScope||'loc',view:forcedView||'home',section:forcedSection});
  useEffect(()=>{
    if(forcedView){
      const scope=forcedScope||resolveScopeV2(window.location.hostname,window.location.pathname);
      setState({scope,view:forcedView,section:forcedSection});
      return undefined;
    }
    const sync=()=>setState(routeState());
    sync();window.addEventListener('popstate',sync);
    return()=>window.removeEventListener('popstate',sync);
  },[forcedView,forcedSection,forcedScope]);

  const ActiveView=useMemo(()=>{
    if(state.view==='blocked')return BlockedScopeRoute;
    if(state.view==='admin-redirect')return AdminRedirect;
    if(state.view==='home')return HOME_VIEWS[state.scope]||GenericScopeHomeV2;
    return VIEWS[state.view]||HOME_VIEWS[state.scope]||GenericScopeHomeV2;
  },[state]);

  return <div className="loc-next-main" data-loc-scope={state.scope} data-loc-view={state.view}><ActiveView section={state.section}/></div>;
}
