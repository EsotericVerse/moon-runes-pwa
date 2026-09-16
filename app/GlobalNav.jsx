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

  const links=isRunes ? <>
    <a href="/runes#draw">抽牌</a>
    <a href="/runes/list">符文圖鑑</a>
    <a href="/game">遊戲</a>
    <a href="/context">符文脈絡</a>
    <a href="/statics">符文統計</a>
    <a href="/evolution">符文文化</a>
    <a href="/runes/history">抽籤紀錄</a>
    <a href="/runes/governance">符文治理</a>
    <SearchBox />
    <a className="loc-next-home" href="/">回月典首頁</a>
  </> : <>
    <a href="/runes">月之符文</a>
    <a href="/context">脈絡</a>
    <a href="/statics">統計</a>
    <a href="/evolution">文化</a>
    <a href="/governance">治理</a>
    <a href="/my-style">設定</a>
    <SearchBox />
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
