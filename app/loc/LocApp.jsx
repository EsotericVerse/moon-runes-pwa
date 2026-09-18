'use client';

import dynamic from 'next/dynamic';
import {useEffect,useMemo,useState} from 'react';
import {detectSiteScope} from '../site-registry';
import AboutView from './views/AboutView';
import AuthorHomeView from './views/AuthorHomeView';
import AdminHomeView from './views/AdminHomeView';

const loading=()=> <div className="loc-loading">載入功能模組…</div>;
const RunesHomeView=dynamic(()=>import('../runes/RunesClient'),{ssr:false,loading});
const GameView=dynamic(()=>import('./views/GameView'),{ssr:false,loading});
const ContextView=dynamic(()=>import('./views/ContextView'),{ssr:false,loading});
const StaticsView=dynamic(()=>import('./views/StaticsView'),{ssr:false,loading});
const CultureView=dynamic(()=>import('./views/EvolutionView'),{ssr:false,loading});
const SearchView=dynamic(()=>import('./views/SearchView'),{ssr:false,loading});
const GovernanceView=dynamic(()=>import('./views/GovernanceView'),{ssr:false,loading});
const StyleGroupsView=dynamic(()=>import('./views/StyleGroupsView'),{ssr:false,loading});
const ClassifyView=dynamic(()=>import('./views/ClassifyView'),{ssr:false,loading});
const LibraryView=dynamic(()=>import('./views/LibraryView'),{ssr:false,loading});
const MyStyleView=dynamic(()=>import('./views/MyStyleView'),{ssr:false,loading});
const MediaView=dynamic(()=>import('./views/MediaView'),{ssr:false,loading});

const VIEWS={
  game:GameView,context:ContextView,classify:ClassifyView,
  library:LibraryView,multimedia:MediaView,'my-style':MyStyleView,statics:StaticsView,
  culture:CultureView,evolution:CultureView,search:SearchView,governance:GovernanceView,
  'style-groups':StyleGroupsView
};

const HOME_VIEWS={
  loc:AboutView,
  runes:RunesHomeView,
  lo3rwang:AuthorHomeView,
  governance:AdminHomeView
};

function routeState(){
  if(typeof window==='undefined')return {scope:'loc',view:'home'};
  const pathname=window.location.pathname.replace(/\/$/,'')||'/';
  const scope=detectSiteScope(pathname,window.location.hostname);
  const route=pathname.split('/').filter(Boolean).at(-1)||'home';
  return {scope,view:VIEWS[route]?route:'home'};
}

export default function LocApp({forcedView=null}){
  const [state,setState]=useState({scope:'loc',view:forcedView||'home'});
  useEffect(()=>{
    if(forcedView){
      const scope=detectSiteScope(window.location.pathname,window.location.hostname);
      setState({scope,view:forcedView});
      return undefined;
    }
    const sync=()=>setState(routeState());
    sync();window.addEventListener('popstate',sync);
    return()=>window.removeEventListener('popstate',sync);
  },[forcedView]);

  const ActiveView=useMemo(()=>{
    if(state.view==='home')return HOME_VIEWS[state.scope]||AboutView;
    return VIEWS[state.view]||HOME_VIEWS[state.scope]||AboutView;
  },[state]);

  return <main className="loc-next-main" data-loc-scope={state.scope} data-loc-view={state.view}><ActiveView/></main>;
}
