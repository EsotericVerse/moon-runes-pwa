'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

const AboutView = dynamic(() => import('./views/AboutView'));
const GameView = dynamic(() => import('./views/GameView'));
const ContextView = dynamic(() => import('./views/ContextView'));
const StaticsView = dynamic(() => import('./views/StaticsView'));
const EvolutionView = dynamic(() => import('./views/EvolutionView'));
const SearchView = dynamic(() => import('./views/SearchView'));
const GovernanceView = dynamic(() => import('./views/GovernanceView'));

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
  ['home', '月典'],
  ['game', '遊戲'],
  ['context', '脈絡'],
  ['search', '搜尋'],
  ['statics', '統計'],
  ['evolution', '推演'],
  ['governance', '治理']
];

function readView() {
  if (typeof window === 'undefined') return 'home';
  const raw = decodeURIComponent(window.location.hash.slice(1)).split('/')[0];
  return VIEWS[raw] ? raw : 'home';
}

export default function LocApp() {
  const [view, setView] = useState('home');

  useEffect(() => {
    const sync = () => setView(readView());
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const ActiveView = useMemo(() => VIEWS[view] || AboutView, [view]);

  return (
    <>
      <header className="loc-next-header">
        <a className="loc-next-brand" href="#home">LOC 月典</a>
        <nav className="loc-next-nav" aria-label="LOC 功能導覽">
          <a href="/runes.html">月之符文</a>
          {NAV.slice(1).map(([id, label]) => (
            <a key={id} href={`#${id}`} aria-current={view === id ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
      </header>
      <main className="loc-next-main" data-loc-view={view}>
        <ActiveView />
      </main>
    </>
  );
}
