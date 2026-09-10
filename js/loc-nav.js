(() => {
  const WEB_BUILD = "1.0";
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
    const routes = {"#ranking":"ranking","#rankingView":"ranking","#era":"era","#sources":"sources"};
    if (routes[location.hash]) {
      location.replace("statics.html#" + routes[location.hash]);
      return;
    }
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  const GLOBAL_ITEMS = [
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"evolution",label:"推演",href:"evolution.html"},
    {id:"statics",label:"統計",href:"statics.html"}
  ];

  function activeId(node){
    const explicit=node?.dataset?.page;
    if(explicit==='game')return 'context';
    if(explicit)return explicit;
    if(currentFile==='context.html'||currentFile==='loc2-game.html'||currentFile==='game.html')return 'context';
    if(currentFile==='statics.html')return 'statics';
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
      .home-section-nav{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:10px 0;border-bottom:1px solid rgba(180,158,255,.15)}
      .home-section-nav a{padding:5px 9px;border-radius:999px;color:var(--loc-muted,#b9bfd0);text-decoration:none;font-size:.78rem}
      .home-section-nav a:hover{color:var(--loc-text,#f5f1ff);background:rgba(180,158,255,.08)}
      .statics-placeholder{opacity:.45;pointer-events:none}
      @media(max-width:720px){.loc-global-search{width:100%}.loc-global-search input{flex:1;width:auto;min-width:0}}
    `;
    document.head.appendChild(s);
  }

  function paintGlobalNav(node){
    const active=activeId(node);
    node.innerHTML=`<a class="loc-global-brand" href="index.html" aria-label="回到 LOC月典首頁">LOC月典</a><div class="loc-global-links">${navMarkup(active)}</div>`;
  }

  function paintHomeTopbar(){
    if(currentFile!=='index.html')return;
    const nav=document.querySelector('.topbar .nav-links');
    if(nav)nav.innerHTML=navMarkup('');

    const topbar=document.querySelector('.topbar');
    if(topbar&&!document.querySelector('.home-section-nav')){
      const sub=document.createElement('nav');
      sub.className='home-section-nav';
      sub.setAttribute('aria-label','首頁功能導覽');
      sub.innerHTML=`
        <a href="#home-intro">LOC月典簡介</a>
        <a href="#start-title">新手上路</a>
        <a href="#framework-map">LOC架構圖</a>
        <a href="#home-progress">目前進度</a>
        <a href="statics.html">統計</a>
        <a href="#home-other">其他</a>`;
      topbar.after(sub);
    }

    const hero=document.querySelector('header.hero');
    if(hero&&!hero.id)hero.id='home-intro';
    [...document.querySelectorAll('section')].forEach(section=>{
      const text=section.querySelector('h2')?.textContent?.trim()||'';
      if(!document.getElementById('home-progress')&&(text.includes('目前進度')||text.includes('進度')))section.id='home-progress';
      if(!document.getElementById('home-other')&&(text.includes('其他')||text.includes('關於')))section.id='home-other';
    });
    if(!document.getElementById('home-progress')){
      const candidates=[...document.querySelectorAll('section')];
      const match=candidates.find(s=>/已完成|進度|目前/.test(s.textContent||''));
      if(match)match.id='home-progress';
    }
    if(!document.getElementById('home-other')){
      const sections=[...document.querySelectorAll('section')];
      if(sections.length)sections[sections.length-1].id='home-other';
    }
  }

  const FRAMEWORK_LABELS={
    LOC1:'月之符文模組',LOC2:'脈絡',LOC3:'音樂',LOC4:'文字創作',LOC5:'多媒體',LOC6:'演算法',LOC7:'演算模組',LOC8:'推演引擎'
  };
  function patchFrameworkDetail(key){
    const label=FRAMEWORK_LABELS[key];
    if(!label)return;
    const modal=document.querySelector('.framework-modal');
    const title=modal?.querySelector('.framework-detail h3');
    const kicker=modal?.querySelector('.framework-detail .kicker');
    if(title)title.textContent=label;
    if(kicker)kicker.textContent=`${key} · ${label}`;
  }
  function patchFrameworkNav(){
    if(currentFile!=='index.html')return;
    document.querySelectorAll('.framework-tab').forEach(btn=>{
      const key=btn.dataset.locKey;
      if(FRAMEWORK_LABELS[key])btn.textContent=FRAMEWORK_LABELS[key];
      btn.addEventListener('click',()=>setTimeout(()=>patchFrameworkDetail(key),0));
    });
    document.querySelectorAll('[data-loc-open]').forEach(btn=>{
      const key=btn.dataset.locOpen;
      if(FRAMEWORK_LABELS[key]){
        const label=btn.querySelector('.text-title,strong')||btn;
        if(label&&label!==btn)label.textContent=FRAMEWORK_LABELS[key];
      }
      btn.addEventListener('click',()=>setTimeout(()=>patchFrameworkDetail(key),0));
    });
  }

  function pruneSearchWorkspace(){
    if(currentFile!=="search.html")return;
    ['eraView','rankingView','sourcesView'].forEach(id=>document.getElementById(id)?.remove());
    const sidebar=document.querySelector('.workspace-sidebar');
    sidebar?.remove();
    const shell=document.querySelector('.app-shell');
    if(shell){shell.style.gridTemplateColumns='minmax(0,1fr)';shell.style.maxWidth='1180px';}
    const main=document.querySelector('.workspace-main');
    if(main){main.style.width='100%';main.style.maxWidth='1120px';main.style.margin='0 auto';}
  }

  function renderBuildLabel() {
    if(currentFile==='search.html')return;
    document.querySelectorAll(".workspace-sidebar,.sidebar").forEach(sidebar => {
      if (sidebar.querySelector("[data-web-build]")) return;
      const label = document.createElement("div");
      label.dataset.webBuild = "true";
      label.textContent = "Web Build " + WEB_BUILD;
      label.style.marginTop = "14px";
      label.style.paddingTop = "10px";
      label.style.borderTop = "1px solid rgba(127,135,148,.18)";
      label.style.fontSize = "11px";
      label.style.letterSpacing = ".08em";
      label.style.opacity = ".58";
      label.style.textAlign = "center";
      sidebar.appendChild(label);
    });
  }

  function loadPageEnhancements() {
    if (currentFile === "search.html" && !document.querySelector('script[data-km-concepts-search]')) {
      const script = document.createElement('script');
      script.src = 'js/km-concepts-search.js';
      script.defer = true;
      script.dataset.kmConceptsSearch = 'true';
      document.body.appendChild(script);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    ensureNavStyle();
    document.querySelectorAll("[data-loc-nav]").forEach(paintGlobalNav);
    paintHomeTopbar();
    pruneSearchWorkspace();
    renderBuildLabel();
    loadPageEnhancements();
    setTimeout(patchFrameworkNav,0);
  });
})();