'use client';

import dynamic from 'next/dynamic';
import {Suspense} from 'react';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import AboutView from './views/AboutView';
import AuthorHomeView from './views/AuthorHomeView';
import AdminHomeView from './views/AdminHomeView';
import Statistics from '../modular/features/Statistics';
import Culture from '../modular/features/Culture';
import Search from '../modular/features/Search';
import Governance from '../modular/features/Governance';

const loading=()=> <div className="loc-loading">載入功能模組…</div>;
const RunesHomeView=dynamic(()=>import('../lrunes/RunesClient'),{ssr:false,loading});
const GameView=dynamic(()=>import('../lrunes/game/GameView'),{ssr:false,loading});
const ManagementView=dynamic(()=>import('./GovernanceManagement'),{loading});

const VIEWS={
  game:GameView,
  statics:Statistics,
  culture:Culture,
  search:Search,
  governance:Governance,
  manage:ManagementView
};
const HOME_VIEWS={loc:AboutView,lrunes:RunesHomeView,lo3rwang:AuthorHomeView,admin:AdminHomeView};

export default function LocApp({forcedView='home',forcedSection=null,forcedScope=null}){
  const {scopeId}=useScopeRuntime();
  const scope=forcedScope||scopeId;
  const ActiveView=forcedView==='home'
    ?HOME_VIEWS[scope]||AboutView
    :VIEWS[forcedView]||AboutView;

  return <div className="loc-next-main" data-loc-scope={scope} data-loc-view={forcedView}>
    <Suspense fallback={<div className="loc-loading">載入頁面…</div>}>
      <ActiveView section={forcedSection}/>
    </Suspense>
  </div>;
}
