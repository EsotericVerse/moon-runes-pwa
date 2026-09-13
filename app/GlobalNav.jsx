'use client';

import { usePathname } from 'next/navigation';

function SearchBox(){
  return <form className="loc-next-search" action="/search" method="get" role="search">
    <input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" />
    <button type="submit">搜尋</button>
  </form>;
}

export default function GlobalNav(){
  const pathname=usePathname()||'/';
  const isRunes=pathname==='/runes'||pathname.startsWith('/runes/');

  return <header className="loc-next-header loc-global-header">
    <div className="loc-next-nav-stack">
      <nav className="loc-next-nav loc-next-nav-primary" aria-label={isRunes?'月之符文主要導覽':'LOC 主要導覽'}>
        {isRunes?<>
          <a href="/">月典</a>
          <a href="/game">符文遊戲</a>
          <a href="/context">符文脈絡</a>
          <a href="/statics">符文統計</a>
          <a href="/evolution">符文文化</a>
          <SearchBox />
          <a className="loc-next-home" href="/runes">回符文首頁</a>
        </>:<>
          <a href="/runes">月之符文</a>
          <a href="/context">脈絡</a>
          <a href="/statics">統計</a>
          <a href="/evolution">文化</a>
          <a href="/my-style">設定</a>
          <SearchBox />
          <a className="loc-next-home" href="/">回月典首頁</a>
        </>}
      </nav>
    </div>
  </header>;
}
