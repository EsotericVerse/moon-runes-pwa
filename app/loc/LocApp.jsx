'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import AboutView from './views/AboutView';

const loading=()=> <div className="loc-loading">載入功能模組…</div>;
const GameView = dynamic(() => import('./views/GameView'),{ssr:false,loading});
const ContextView = dynamic(() => import('./views/ContextView'),{ssr:false,loading});
const StaticsView = dynamic(() => import('./views/StaticsView'),{ssr:false,loading});
const EvolutionView = dynamic(() => import('./views/EvolutionView'),{ssr:false,loading});
const SearchView = dynamic(() => import('./views/SearchView'),{ssr:false,loading});
const GovernanceView = dynamic(() => import('./views/GovernanceView'),{ssr:false,loading});
const StyleGroupsView = dynamic(() => import('./views/StyleGroupsView'),{ssr:false,loading});
const ClassifyView = dynamic(() => import('./views/ClassifyView'),{ssr:false,loading});
const LibraryView = dynamic(() => import('./views/LibraryView'),{ssr:false,loading});
const MyStyleView = dynamic(() => import('./views/MyStyleView'),{ssr:false,loading});

const VIEWS = {
  home: AboutView,
  about: AboutView,
  game: GameView,
  context: ContextView,
  classify: ClassifyView,
  library: LibraryView,
  'my-style': MyStyleView,
  statics: StaticsView,
  evolution: EvolutionView,
  search: SearchView,
  governance: GovernanceView,
  'style-groups': StyleGroupsView
};

const PRIMARY_NAV = [
  ['game', '遊戲'],
  ['context', '脈絡'],
  ['statics', '統計'],
  ['evolution', '推演']
];

function readView() {
  if (typeof window === 'undefined') return 'home';
  const hash = decodeURIComponent(window.location.hash.slice(1)).split('/')[0];
  if (VIEWS[hash]) return hash;
  const route = window.location.pathname.split('/').filter(Boolean).at(-1) || '';
  return VIEWS[route] ? route : 'home';
}

function navHref(id){
  if(typeof window!=='undefined'&&window.location.pathname.startsWith('/loc'))return `#${id}`;
  return `/${id}`;
}

function NavLinks({items,view}){
  return items.map(([id,label])=><a key={id} href={navHref(id)} aria-current={view===id?'page':undefined}>{label}</a>);
}

export default function LocApp() {
  const [view, setView] = useState('home');

  useEffect(() => {
    const sync = () => setView(readView());
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {window.removeEventListener('hashchange', sync);window.removeEventListener('popstate', sync);};
  }, []);

  const ActiveView = useMemo(() => VIEWS[view] || AboutView, [view]);

  return (
    <>
      <header className="loc-next-header">
        <nav className="loc-next-nav loc-next-nav-primary" aria-label="LOC 主要導覽">
          <a href="/runes">月之符文</a>
          <NavLinks items={PRIMARY_NAV} view={view}/>
          <form className="loc-next-search" action="/search" method="get" role="search">
            <input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" />
            <button type="submit">搜尋</button>
          </form>
          <a className="loc-next-home" href="/loc/" aria-current={view==='home'?'page':undefined}>回月典首頁</a>
        </nav>
      </header>
      <main className="loc-next-main" data-loc-view={view}>
        <ActiveView />
      </main>
      <footer className="loc-next-footer">
        <a href="/governance">治理</a>
        <a href="https://whoami.lo3rwang.cc/">lo3rwang</a>
      </footer>
    </>
  );
}
