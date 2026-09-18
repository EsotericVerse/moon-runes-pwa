(()=>{
  'use strict';
  if(window.__LOC_NAV__) return;
  window.__LOC_NAV__=true;

  const GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
  const LOCAL_MENU_ALLOW=new Set(['runes:draw','runes:library']);
  const fileName=()=>location.pathname.split('/').pop()||'index.html';
  const baseName=path=>String(path||'').split('/').pop()||'index.html';
  const DEFAULT_HASH=Object.freeze({'runes.html':'#draw','lo3rwang.html':'#author-intro','loc.html':'#home'});
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function loadRegistry(){
    if(window.__LOC_SITE_REGISTRY__)return Promise.resolve(window.__LOC_SITE_REGISTRY__);
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='/js/site-registry.generated.js';
      script.defer=true;
      script.dataset.locSiteRegistry='true';
      script.onload=()=>window.__LOC_SITE_REGISTRY__?resolve(window.__LOC_SITE_REGISTRY__):reject(new Error('Legacy Scope projection missing'));
      script.onerror=()=>reject(new Error('Legacy Scope projection failed to load'));
      document.head.appendChild(script);
    });
  }

  function detectScope(registry){
    const host=location.hostname.toLowerCase();
    const path=location.pathname;
    if(host===registry.scopes.runes.domain||path==='/runes'||path.startsWith('/runes/')||fileName()==='runes.html')return 'runes';
    if(host===registry.scopes.lo3rwang.domain||path==='/lo3rwang'||path.startsWith('/lo3rwang/')||fileName()==='lo3rwang.html')return 'lo3rwang';
    if(host===registry.scopes.governance.domain||path==='/management'||path.startsWith('/management/'))return 'governance';
    return 'loc';
  }

  function featureHref(scope,feature,registry){
    return `https://${registry.scopes[scope].domain}/${feature.path}`;
  }

  function renderNav(registry){
    const scope=detectScope(registry);
    const current=registry.scopes[scope];
    document.querySelectorAll('[data-loc-nav]').forEach(node=>{
      const main=[
        `<a class="loc-global-link" href="${esc(current.reserved[1])}">${esc(current.reserved[0])}</a>`,
        ...registry.sharedFeatures.map(feature=>`<a class="loc-global-link" href="${esc(featureHref(scope,feature,registry))}">${esc(feature.label)}</a>`),
        ...current.role.map(([label,href])=>`<a class="loc-global-link" href="${esc(href)}">${esc(label)}</a>`)
      ].join('');
      const homes=current.homes.map(([label,href])=>`<a class="loc-global-home" href="${esc(href)}">${esc(label)}</a>`).join('');
      const searchAction=`https://${current.domain}/search`;
      const search=`<form class="loc-global-search" action="${esc(searchAction)}" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" /><button class="loc-global-search-submit" type="submit">搜尋</button></form>`;
      node.innerHTML=`<div class="loc-global-links">${main}</div>${search}${homes}`;
    });
  }

  function appendScript(src,key){if(document.querySelector(`script[data-${key}]`))return;const script=document.createElement('script');script.src=src;script.defer=true;script.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='true';document.body.appendChild(script);}
  function link(label,href,attrs={}){const a=document.createElement('a');a.className='loc-nav-tier-link';a.href=href;a.textContent=label;Object.entries(attrs).forEach(([key,value])=>a.setAttribute(key,value));return a;}
  function tier(items,label,className='loc-nav-tier'){const nav=document.createElement('nav');nav.className=className;nav.dataset.localMenu=className==='loc-quick-menu'?'quick':'section';nav.setAttribute('aria-label',label);const inner=document.createElement('div');inner.className=className==='loc-quick-menu'?'loc-quick-menu-inner':'loc-nav-tier-inner';items.forEach(item=>inner.appendChild(item));nav.appendChild(inner);return nav;}
  function quickMenu(key,items,label){if(!LOCAL_MENU_ALLOW.has(key))return null;const nav=tier(items,label,'loc-quick-menu');nav.dataset.quickMenu=key;return nav;}
  function ensureAnchor(id,target){if(!id||document.getElementById(id)||!target)return;const anchor=document.createElement('span');anchor.id=id;anchor.className='loc-anchor-target';anchor.setAttribute('aria-hidden','true');target.prepend(anchor);}
  function ensureRunesAnchors(scope){if(scope!=='runes')return;ensureAnchor('draw',document.getElementById('drawView'));ensureAnchor('library',document.getElementById('libraryView'));}
  function getTierHost(){let host=document.querySelector('.loc-nav-tiers');if(host)return host;const shell=document.querySelector('.loc-global-shell');if(!shell)return null;host=document.createElement('div');host.className='loc-nav-tiers';shell.after(host);return host;}
  function buildRunes(){const drawView=document.getElementById('drawView');if(drawView&&!drawView.querySelector(':scope > .loc-quick-menu')){const menu=quickMenu('runes:draw',[link('單卡','#draw'),link('每日','#draw'),link('雙卡','#draw'),link('三卡','#draw'),link('五卡','#draw'),link('11卡 OW3gs','#draw')],'抽牌快速選單');if(menu)drawView.appendChild(menu);}const libraryView=document.getElementById('libraryView');if(libraryView&&!libraryView.querySelector(':scope > .loc-quick-menu')){const menu=quickMenu('runes:library',GROUPS.map(group=>link(group,`?group=${encodeURIComponent(group)}#library`,{'data-rune-group-shortcut':group})),'符文群組快速選單');if(menu)libraryView.appendChild(menu);}}
  function buildTiers(scope){const host=getTierHost();if(!host)return;host.replaceChildren();if(scope==='runes')buildRunes();if(!host.childElementCount)host.remove();}
  function normalizeInternalPageLinks(root=document){root.querySelectorAll?.('a[href]').forEach(a=>{const raw=a.getAttribute('href');if(!raw||raw.startsWith('#')||/^(?:mailto:|tel:|javascript:)/i.test(raw))return;let url;try{url=new URL(raw,location.href);}catch{return;}if(url.origin!==location.origin||!/\.html$/i.test(url.pathname)||url.hash)return;const page=baseName(url.pathname);a.setAttribute('href',`${raw}${DEFAULT_HASH[page]||'#main'}`);});}
  function anchorOffset(){const global=document.querySelector('.loc-global-shell')?.getBoundingClientRect().height||0;const tiers=document.querySelector('.loc-nav-tiers')?.getBoundingClientRect().height||0;return global+tiers+16;}
  function alignCurrentHash(){if(!location.hash)return;const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(!target)return;requestAnimationFrame(()=>{const top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-anchorOffset());window.scrollTo({top,behavior:'auto'});});}
  function loadEnhancements(scope){if(scope==='runes'&&fileName()==='runes.html')appendScript('js/runes-pwa-ia.js','runes-pwa-ia');}

  async function boot(){
    try{
      const registry=await loadRegistry();
      const scope=detectScope(registry);
      ensureRunesAnchors(scope);
      renderNav(registry);
      buildTiers(scope);
      normalizeInternalPageLinks();
      loadEnhancements(scope);
      alignCurrentHash();
      window.addEventListener('hashchange',()=>{alignCurrentHash();renderNav(registry);});
    }catch(error){
      console.error('[legacy-nav]',error);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
