(() => {
  const WEB_BUILD = "1.4";
  const currentFile = location.pathname.split("/").pop() || "index.html";

  if (currentFile === "runes.html") {
    const params = new URLSearchParams(location.search);
    if (params.has("mode")) {
      const target = new URL("lots.html", location.href);
      target.search = location.search;
      target.hash = "draw";
      location.replace(target.href);
      return;
    }
    if (location.hash === "#draw") { location.replace("lots.html#draw"); return; }
    if (location.hash === "#library") { location.replace("lots.html#library"); return; }
    if (location.hash === "#daily") { location.replace("statics.html#rune-trend"); return; }
  }
  if (currentFile === "search.html") {
    const routes = {"#ranking":"ranking","#rankingView":"ranking","#sources":"sources","#era":"period"};
    if (routes[location.hash]) {
      const target = routes[location.hash] === 'period' ? 'evolution.html#period' : 'statics.html#' + routes[location.hash];
      location.replace(target);
      return;
    }
  }

  const GLOBAL_ITEMS = [
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"game",label:"遊戲",href:"game.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"evolution",label:"推演",href:"evolution.html"},
    {id:"statics",label:"統計",href:"statics.html"}
  ];

  const RUNE_NAV = `
    <div class="workspace-nav-group"><a class="workspace-link" href="tutorial01.html"><strong>新手上路</strong><small>月之符文入門</small></a></div>
    <div class="workspace-nav-group"><a class="workspace-link" href="lots.html#draw"><strong>占卜抽籤</strong><small>線上即時抽牌引擎</small></a></div>
    <div class="workspace-nav-group"><a class="workspace-link" href="lots.html#library"><strong>符文總覽</strong><small>66 符 · 群組 · 固定資料</small></a></div>
    <div class="workspace-nav-group"><a class="workspace-link" href="statics.html#rune-trend"><strong>符文統計</strong><small>每日符文 · 紀錄 · 趨勢</small></a></div>
    <div class="workspace-nav-group"><a class="workspace-link" href="runes.html#rag"><strong>符文知識庫</strong><small>RAG · 占卜解析 · 符文演算法</small></a></div>`;

  const CONTEXT_NAV = `
    <div class="workspace-nav-group"><button class="workspace-switch active" type="button" data-context-target="graph"><strong>關係圖</strong><small>Graph</small></button></div>
    <div class="workspace-nav-group"><button class="workspace-switch" type="button" data-context-target="nodes"><strong>節點</strong><small>Node</small></button></div>
    <div class="workspace-nav-group"><button class="workspace-switch" type="button" data-context-target="relations"><strong>關聯</strong><small>Relation</small></button></div>
    <div class="workspace-nav-group"><button class="workspace-switch" type="button" data-context-target="scenarios"><strong>情境</strong><small>Scenario</small></button></div>`;

  function activeId(node){
    const explicit=node?.dataset?.page;
    if(explicit==='game')return currentFile==='context.html'?'context':'game';
    if(explicit)return explicit;
    if(currentFile==='game.html'||currentFile==='loc2-game.html')return 'game';
    if(currentFile==='context.html')return 'context';
    if(currentFile==='statics.html')return location.hash==='#rune-trend'?'runes':'statics';
    if(currentFile==='evolution.html')return 'evolution';
    if(currentFile==='runes.html'||currentFile==='lots.html')return 'runes';
    return '';
  }

  function navMarkup(active=''){
    return `${GLOBAL_ITEMS.map(item=>`<a class="loc-global-link" href="${item.href}"${item.id===active?' aria-current="page"':''}>${item.label}</a>`).join('')}
      <form class="loc-global-search" action="search.html" method="get" role="search">
        <label class="sr-only" for="loc-global-search-input">搜尋</label>
        <input id="loc-global-search-input" name="q" type="search" placeholder="搜尋" autocomplete="off" aria-label="搜尋">
        <button type="submit">搜尋</button>
      </form>`;
  }

  function ensureNavStyle(){
    if(document.getElementById('loc-nav-v1-style'))return;
    const s=document.createElement('style');
    s.id='loc-nav-v1-style';
    s.textContent=`
      .loc-global-links,.nav-links{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
      .loc-global-search{display:flex;align-items:center;gap:6px;margin:0}
      .loc-global-search input{width:clamp(120px,18vw,220px);min-height:34px;padding:6px 10px;border:1px solid rgba(180,158,255,.22);border-radius:999px;background:rgba(8,22,40,.72);color:inherit;font:inherit;font-size:.8rem}
      .loc-global-search button{min-height:34px;padding:6px 10px;border:1px solid rgba(180,158,255,.22);border-radius:999px;background:rgba(180,158,255,.08);color:inherit;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
      .statics-placeholder{opacity:.45;pointer-events:none}
      @media(max-width:720px){.loc-global-search{width:100%}.loc-global-search input{flex:1;width:auto;min-width:0}}
    `;
    document.head.appendChild(s);
  }

  function paintGlobalNav(node){const active=activeId(node);node.innerHTML=`<a class="loc-global-brand" href="index.html" aria-label="回到 LOC月典首頁">LOC月典</a><div class="loc-global-links">${navMarkup(active)}</div>`;}

  function paintHomeTopbar(){
    if(currentFile!=='index.html')return;
    const nav=document.querySelector('.topbar .nav-links'); if(nav)nav.innerHTML=navMarkup('');
    const topbar=document.querySelector('.topbar');
    if(topbar&&!document.querySelector('.home-section-nav')){
      const sub=document.createElement('nav');
      sub.className='home-section-nav';
      sub.setAttribute('aria-label','首頁快速選單');
      sub.innerHTML=`<a href="#home-intro">LOC月典簡介</a><a href="#start-title">新手上路</a><a href="#framework-map">LOC架構圖</a><a href="#home-progress">目前進度</a><a href="#home-other">其他</a>`;
      topbar.after(sub);
    }
    const hero=document.querySelector('header.hero'); if(hero&&!hero.id)hero.id='home-intro';
  }

  const FRAMEWORK_LABELS={LOC1:'月之符文模組',LOC2:'脈絡',LOC3:'音樂',LOC4:'文字創作',LOC5:'多媒體',LOC6:'演算法',LOC7:'演算模組',LOC8:'推演引擎'};
  function patchFrameworkNav(){
    if(currentFile!=='index.html')return;
    const tabs=document.querySelector('.framework-tabs');
    if(tabs){tabs.classList.add('loc-tertiary-nav');tabs.setAttribute('aria-label','LOC 架構模組');}
    document.querySelectorAll('.framework-tab').forEach(btn=>{const key=btn.dataset.locKey;if(FRAMEWORK_LABELS[key])btn.textContent=FRAMEWORK_LABELS[key];});
  }

  function pruneSearchWorkspace(){
    if(currentFile!=="search.html")return;
    ['eraView','rankingView','sourcesView'].forEach(id=>document.getElementById(id)?.remove());
    document.querySelector('.workspace-sidebar')?.remove();
    const shell=document.querySelector('.app-shell'); if(shell){shell.style.gridTemplateColumns='minmax(0,1fr)';shell.style.maxWidth='1180px';}
    const main=document.querySelector('.workspace-main'); if(main){main.style.width='100%';main.style.maxWidth='1120px';main.style.margin='0 auto';}
  }

  function patchRuneNav(){if(!['runes.html','lots.html'].includes(currentFile))return;const nav=document.querySelector('.workspace-sidebar .workspace-nav');if(nav)nav.innerHTML=RUNE_NAV;}

  function patchContextNav(){
    if(currentFile!=='context.html')return;
    const nav=document.querySelector('.workspace-sidebar .workspace-nav'); if(!nav)return; nav.innerHTML=CONTEXT_NAV;
    nav.querySelectorAll('[data-context-target]').forEach(btn=>btn.addEventListener('click',()=>{const target=btn.dataset.contextTarget;document.querySelectorAll('[data-context-view]').forEach(section=>section.hidden=section.dataset.contextView!==target);nav.querySelectorAll('[data-context-target]').forEach(x=>x.classList.toggle('active',x===btn));history.replaceState(null,'','context.html#'+target);}));
    const hash=location.hash.replace('#','');const initial=['graph','nodes','relations','scenarios'].includes(hash)?hash:'graph';nav.querySelector(`[data-context-target="${initial}"]`)?.click();
  }

  function promoteSecondaryNav(){
    if(currentFile==='index.html'||currentFile==='search.html'||currentFile==='game.html'||currentFile==='loc2-game.html')return;
    const source=document.querySelector('.workspace-sidebar .workspace-nav,.sidebar .nav');
    if(!source||document.querySelector('.loc-secondary-shell'))return;
    const shell=document.createElement('div');
    shell.className='loc-secondary-shell';
    source.classList.add('loc-secondary-nav');
    source.setAttribute('aria-label',source.getAttribute('aria-label')||'第二層導覽');
    shell.appendChild(source);
    const global=document.querySelector('.loc-global-shell');
    if(global)global.after(shell); else document.body.prepend(shell);
  }

  function lotsThirdNav(){
    if(currentFile!=='lots.html')return;
    const params=new URLSearchParams(location.search);
    const group=params.get('group')||'';
    const isLibrary=location.hash==='#library'||!!group;
    const shell=document.createElement('div');
    shell.className='loc-tertiary-shell';
    const nav=document.createElement('nav');
    nav.className='loc-tertiary-nav';
    nav.setAttribute('aria-label',isLibrary?'符文群組':'抽牌模式');
    if(isLibrary){
      const groups=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
      nav.innerHTML=groups.map(name=>`<a href="lots.html?group=${encodeURIComponent(name)}#library"${name===group?' aria-current="page"':''}>${name}</a>`).join('');
      window.addEventListener('load',()=>{
        if(!group)return;
        document.querySelectorAll('.rune-group').forEach(card=>{
          const title=card.querySelector('.group-head strong')?.textContent?.trim()||'';
          card.hidden=!title.includes(group);
        });
        document.getElementById('library')?.scrollIntoView({block:'start'});
      },{once:true});
    }else{
      const mode=params.get('mode')||'';
      const modes=[['single','單卡'],['daily','每日'],['2card','雙卡'],['3card','三卡'],['5card','五卡'],['11card','11卡']];
      nav.innerHTML=modes.map(([key,label])=>`<a href="lots.html?mode=${key}#draw"${mode===key?' aria-current="page"':''}>${label}</a>`).join('')+`<a href="lots.html#examples">說明</a>`;
    }
    shell.appendChild(nav);
    const second=document.querySelector('.loc-secondary-shell');
    if(second)second.after(shell); else document.querySelector('.loc-global-shell')?.after(shell);
  }

  window.addEventListener('DOMContentLoaded',()=>{
    ensureNavStyle();
    document.querySelectorAll('[data-loc-nav]').forEach(paintGlobalNav);
    paintHomeTopbar();
    pruneSearchWorkspace();
    patchRuneNav();
    patchContextNav();
    promoteSecondaryNav();
    lotsThirdNav();
    setTimeout(patchFrameworkNav,0);
  });
})();