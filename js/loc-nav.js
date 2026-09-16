(()=>{
  'use strict';
  if(window.__LOC_NAV__) return;
  window.__LOC_NAV__=true;

  const GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
  const LOCAL_MENU_ALLOW=new Set(['runes:draw','runes:library']);
  const THEME_STORAGE_KEY='loc-theme';
  const THEME_MODES=new Set(['auto','day','night']);
  const DAY_START_HOUR=6;
  const NIGHT_START_HOUR=18;
  const fileName=()=>location.pathname.split('/').pop()||'index.html';
  const baseName=path=>String(path||'').split('/').pop()||'index.html';
  const DEFAULT_HASH=Object.freeze({'runes.html':'#draw','lo3rwang.html':'#author-intro','loc.html':'#home'});
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function scope(){
    const host=location.hostname;
    const path=location.pathname;
    if(host==='lrunes.lo3rwang.cc'||path==='/runes'||path.startsWith('/runes/')||fileName()==='runes.html') return 'runes';
    if(host==='whoami.lo3rwang.cc'||fileName()==='lo3rwang.html') return 'author';
    if(host==='manage.lo3rwang.cc'||path==='/management'||path.startsWith('/management/')) return 'governance';
    return 'loc';
  }
  function scopedRoute(route){
    const current=scope();
    if(current==='runes') return location.hostname==='lrunes.lo3rwang.cc'?route:`/runes${route}`;
    if(current==='author') return route;
    if(current==='governance') return route;
    return route;
  }
  function navItems(){
    const current=scope();
    if(current==='runes') return [
      {label:'語彙',href:location.hostname==='lrunes.lo3rwang.cc'?'/':'/runes'},
      {label:'脈絡',href:scopedRoute('/context')},{label:'統計',href:scopedRoute('/statics')},{label:'文化',href:scopedRoute('/evolution')},{label:'治理',href:scopedRoute('/governance')},
      {label:'作者頁面',href:'https://whoami.lo3rwang.cc'},
      {label:'回月之符文首頁',href:location.hostname==='lrunes.lo3rwang.cc'?'/':'/runes',home:true},{label:'回月典首頁',href:'https://loc.lo3rwang.cc',home:true}
    ];
    if(current==='author') return [
      {label:'風格詞',href:'/'},{label:'脈絡',href:'/context'},{label:'統計',href:'/statics'},{label:'文化',href:'/evolution'},{label:'治理',href:'/governance'},
      {label:'管理者頁面',href:'https://manage.lo3rwang.cc'},
      {label:'回作者頁面',href:'/',home:true},{label:'回月典首頁',href:'https://loc.lo3rwang.cc',home:true}
    ];
    if(current==='governance') return [
      {label:'治理規則',href:'/'},{label:'脈絡',href:'/context'},{label:'統計',href:'/statics'},{label:'文化',href:'/evolution'},{label:'治理',href:'/governance'},
      {label:'管理者頁面',href:'https://manage.lo3rwang.cc'},
      {label:'回治理頁面',href:'/',home:true},{label:'回月典首頁',href:'https://loc.lo3rwang.cc',home:true}
    ];
    return [
      {label:'月之符文',href:'/runes'},{label:'脈絡',href:'/context'},{label:'統計',href:'/statics'},{label:'文化',href:'/evolution'},{label:'治理',href:'/governance'},
      {label:'作者頁面',href:'https://whoami.lo3rwang.cc'},{label:'回月典首頁',href:'/',home:true}
    ];
  }
  function renderNav(){
    const items=navItems();
    document.querySelectorAll('[data-loc-nav]').forEach(node=>{
      const searchAction=scopedRoute('/search');
      const main=items.filter(item=>!item.home).map(item=>`<a class="loc-global-link" href="${esc(item.href)}">${esc(item.label)}</a>`).join('');
      const homes=items.filter(item=>item.home).map(item=>`<a class="loc-global-home" href="${esc(item.href)}">${esc(item.label)}</a>`).join('');
      const search=`<form class="loc-global-search" action="${esc(searchAction)}" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" /><button class="loc-global-search-submit" type="submit">搜尋</button></form>`;
      node.innerHTML=`<div class="loc-global-links">${main}</div>${search}${homes}`;
    });
  }

  function getThemeMode(){try{const saved=localStorage.getItem(THEME_STORAGE_KEY);return THEME_MODES.has(saved)?saved:'auto';}catch{return 'auto';}}
  function resolveAutoTheme(now=new Date()){const hour=now.getHours();return hour>=DAY_START_HOUR&&hour<NIGHT_START_HOUR?'day':'night';}
  function syncThemeControl(){const select=document.querySelector('[data-loc-theme-select]');if(select)select.value=getThemeMode();}
  function applyTheme(mode=getThemeMode()){const safe=THEME_MODES.has(mode)?mode:'auto';const resolved=safe==='auto'?resolveAutoTheme():safe;document.documentElement.dataset.theme=safe;document.documentElement.dataset.themeResolved=resolved;document.documentElement.style.colorScheme=resolved==='day'?'light':'dark';syncThemeControl();}
  function setThemeMode(mode){if(!THEME_MODES.has(mode))return;try{localStorage.setItem(THEME_STORAGE_KEY,mode);}catch{}applyTheme(mode);}
  function appendScript(src,key){if(document.querySelector(`script[data-${key}]`))return;const script=document.createElement('script');script.src=src;script.defer=true;script.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='true';document.body.appendChild(script);}
  function link(label,href,attrs={}){const a=document.createElement('a');a.className='loc-nav-tier-link';a.href=href;a.textContent=label;Object.entries(attrs).forEach(([key,value])=>a.setAttribute(key,value));return a;}
  function tier(items,label,className='loc-nav-tier'){const nav=document.createElement('nav');nav.className=className;nav.dataset.localMenu=className==='loc-quick-menu'?'quick':'section';nav.setAttribute('aria-label',label);const inner=document.createElement('div');inner.className=className==='loc-quick-menu'?'loc-quick-menu-inner':'loc-nav-tier-inner';items.forEach(item=>inner.appendChild(item));nav.appendChild(inner);return nav;}
  function quickMenu(key,items,label){if(!LOCAL_MENU_ALLOW.has(key))return null;const nav=tier(items,label,'loc-quick-menu');nav.dataset.quickMenu=key;return nav;}
  function ensureAnchor(id,target){if(!id||document.getElementById(id)||!target)return;const anchor=document.createElement('span');anchor.id=id;anchor.className='loc-anchor-target';anchor.setAttribute('aria-hidden','true');target.prepend(anchor);}
  function ensureRunesAnchors(){if(scope()!=='runes')return;ensureAnchor('draw',document.getElementById('drawView'));ensureAnchor('library',document.getElementById('libraryView'));}
  function getTierHost(){let host=document.querySelector('.loc-nav-tiers');if(host)return host;const shell=document.querySelector('.loc-global-shell');if(!shell)return null;host=document.createElement('div');host.className='loc-nav-tiers';shell.after(host);return host;}
  function buildRunes(host){
    const drawView=document.getElementById('drawView');if(drawView&&!drawView.querySelector(':scope > .loc-quick-menu')){const menu=quickMenu('runes:draw',[link('單卡','#draw'),link('每日','#draw'),link('雙卡','#draw'),link('三卡','#draw'),link('五卡','#draw'),link('11卡 OW3gs','#draw')],'抽牌快速選單');if(menu)drawView.appendChild(menu);}
    const libraryView=document.getElementById('libraryView');if(libraryView&&!libraryView.querySelector(':scope > .loc-quick-menu')){const menu=quickMenu('runes:library',GROUPS.map(group=>link(group,`?group=${encodeURIComponent(group)}#library`,{'data-rune-group-shortcut':group})),'符文群組快速選單');if(menu)libraryView.appendChild(menu);}
  }
  function buildTiers(){const host=getTierHost();if(!host)return;host.replaceChildren();if(scope()==='runes')buildRunes(host);if(!host.childElementCount)host.remove();}
  function normalizeInternalPageLinks(root=document){root.querySelectorAll?.('a[href]').forEach(a=>{const raw=a.getAttribute('href');if(!raw||raw.startsWith('#')||/^(?:mailto:|tel:|javascript:)/i.test(raw))return;let url;try{url=new URL(raw,location.href);}catch{return;}if(url.origin!==location.origin||!/\.html$/i.test(url.pathname)||url.hash)return;const page=baseName(url.pathname);a.setAttribute('href',`${raw}${DEFAULT_HASH[page]||'#main'}`);});}
  function anchorOffset(){const global=document.querySelector('.loc-global-shell')?.getBoundingClientRect().height||0;const tiers=document.querySelector('.loc-nav-tiers')?.getBoundingClientRect().height||0;return global+tiers+16;}
  function alignCurrentHash(){if(!location.hash)return;const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(!target)return;requestAnimationFrame(()=>{const top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-anchorOffset());window.scrollTo({top,behavior:'auto'});});}
  function loadEnhancements(){if(scope()==='runes'&&fileName()==='runes.html')appendScript('js/runes-pwa-ia.js','runes-pwa-ia');}

  document.addEventListener('change',event=>{const select=event.target.closest('[data-loc-theme-select]');if(select)setThemeMode(select.value);});
  applyTheme();
  window.setInterval(()=>{if(getThemeMode()==='auto')applyTheme('auto');},60000);
  window.addEventListener('storage',event=>{if(event.key===THEME_STORAGE_KEY)applyTheme();});
  window.addEventListener('hashchange',()=>{alignCurrentHash();renderNav();});
  window.addEventListener('DOMContentLoaded',()=>{ensureRunesAnchors();renderNav();syncThemeControl();buildTiers();normalizeInternalPageLinks();loadEnhancements();alignCurrentHash();});
})();
