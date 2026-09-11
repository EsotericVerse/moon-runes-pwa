(() => {
  const GROUPS = ["靈魂", "連結", "生命", "自然", "礦物", "元素", "秩序", "無序", "特殊"];
  const NAV3_ALLOW = new Set(["lots:draw", "lots:library"]);
  const LEGACY_STATICS_RE = /(^|\/)statics\.htm(?:ll)?(?=([?#]|$))/;
  const fileName = () => location.pathname.split("/").pop() || "index.html";

  const NAV1 = Object.freeze([
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"game",label:"遊戲",href:"game.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"governance",label:"治理",href:"governance.html"},
    {id:"statics",label:"統計",href:"statics.html"},
    {id:"evolution",label:"推演",href:"evolution.html"}
  ]);

  const PAGE_GROUP = Object.freeze({
    "index.html":"home",
    "lots.html":"runes",
    "runes.html":"runes",
    "game.html":"game",
    "context.html":"context",
    "evolution.html":"evolution",
    "governance.html":"governance",
    "statics.html":"statics",
    "search.html":"search",
    "lo3rwang.html":"author"
  });

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function renderNav1(){
    const current=PAGE_GROUP[fileName()]||"";
    document.querySelectorAll('[data-loc-nav]').forEach(node=>{
      const links=NAV1.map(item=>item.id===current
        ? `<span class="loc-global-link loc-global-current" aria-current="page">${esc(item.label)}</span>`
        : `<a class="loc-global-link" href="${esc(item.href)}">${esc(item.label)}</a>`
      ).join('');
      const search=`<form class="loc-global-search" action="search.html" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" /><button class="loc-global-search-submit" type="submit">搜尋</button></form>`;
      const home=current==='home'?'':'<a class="loc-global-home" href="index.html">回月典首頁</a>';
      node.innerHTML=`<div class="loc-global-links">${links}</div>${search}${home}`;
    });
  }

  function appendScript(src,key){
    if(document.querySelector(`script[data-${key}]`)) return;
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='true';
    document.body.appendChild(script);
  }

  function link(label,href,attrs={}){
    const a=document.createElement('a');
    a.className='loc-nav-tier-link';
    a.href=href;
    a.textContent=label;
    Object.entries(attrs).forEach(([key,value])=>a.setAttribute(key,value));
    return a;
  }

  function button(label,attrs={}){
    const b=document.createElement('button');
    b.type='button';
    b.className='loc-nav-tier-link';
    b.textContent=label;
    Object.entries(attrs).forEach(([key,value])=>{
      if(key==='disabled') b.disabled=true;
      else b.setAttribute(key,value);
    });
    return b;
  }

  function tier(items,label,className='loc-nav-tier'){
    const nav=document.createElement('nav');
    nav.className=className;
    nav.setAttribute('aria-label',label);
    const inner=document.createElement('div');
    inner.className=className==='loc-nav3'?'loc-nav3-inner':'loc-nav-tier-inner';
    items.forEach(item=>inner.appendChild(item));
    nav.appendChild(inner);
    return nav;
  }

  function nav3(key,items,label){
    if(!NAV3_ALLOW.has(key)) return null;
    const nav=tier(items,label,'loc-nav3');
    nav.dataset.tier='3';
    nav.dataset.nav3=key;
    return nav;
  }

  function sectionHref(targetId,sectionId=targetId){
    const target=document.getElementById(targetId);
    if(!target) return `#${targetId}`;
    const section=target.matches('section,.section,[data-context-view],[data-view]')
      ? target
      : target.closest('section,.section,[data-context-view],[data-view]');
    if(!section || section===target) return `#${targetId}`;
    if(!section.id) section.id=sectionId;
    return `#${section.id}`;
  }

  function getTierHost(){
    let host=document.querySelector('.loc-nav-tiers');
    if(host) return host;
    const shell=document.querySelector('.loc-global-shell');
    if(!shell) return null;
    host=document.createElement('div');
    host.className='loc-nav-tiers';
    shell.after(host);
    return host;
  }

  function normalizeLegacyLinks(root=document){
    root.querySelectorAll('a[href]').forEach(a=>{
      const current=a.getAttribute('href')||'';
      let next=current.replace(LEGACY_STATICS_RE,'$1statics.html');
      next=next.replaceAll('loc2-game.html','game.html');
      if(next!==current){
        a.setAttribute('href',next);
        a.removeAttribute('target');
        a.removeAttribute('rel');
      }
    });
  }

  function buildIndex(host){
    const top=document.getElementById('top')||document.querySelector('main,.loc-page');
    if(top&&!top.id) top.id='top';
    host.appendChild(tier([
      link('LOC月典簡介',sectionHref('top')),
      link('新手上路',sectionHref('start-title','start')),
      link('LOC架構圖',sectionHref('framework-map')),
      link('目前進度',sectionHref('current-progress')),
      link('作者的話',sectionHref('about-title','about'))
    ],'首頁快速選單'));
  }

  function buildRunes(host){
    const beginnerHref=fileName()==='lots.html'?'lots.html#beginner':'runes.html#beginner';
    host.appendChild(tier([
      link('新手上路',beginnerHref),
      link('占卜抽籤','lots.html#draw'),
      link('符文總覽','lots.html#library'),
      link('符文統計','statics.html#runes'),
      link('符文知識庫','runes.html#reference')
    ],'月之符文功能'));

    if(fileName()!=='lots.html') return;
    const drawView=document.getElementById('drawView');
    if(drawView&&!drawView.querySelector(':scope > .loc-nav3')){
      const menu=nav3('lots:draw',[
        link('單卡','lots.html?mode=single#draw'),
        link('每日','lots.html?mode=daily#draw'),
        link('雙卡','lots.html?mode=2card#draw'),
        link('三卡','lots.html?mode=3card#draw'),
        link('五卡','lots.html?mode=5card#draw'),
        link('11卡 OW3gs','lots.html?mode=ow3gs#draw'),
        link('說明','lots.html#beginner')
      ],'抽牌快速選單');
      if(menu) drawView.appendChild(menu);
    }

    const libraryView=document.getElementById('libraryView');
    if(libraryView&&!libraryView.querySelector(':scope > .loc-nav3')){
      const menu=nav3('lots:library',GROUPS.map(group=>link(group,`lots.html?group=${encodeURIComponent(group)}#library`,{'data-rune-group-shortcut':group})),'符文群組快速選單');
      if(menu) libraryView.appendChild(menu);
    }
  }

  function buildTiers(){
    const host=getTierHost();
    if(!host) return;
    host.replaceChildren();
    const file=fileName();
    if(file==='index.html') buildIndex(host);
    else if(file==='runes.html'||file==='lots.html') buildRunes(host);
    else if(file==='context.html') host.appendChild(tier([
      button('關係圖 Graph',{'data-context-switch':'graph'}),
      button('節點 Nodes',{'data-context-switch':'nodes'}),
      button('關聯 Edges',{'data-context-switch':'relations'}),
      button('情境 Scenarios',{'data-context-switch':'scenario'})
    ],'脈絡功能'));
    else if(file==='evolution.html') host.appendChild(tier([
      button('時期 Period',{'data-view':'overview'}),
      button('時間線 Timeline',{'data-view':'timeline'}),
      button('趨勢 Trend',{'data-view':'trend'}),
      button('軌跡 Trajectory',{'data-view':'trajectory'})
    ],'推演功能'));
    else if(file==='statics.html') host.appendChild(tier([
      link('排行榜','statics.html#ranking'),
      link('符文統計','statics.html#runes'),
      link('來源管理','statics.html#sources'),
      link('匯入','statics.html#import')
    ],'統計功能'));
    else if(file==='governance.html') host.appendChild(tier([
      link('原則','governance.html#principles'),
      link('版權','governance.html#copyright'),
      link('理念','governance.html#philosophy'),
      link('文件','governance.html#documents')
    ],'治理內容'));
    else if(file==='lo3rwang.html') host.appendChild(tier([
      button('作者個人網頁介紹',{'aria-current':'true',disabled:''})
    ],'作者頁'));
    if(!host.childElementCount) host.remove();
  }

  function cleanupContextGameEmbed(){
    if(fileName()!=='context.html') return;
    const frame=document.querySelector('.game-frame');
    const view=frame?.closest('[data-context-view]');
    if(view) view.remove();
    else {
      document.querySelector('.game-frame-wrap')?.remove();
      document.querySelector('.game-open')?.remove();
    }
  }

  function loadEnhancements(){
    const file=fileName();
    if(file==='runes.html'||file==='lots.html') appendScript('js/runes-pwa-ia.js','runes-pwa-ia');
    if(file==='evolution.html') appendScript('js/life-daily-draw-history.js','life-draw-history');
  }

  window.addEventListener('DOMContentLoaded',()=>{
    renderNav1();
    normalizeLegacyLinks(document);
    cleanupContextGameEmbed();
    buildTiers();
    loadEnhancements();
  });
})();
