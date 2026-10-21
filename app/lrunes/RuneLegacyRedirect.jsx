// Shared redirect stub for retired LunaRunes routes (old /card3d/*, /duel/*
// fixed-spread pages, and the /card/duel2 | /card/list2 trial pages), now
// consolidated under /card/duel|daily|list. Same safe-replace pattern as
// app/not-found.jsx: an inline <script> runs before React hydrates, so the
// redirect fires even with JS barely started, and a plain link is the
// no-JS fallback. One shared implementation -- every legacy page.jsx below
// just passes its own target path.
function redirectScript(target){
  return `(()=>{try{
    const url=new URL(${JSON.stringify(target)},window.location.origin);
    url.hash=window.location.hash;
    window.location.replace(url.pathname+url.search+url.hash);
  }catch{}})();`;
}

export default function RuneLegacyRedirect({target,label='前往新頁面'}){
  return <main className="loc-next-main">
    <script dangerouslySetInnerHTML={{__html:redirectScript(target)}}/>
    <section className="loc-view">
      <header className="loc-hero">
        <p className="loc-eyebrow">LunaRunes</p>
        <h1>頁面已搬家</h1>
        <p>正在前往新的頁面位置。</p>
        <a className="loc-button primary" href={target}>{label}</a>
      </header>
    </section>
  </main>;
}
