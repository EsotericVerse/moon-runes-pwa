(()=>{
  'use strict';
  if(window.__LOC_NAV__) return;
  window.__LOC_NAV__=true;

  const GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
  const NAV3_ALLOW=new Set(['runes:draw','runes:library']);
  const THEME_STORAGE_KEY='loc-theme';
  const THEME_MODES=new Set(['auto','day','night']);
  const DAY_START_HOUR=6;
  const NIGHT_START_HOUR=18;
  const fileName=()=>location.pathname.split('/').pop()||'index.html';
  const baseName=path=>String(path||'').split('/').pop()||'index.html';
  const DEFAULT_HASH=Object.freeze({'runes.html':'#draw','lo3rwang.html':'#author-intro','loc.html':'#home'});

  const NAV1=Object.freeze([
    {id:'runes',label:'月之符文',href:'runes.html#draw'},
    {id:'game',label:'遊戲',href:'loc.html#game'},
    {id:'context',label:'脈絡',href:'loc.html#context'},
    {id:'search',label:'搜尋',href:'loc.html#search'},
    {id:'statics',label:'統計',href:'loc.html#statics'},
    {id:'evolution',label:'推演',href:'loc.html#evolution'},
    {id:'governance',label:'治理',href:'loc.html#governance'}
  ]);
  const PAGE_GROUP=Object.freeze({'runes.html':'runes','lo3rwang.html':'author'});
  const AUTHOR_SECTIONS=Object.freeze([
    {label:'介紹',match:'他主要在做什麼',id:'author-intro'},
    {label:'主要身份',match:'主要身份',id:'author-identity'},
    {label:'工作與合作',match:'工作與合作方向',id:'author-work'},
    {label:'作者自述',match:'作者自述',id:'author-self'},
    {label:'LOC月典',match:'LOC／月典',id:'author-loc'}
  ]);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function getThemeMode(){
    try{const saved=localStorage.getItem(THEME_STORAGE_KEY);return THEME_MODES.has(saved)?saved:'auto';}catch{return 'auto';}
  }
  function resolveAutoTheme(now=new Date()){
    const hour=now.getHours();
    return hour>=DAY_START_HOUR&&hour<NIGHT_START_HOUR?'day':'night';
  }
  function syncThemeControl(){
    const select=document.querySelector('[data-loc-theme-select]');
    if(select) select.value=getThemeMode();
  }
  function applyTheme(mode=getThemeMode()){
    const safe=THEME_MODES.has(mode)?mode:'auto';
    const resolved=safe==='auto'?resolveAutoTheme():safe;
    document.documentElement.dataset.theme=safe;
    document.documentElement.dataset.themeResolved=resolved;
    document.documentElement.style.colorScheme=resolved==='day'?'light':'dark';
    syncThemeControl();
  }
  function setThemeMode(mode){
    if(!THEME_MODES.has(mode)) return;
    try{localStorage.setItem(THEME_STORAGE_KEY,mode);}catch{}
    applyTheme(mode);
  }
  function themeControlHtml(){
    return '<label class="loc-theme-control"><span>風格</span><select data-loc-theme-select aria-label="即時風格"><option value="auto">自動</option><option value="day">白天</option><option value="night">夜間</option></select></label>';
  }

  function currentRouteKey(){
    const hash=location.hash||DEFAULT_HASH[fileName()]||'#main';
    return `${location.pathname}${location.search}${hash}`;
  }
  function targetRouteKey(href){
    const url=new URL(href,location.href);
    const page=baseName(url.pathname);
    if(!url.hash) url.hash=DEFAULT_HASH[page]||'#main';
    return `${url.pathname}${url.search}${url.hash}`;
  }
  function renderNav1(){
    const current=PAGE_GROUP[fileName()]||'';
    const route=currentRouteKey();
    document.querySelectorAll('[data-loc-nav]').forEach(node=>{
      const links=NAV1.map(item=>item.id===current&&targetRouteKey(item.href)===route
        ? `<span class="loc-global-link loc-global-current" aria-current="page">${esc(item.label)}</span>`
        : `<a class="loc-global-link" href="${esc(item.href)}">${esc(item.label)}</a>`).join('');
      const search='<form class="loc-global-search" action="loc.html#search" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" /><button class="loc-global-search-submit" type="submit">搜尋</button></form>';
      const home='<a class="loc-global-home" href="loc.html#home">回月典首頁</a>';
      node.innerHTML=`<div class="loc-global-links">${links}</div>${search}${themeControlHtml()}${home}`;
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
  function tier(items,label,className='loc-nav-tier'){
    const nav=document.createElement('nav');
    nav.className=className;
    nav.dataset.tier=className==='loc-nav3'?'3':'2';
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
    nav.dataset.nav3=key;
    return nav;
  }
  function ensureAnchor(id,target){
    if(!id||document.getElementById(id)||!target) return;
    const anchor=document.createElement('span');
    anchor.id=id;
    anchor.className='loc-anchor-target';
    anchor.setAttribute('aria-hidden','true');
    target.prepend(anchor);
  }
  function ensureRunesAnchors(){
    if(fileName()!=='runes.html') return;
    ensureAnchor('draw',document.getElementById('drawView'));
    ensureAnchor('daily',document.getElementById('drawView'));
    ensureAnchor('library',document.getElementById('libraryView'));
    ensureAnchor('reference',document.getElementById('referenceView'));
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
  function buildRunes(host){
    host.appendChild(tier([
      link('新手上路','tutorial02.html'),
      link('占卜抽籤','runes.html#draw'),
      link('66 符資料','runes.html#library'),
      link('符文脈絡','runes.html#reference'),
      link('符文統計','loc.html#statics'),
      link('符文知識庫','runes.html#reference')
    ],'月之符文功能'));

    const drawView=document.getElementById('drawView');
    if(drawView&&!drawView.querySelector(':scope > .loc-nav3')){
      const menu=nav3('runes:draw',[
        link('單卡','runes.html?mode=single#draw'),
        link('每日','runes.html?mode=daily#daily'),
        link('雙卡','runes.html?mode=2card#draw'),
        link('三卡','runes.html?mode=3card#draw'),
        link('五卡','runes.html?mode=5card#draw'),
        link('11卡 OW3gs','runes.html?mode=ow3gs#draw'),
        link('說明','tutorial02.html')
      ],'抽牌快速選單');
      if(menu) drawView.appendChild(menu);
    }

    const libraryView=document.getElementById('libraryView');
    if(libraryView&&!libraryView.querySelector(':scope > .loc-nav3')){
      const menu=nav3('runes:library',GROUPS.map(group=>link(group,`runes.html?group=${encodeURIComponent(group)}#library`,{'data-rune-group-shortcut':group})),'符文群組快速選單');
      if(menu) libraryView.appendChild(menu);
    }
  }
  function buildAuthor(host){
    const headings=[...document.querySelectorAll('main article h2')];
    const items=AUTHOR_SECTIONS.map(item=>{
      const heading=headings.find(h=>h.textContent.trim().includes(item.match));
      if(!heading) return null;
      if(!heading.id) heading.id=item.id;
      return link(item.label,`#${heading.id}`);
    }).filter(Boolean);
    if(items.length) host.appendChild(tier(items,'作者頁'));
  }
  function buildTiers(){
    const host=getTierHost();
    if(!host) return;
    host.replaceChildren();
    if(fileName()==='runes.html') buildRunes(host);
    else if(fileName()==='lo3rwang.html') buildAuthor(host);
    if(!host.childElementCount) host.remove();
  }

  function resetCurrent(nav){
    nav.querySelectorAll('.loc-nav-tier-link').forEach(el=>{
      el.removeAttribute('aria-current');
      el.removeAttribute('aria-disabled');
      if(el.tagName==='A'&&el.dataset.originalHref) el.setAttribute('href',el.dataset.originalHref);
    });
  }
  function activateCurrent(el){
    if(!el) return;
    el.setAttribute('aria-current','true');
    el.setAttribute('aria-disabled','true');
    if(el.tagName==='A'){
      if(!el.dataset.originalHref) el.dataset.originalHref=el.getAttribute('href')||'';
      el.removeAttribute('href');
    }
  }
  function syncCurrent(){
    const nav=document.querySelector('.loc-nav-tier[data-tier="2"]');
    if(!nav) return;
    resetCurrent(nav);
    const wantedHash=location.hash||DEFAULT_HASH[fileName()]||'#main';
    nav.querySelectorAll('a.loc-nav-tier-link').forEach(a=>{
      const href=a.dataset.originalHref||a.getAttribute('href');
      if(!href) return;
      const url=new URL(href,location.href);
      if(baseName(url.pathname)===fileName()&&url.hash===wantedHash) activateCurrent(a);
    });
  }
  function normalizeInternalPageLinks(root=document){
    root.querySelectorAll?.('a[href]').forEach(a=>{
      const raw=a.getAttribute('href');
      if(!raw||raw.startsWith('#')||/^(?:mailto:|tel:|javascript:)/i.test(raw)) return;
      let url;try{url=new URL(raw,location.href);}catch{return;}
      if(url.origin!==location.origin||!/\.html$/i.test(url.pathname)||url.hash) return;
      const page=baseName(url.pathname);
      a.setAttribute('href',`${raw}${DEFAULT_HASH[page]||'#main'}`);
    });
  }
  function anchorOffset(){
    const global=document.querySelector('.loc-global-shell')?.getBoundingClientRect().height||0;
    const tiers=document.querySelector('.loc-nav-tiers')?.getBoundingClientRect().height||0;
    return global+tiers+16;
  }
  function alignCurrentHash(){
    if(!location.hash) return;
    const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if(!target) return;
    requestAnimationFrame(()=>{
      const top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-anchorOffset());
      window.scrollTo({top,behavior:'auto'});
    });
  }
  function loadEnhancements(){
    if(fileName()==='runes.html') appendScript('js/runes-pwa-ia.js','runes-pwa-ia');
  }

  document.addEventListener('change',event=>{
    const select=event.target.closest('[data-loc-theme-select]');
    if(select) setThemeMode(select.value);
  });
  applyTheme();
  window.setInterval(()=>{if(getThemeMode()==='auto') applyTheme('auto');},60000);
  window.addEventListener('storage',event=>{if(event.key===THEME_STORAGE_KEY) applyTheme();});
  window.addEventListener('hashchange',()=>{syncCurrent();alignCurrentHash();renderNav1();});
  window.addEventListener('DOMContentLoaded',()=>{
    ensureRunesAnchors();
    renderNav1();
    syncThemeControl();
    buildTiers();
    normalizeInternalPageLinks();
    syncCurrent();
    loadEnhancements();
    alignCurrentHash();
  });
})();