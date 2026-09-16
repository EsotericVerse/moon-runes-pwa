'use client';

import { usePathname } from 'next/navigation';

function SearchBox({action='/search'}){
  return <form className="loc-next-search" action={action} method="get" role="search">
    <input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋" />
    <button type="submit">搜尋</button>
  </form>;
}

export default function GlobalNav(){
  const pathname=usePathname()||'/';
  const isRunes=pathname==='/runes'||pathname.startsWith('/runes/');
  const runeRoute=route=>`/runes${route}`;

  const links=isRunes ? <>
    <a href="/runes">語彙</a>
    <a href={runeRoute('/context')}>脈絡</a>
    <a href={runeRoute('/statics')}>統計</a>
    <a href={runeRoute('/evolution')}>文化</a>
    <a href={runeRoute('/governance')}>治理</a>
    <SearchBox action={runeRoute('/search')} />
    <a href="https://whoami.lo3rwang.cc">作者頁面</a>
    <a className="loc-next-home" href="/runes">回月之符文首頁</a>
    <a className="loc-next-home" href="/">回月典首頁</a>
  </> : <>
    <a href="/runes">月之符文</a>
    <a href="/context">脈絡</a>
    <a href="/statics">統計</a>
    <a href="/evolution">文化</a>
    <a href="/governance">治理</a>
    <SearchBox />
    <a href="https://whoami.lo3rwang.cc">作者頁面</a>
    <a className="loc-next-home" href="/">回月典首頁</a>
  </>;

  return <header className="loc-next-header loc-global-header">
    <div className="loc-next-nav-stack">
      <nav className="loc-next-nav loc-next-nav-primary" aria-label={isRunes?'月之符文主要導覽':'LOC 主要導覽'}>
        {links}
      </nav>
    </div>
  </header>;
}
