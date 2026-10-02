const LOC_HOME='https://loc.lo3rwang.cc/';

const REDIRECT_SCRIPT=`(()=>{try{
  const home=new URL('${LOC_HOME}');
  const current=new URL(window.location.href);
  const onHome=current.origin===home.origin&&(current.pathname==='/'||current.pathname==='');
  if(!onHome)window.location.replace(home.href);
}catch{}})();`;

export default function NotFound(){
  return <main className="loc-next-main">
    <script dangerouslySetInnerHTML={{__html:REDIRECT_SCRIPT}}/>
    <section className="loc-view">
      <header className="loc-hero">
        <p className="loc-eyebrow">LOC</p>
        <h1>返回月典首頁</h1>
        <p>此網址不存在，正在返回月典首頁。</p>
        <a className="loc-button primary" href={LOC_HOME}>回月典首頁</a>
      </header>
    </section>
  </main>;
}
