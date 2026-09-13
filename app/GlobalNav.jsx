export default function GlobalNav(){
  return <header className="loc-next-header loc-global-header">
    <div className="loc-next-nav-stack">
      <nav className="loc-next-nav loc-next-nav-primary" aria-label="LOC 主要導覽">
        <a href="/runes">月之符文</a>
        <a href="/game">遊戲</a>
        <a href="/context">脈絡</a>
        <a href="/statics">統計</a>
        <a href="/evolution">推演</a>
        <a href="/governance">治理</a>
        <a href="/my-style">設定</a>
        <a href="https://whoami.lo3rwang.cc/">我的個人首頁</a>
        <form className="loc-next-search" action="/search" method="get" role="search">
          <input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" />
          <button type="submit">搜尋</button>
        </form>
        <a className="loc-next-home" href="/">回月典首頁</a>
      </nav>
    </div>
  </header>;
}
