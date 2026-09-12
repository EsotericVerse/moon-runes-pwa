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

const VIEWS = {
  home: AboutView,
  about: AboutView,
  game: GameView,
  context: ContextView,
  statics: StaticsView,
  evolution: EvolutionView,
  search: SearchView,
  governance: GovernanceView
};

const NAV = [
  ['game', '遊戲'],
  ['context', '脈絡'],
  ['search', '搜尋'],
  ['statics', '統計'],
  ['evolution', '推演'],
  ['governance', '治理']
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
        <a className="loc-next-brand" href="/loc/">LOC 月典</a>
        <nav className="loc-next-nav" aria-label="LOC 功能導覽">
          {NAV.map(([id, label]) => (
            <a key={id} href={navHref(id)} aria-current={view === id ? 'page' : undefined}>{label}</a>
          ))}
          <a href="/runes.html">月之符文</a>
          <a href="https://whoami.lo3rwang.cc/">作者</a>
        </nav>
      </header>
      <main className="loc-next-main" data-loc-view={view}>
        <ActiveView />
      </main>
    </>
  );
}
