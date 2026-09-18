'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import AboutView from './views/AboutView';

const loading=()=> <div className="loc-loading">載入功能模組…</div>;
const GameView = dynamic(() => import('./views/GameView'),{ssr:false,loading});
const ContextView = dynamic(() => import('./views/ContextView'),{ssr:false,loading});
const StaticsView = dynamic(() => import('./views/StaticsView'),{ssr:false,loading});
const CultureView = dynamic(() => import('./views/CultureView'),{ssr:false,loading});
const SearchView = dynamic(() => import('./views/SearchView'),{ssr:false,loading});
const GovernanceView = dynamic(() => import('./views/GovernanceView'),{ssr:false,loading});
const StyleGroupsView = dynamic(() => import('./views/StyleGroupsView'),{ssr:false,loading});
const ClassifyView = dynamic(() => import('./views/ClassifyView'),{ssr:false,loading});
const LibraryView = dynamic(() => import('./views/LibraryView'),{ssr:false,loading});
const MyStyleView = dynamic(() => import('./views/MyStyleView'),{ssr:false,loading});
const MediaView = dynamic(() => import('./views/MediaView'),{ssr:false,loading});

const VIEWS = {
  home: AboutView,
  about: AboutView,
  game: GameView,
  context: ContextView,
  classify: ClassifyView,
  library: LibraryView,
  multimedia: MediaView,
  'my-style': MyStyleView,
  statics: StaticsView,
  culture: CultureView,
  search: SearchView,
  governance: GovernanceView,
  'style-groups': StyleGroupsView
};

function readView() {
  if (typeof window === 'undefined') return 'home';
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const route = pathname.split('/').filter(Boolean).at(-1) || 'home';
  return VIEWS[route] ? route : 'home';
}

export default function LocApp() {
  const [view, setView] = useState('home');

  useEffect(() => {
    const sync = () => setView(readView());
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const ActiveView = useMemo(() => VIEWS[view] || AboutView, [view]);

  return <main className="loc-next-main" data-loc-view={view}>
    <ActiveView />
  </main>;
}
