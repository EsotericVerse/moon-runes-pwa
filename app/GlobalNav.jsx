'use client';

import { usePathname } from 'next/navigation';

function SearchBox(){
  return <form className="loc-next-search" action="/search" method="get" role="search">
    <input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋" />
    <button type="submit">搜尋</button>
  </form>;
}

export default function GlobalNav(){
  const pathname=usePathname()||'/';
  const isRunes=pathname==='/runes'||pathname.startsWith('/runes/');
  const isWhoami=pathname.startsWith('/whoami');
  const isGovernance=pathname==='/governance'||pathname.startsWith('/governance/');

  const links=<>
    <a href="#">語彙</a>
    <a href="/context">脈絡</a>
    <a href="/statics">統計</a>
    <a href="/evolution">文化</a>
    <a href="/governance">治理</a>
    <SearchBox />
    <a href="https://whoami.lo3rwang.cc/">作者介紹</a>
    {isRunes && <a href="#">回月之符文首頁</a>}
    {isWhoami && <a href="#">回作者首頁</a>}
    {isGovernance && <a href="#">回治理首頁</a>}
    <a className="loc-next-home" href="/">回月典首頁</a>
  </>;

  return <header className="loc-next-header loc-global-header">
    <div className="loc-next-nav-stack">
      <nav className="loc-next-nav loc-next-nav-primary" aria-label="LOC 主要導覽">
        {links}
      </nav>
    </div>
  </header>;
}
