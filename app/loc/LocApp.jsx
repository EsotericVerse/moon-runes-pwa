'use client';

import dynamic from 'next/dynamic';
import {Suspense} from 'react';
import {useScopeRuntimeV2} from '../modular-v2/use-scope-runtime.v2';
import AboutView from './views/AboutView';
import AuthorHomeView from './views/AuthorHomeView';
import AdminHomeView from './views/AdminHomeView';
import StatisticsV2 from '../modular-v2/features/StatisticsV2';
import CultureV2 from '../modular-v2/features/CultureV2';
import SearchV2 from '../modular-v2/features/SearchV2';
import GovernanceV2 from '../modular-v2/features/GovernanceV2';

const loading=()=> <div className="loc-loading">載入功能模組…</div>;
const RunesHomeView=dynamic(()=>import('../lrunes/RunesClient'),{ssr:false,loading});
const GameView=dynamic(()=>import('../lrunes/game/GameView'),{ssr:false,loading});
const ManagementView=dynamic(()=>import('./GovernanceManagement'),{loading});

const VIEWS={
  game:GameView,
  statics:StatisticsV2,
  culture:CultureV2,
  search:SearchV2,
  governance:GovernanceV2,
  manage:ManagementView
};
const HOME_VIEWS={loc:AboutView,lrunes:RunesHomeView,lo3rwang:AuthorHomeView,admin:AdminHomeView};

export default function LocApp({forcedView='home',forcedSection=null,forcedScope=null}){
  const {scopeId}=useScopeRuntimeV2();
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
