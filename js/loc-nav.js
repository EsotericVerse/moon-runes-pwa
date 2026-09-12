(() => {
  if (window.__LOC_NAV__) return;
  window.__LOC_NAV__ = true;

  const GROUPS = ["靈魂", "連結", "生命", "自然", "礦物", "元素", "秩序", "無序", "特殊"];
  const NAV3_ALLOW = new Set(["runes:draw", "runes:library"]);
  const fileName = () => location.pathname.split("/").pop() || "index.html";
  const THEME_STORAGE_KEY = "loc-theme";
  const THEME_MODES = new Set(["auto","day","night"]);
  const DAY_START_HOUR = 6;
  const NIGHT_START_HOUR = 18;

  function getThemeMode(){
    try {
      const saved=localStorage.getItem(THEME_STORAGE_KEY);
      return THEME_MODES.has(saved) ? saved : "auto";
    } catch { return "auto"; }
  }

  function resolveAutoTheme(now=new Date()){
    const hour=now.getHours();
    return hour>=DAY_START_HOUR && hour<NIGHT_START_HOUR ? "day" : "night";
  }

  function syncThemeControl(){
    const select=document.querySelector("[data-loc-theme-select]");
    if(select) select.value=getThemeMode();
  }

  function applyTheme(mode=getThemeMode()){
    const safe=THEME_MODES.has(mode) ? mode : "auto";
    const resolved=safe==="auto" ? resolveAutoTheme() : safe;
    document.documentElement.dataset.theme=safe;
    document.documentElement.dataset.themeResolved=resolved;
    document.documentElement.style.colorScheme=resolved==="day" ? "light" : "dark";
    syncThemeControl();
  }

  function setThemeMode(mode){
    if(!THEME_MODES.has(mode)) return;
    try { localStorage.setItem(THEME_STORAGE_KEY,mode); } catch {}
    applyTheme(mode);
  }

  function themeControlHtml(){
    return `<label class="loc-theme-control"><span>風格</span><select data-loc-theme-select aria-label="即時風格"><option value="auto">自動</option><option value="day">白天</option><option value="night">夜間</option></select></label>`;
  }

  const baseName = path => String(path || "").split("/").pop() || "index.html";

  const DEFAULT_HASH = Object.freeze({
    "index.html":"#top",
    "runes.html":"#draw",
    "game.html":"#main",
    "context.html":"#graph",
    "evolution.html":"#overview",
    "statics.html":"#main",
    "governance.html":"#principles",
    "search.html":"#main",
    "lo3rwang.html":"#author-intro"
  });

  const NAV1 = Object.freeze([
    {id:"runes",label:"月之符文",href:"runes.html#draw"},
    {id:"game",label:"遊戲",href:"game.html#main"},
    {id:"context",label:"脈絡",href:"context.html#graph"},
    {id:"governance",label:"治理",href:"governance.html#principles"},
    {id:"statics",label:"統計",href:"statics.html#main"},
    {id:"evolution",label:"推演",href:"evolution.html#overview"}
  ]);

  const PAGE_GROUP = Object.freeze({
    "index.html":"home",
    "runes.html":"runes",
    "game.html":"game",
    "context.html":"context",
    "evolution.html":"evolution",
    "governance.html":"governance",
    "statics.html":"statics",
    "search.html":"search",
    "lo3rwang.html":"author"
  });

  const AUTHOR_SECTIONS = Object.freeze([
    {label:"介紹",match:"他主要在做什麼",id:"author-intro"},
    {label:"主要身份",match:"主要身份",id:"author-identity"},
    {label:"工作與合作",match:"工作與合作方向",id:"author-work"},
    {label:"作者自述",match:"作者自述",id:"author-self"},
    {label:"LOC月典",match:"LOC／月典",id:"author-loc"}
  ]);

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function currentRouteKey(){
    const hash=location.hash||DEFAULT_HASH[fileName()]||"#main";
    return `${location.pathname}${location.search}${hash}`;
  }

  function targetRouteKey(href){
    const url=new URL(href,location.href);
    const page=baseName(url.pathname);
    if(!url.hash) url.hash=DEFAULT_HASH[page]||"#main";
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function renderNav1(){
    const current=PAGE_GROUP[fileName()]||"";
    const route=currentRouteKey();
    document.querySelectorAll("[data-loc-nav]").forEach(node=>{
      const links=NAV1.map(item=>item.id===current && targetRouteKey(item.href)===route
        ? `<span class="loc-global-link loc-global-current" aria-current="page">${esc(item.label)}</span>`
        : `<a class="loc-global-link" href="${esc(item.href)}">${esc(item.label)}</a>`
      ).join("");
      const search=`<form class="loc-global-search" action="search.html#main" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" /><button class="loc-global-search-submit" type="submit">搜尋</button></form>`;
      const home=current==="home"?"":"<a class=\"loc-global-home\" href=\"index.html#top\">回月典首頁</a>";
      node.innerHTML=`<div class="loc-global-links">${links}</div>${search}${themeControlHtml()}${home}`;
    });
  }

  function appendScript(src,key){
    if(document.querySelector(`script[data-${key}]`)) return;
    const script=document.createElement("script");
    script.src=src;
    script.defer=true;
    script.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]="true";
    document.body.appendChild(script);
  }

  function link(label,href,attrs={}){
    const a=document.createElement("a");
    a.className="loc-nav-tier-link";
    a.href=href;
    a.textContent=label;
    Object.entries(attrs).forEach(([key,value])=>a.setAttribute(key,value));
    return a;
  }

  function button(label,attrs={}){
    const b=document.createElement("button");
    b.type="button";
    b.className="loc-nav-tier-link";
    b.textContent=label;
    Object.entries(attrs).forEach(([key,value])=>{
      if(key==="disabled") b.disabled=true;
      else b.setAttribute(key,value);
    });
    return b;
  }

  function tier(items,label,className="loc-nav-tier"){
    const nav=document.createElement("nav");
    nav.className=className;
    if(className==="loc-nav-tier") nav.dataset.tier="2";
    nav.setAttribute("aria-label",label);
    const inner=document.createElement("div");
    inner.className=className==="loc-nav3"?"loc-nav3-inner":"loc-nav-tier-inner";
    items.forEach(item=>inner.appendChild(item));
    nav.appendChild(inner);
    return nav;
  }

  function nav3(key,items,label){
    if(!NAV3_ALLOW.has(key)) return null;
    const nav=tier(items,label,"loc-nav3");
    nav.dataset.tier="3";
    nav.dataset.nav3=key;
    return nav;
  }

  function sectionHref(targetId,sectionId=targetId){
    const target=document.getElementById(targetId);
    if(!target) return `#${targetId}`;
    const section=target.matches("section,.section,[data-context-view],[data-view]")
      ? target
      : target.closest("section,.section,[data-context-view],[data-view]");
    if(!section || section===target) return `#${targetId}`;
    if(!section.id) section.id=sectionId;
    return `#${section.id}`;
  }

  function ensureAnchor(id,target){
    if(!id || document.getElementById(id) || !target) return;
    const anchor=document.createElement("span");
    anchor.id=id;
    anchor.className="loc-anchor-target";
    anchor.setAttribute("aria-hidden","true");
    target.prepend(anchor);
  }

  function ensurePageAnchors(){
    const file=fileName();
    if(file==="runes.html"){
      ensureAnchor("draw",document.getElementById("drawView"));
      ensureAnchor("daily",document.getElementById("drawView"));
      ensureAnchor("library",document.getElementById("libraryView"));
      ensureAnchor("reference",document.getElementById("referenceView"));
    }else if(file==="game.html"){
      ensureAnchor("main",document.querySelector("main"));
    }else if(file==="context.html"){
      ["graph","nodes","relations","scenario"].forEach(key=>ensureAnchor(key,document.querySelector(`[data-context-view="${key}"]`)));
    }else if(file==="evolution.html"){
      ensureAnchor("overview",document.getElementById("overviewView"));
      ensureAnchor("timeline",document.getElementById("timelineView"));
      ensureAnchor("trend",document.getElementById("trendView"));
      ensureAnchor("trajectory",document.getElementById("trajectoryView"));
    }else if(file==="statics.html"){
      ensureAnchor("main",document.querySelector("[data-statics-overview],main"));
    }else if(file==="search.html"){
      ensureAnchor("main",document.querySelector("main,.page"));
    }else{
      const defaultHash=DEFAULT_HASH[file];
      if(defaultHash && !document.getElementById(defaultHash.slice(1))) ensureAnchor(defaultHash.slice(1),document.querySelector("main,.page"));
    }
  }

  function normalizeInternalPageLinks(root=document){
    root.querySelectorAll?.('a[href]').forEach(a=>{
      const raw=a.getAttribute('href');
      if(!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:)/i.test(raw)) return;
      let url;
      try{ url=new URL(raw,location.href); }catch{return;}
      if(url.origin!==location.origin || !/\.html$/i.test(url.pathname) || url.hash) return;
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
    const id=decodeURIComponent(location.hash.slice(1));
    const target=document.getElementById(id);
    if(!target) return;
    requestAnimationFrame(()=>{
      const top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-anchorOffset());
      window.scrollTo({top,behavior:'auto'});
    });
  }

  function getTierHost(){
    let host=document.querySelector(".loc-nav-tiers");
    if(host) return host;
    const shell=document.querySelector(".loc-global-shell");
    if(!shell) return null;
    host=document.createElement("div");
    host.className="loc-nav-tiers";
    shell.after(host);
    return host;
  }

  function buildIndex(){
    const top=document.getElementById("top")||document.querySelector("main,.loc-page");
    if(top&&!top.id) top.id="top";
  }

  function buildRunes(host){
    host.appendChild(tier([
      link("新手上路","tutorial02.html"),
      link("占卜抽籤","runes.html#draw"),
      link("66 符資料","runes.html#library"),
      link("符文脈絡","runes.html#reference"),
      link("符文統計","statics.html#runes"),
      link("符文知識庫","runes.html#reference")
    ],"月之符文功能"));

    if(fileName()!=="runes.html") return;
    const drawView=document.getElementById("drawView");
    if(drawView&&!drawView.querySelector(":scope > .loc-nav3")){
      const menu=nav3("runes:draw",[
        link("單卡","runes.html?mode=single#draw"),
        link("每日","runes.html?mode=daily#daily"),
        link("雙卡","runes.html?mode=2card#draw"),
        link("三卡","runes.html?mode=3card#draw"),
        link("五卡","runes.html?mode=5card#draw"),
        link("11卡 OW3gs","runes.html?mode=ow3gs#draw"),
        link("說明","tutorial02.html")
      ],"抽牌快速選單");
      if(menu) drawView.appendChild(menu);
    }

    const libraryView=document.getElementById("libraryView");
    if(libraryView&&!libraryView.querySelector(":scope > .loc-nav3")){
      const menu=nav3("runes:library",GROUPS.map(group=>link(group,`runes.html?group=${encodeURIComponent(group)}#library`,{"data-rune-group-shortcut":group})),"符文群組快速選單");
      if(menu) libraryView.appendChild(menu);
    }
  }

  function ensureAuthorNav(nav){
    if(fileName()!=="lo3rwang.html" || nav.dataset.authorNavReady==="true") return;
    const inner=nav.querySelector(".loc-nav-tier-inner");
    if(!inner) return;
    const headings=[...document.querySelectorAll("main article h2")];
    const links=AUTHOR_SECTIONS.map(item=>{
      const heading=headings.find(h=>h.textContent.trim().includes(item.match));
      if(!heading) return null;
      if(!heading.id) heading.id=item.id;
      return link(item.label,`#${heading.id}`);
    }).filter(Boolean);
    if(!links.length) return;
    inner.replaceChildren(...links);
    nav.dataset.authorNavReady="true";
  }

  function buildTiers(){
    const host=getTierHost();
    if(!host) return;
    host.replaceChildren();
    const file=fileName();
    if(file==="index.html") buildIndex(host);
    else if(file==="runes.html") buildRunes(host);
    else if(file==="context.html") host.appendChild(tier([
      button("關係圖 Graph",{"data-context-switch":"graph"}),
      button("節點 Nodes",{"data-context-switch":"nodes"}),
      button("關聯 Edges",{"data-context-switch":"relations"}),
      button("情境 Scenarios",{"data-context-switch":"scenario"})
    ],"脈絡功能"));
    else if(file==="evolution.html") host.appendChild(tier([
      button("時期 Period",{"data-view":"overview"}),
      button("時間線 Timeline",{"data-view":"timeline"}),
      button("趨勢 Trend",{"data-view":"trend"}),
      button("軌跡 Trajectory",{"data-view":"trajectory"})
    ],"推演功能"));
    else if(file==="statics.html") host.appendChild(tier([
      link("總覽","statics.html#main"),
      link("排行榜","statics.html#ranking"),
      link("符文統計","statics.html#runes"),
      link("每日符文","statics.html#daily"),
      link("來源管理","statics.html#sources"),
      link("匯入","statics.html#import")
    ],"統計功能"));
    else if(file==="governance.html") host.appendChild(tier([
      link("原則","governance.html#principles"),
      link("版權","governance.html#copyright"),
      link("理念","governance.html#philosophy"),
      link("文件","governance.html#documents")
    ],"治理內容"));
    else if(file==="lo3rwang.html") host.appendChild(tier([
      button("作者個人網頁介紹",{"aria-current":"true",disabled:""})
    ],"作者頁"));
    if(!host.childElementCount) host.remove();
  }

  function resetCurrent(nav){
    nav.querySelectorAll(".loc-nav-tier-link").forEach(el=>{
      el.removeAttribute("aria-current");
      el.removeAttribute("aria-disabled");
      if(el.tagName==="A" && el.dataset.originalHref) el.setAttribute("href",el.dataset.originalHref);
      if(el.tagName==="BUTTON") el.disabled=false;
    });
  }

  function activateCurrent(el){
    if(!el) return;
    el.setAttribute("aria-current","true");
    el.setAttribute("aria-disabled","true");
    if(el.tagName==="A"){
      if(!el.dataset.originalHref) el.dataset.originalHref=el.getAttribute("href")||"";
      el.removeAttribute("href");
    } else if(el.tagName==="BUTTON") el.disabled=true;
  }

  function syncCurrent(){
    const nav=document.querySelector('.loc-nav-tier[data-tier="2"]');
    if(!nav) return;
    const file=fileName();
    ensureAuthorNav(nav);
    resetCurrent(nav);

    if(file==="context.html"){
      const allowed=new Set(["graph","nodes","relations","scenario"]);
      const key=allowed.has(location.hash.slice(1))?location.hash.slice(1):"graph";
      activateCurrent(nav.querySelector(`[data-context-switch="${key}"]`));
      return;
    }

    if(file==="evolution.html"){
      const allowed=new Set(["overview","timeline","trend","trajectory"]);
      const key=allowed.has(location.hash.slice(1))?location.hash.slice(1):"overview";
      activateCurrent(nav.querySelector(`[data-view="${key}"]`));
      return;
    }

    const wantedHash=location.hash||DEFAULT_HASH[file]||"#main";
    nav.querySelectorAll("a.loc-nav-tier-link").forEach(a=>{
      const href=a.dataset.originalHref||a.getAttribute("href");
      if(!href) return;
      const url=new URL(href,location.href);
      if(baseName(url.pathname)===file && url.hash===wantedHash) activateCurrent(a);
    });
  }

  function cleanupContextGameEmbed(){
    if(fileName()!=="context.html") return;
    const frame=document.querySelector(".game-frame");
    const view=frame?.closest("[data-context-view]");
    if(view) view.remove();
    else {
      document.querySelector(".game-frame-wrap")?.remove();
      document.querySelector(".game-open")?.remove();
    }
  }

  function loadEnhancements(){
    const file=fileName();
    if(file==="runes.html") appendScript("js/runes-pwa-ia.js","runes-pwa-ia");
    if(file==="evolution.html") appendScript("js/life-daily-draw-history.js","life-draw-history");
    if(file==="search.html") appendScript("js/search-display-governance.js","loc-search-display-governance");
  }

  document.addEventListener("change",event=>{
    const select=event.target.closest("[data-loc-theme-select]");
    if(select) setThemeMode(select.value);
  });

  document.addEventListener("click",event=>{
    const control=event.target.closest('.loc-nav-tier[data-tier="2"] .loc-nav-tier-link');
    if(!control || control.getAttribute("aria-disabled")==="true") return;
    if(control.matches("[data-context-switch],[data-view]")){
      const nav=control.closest(".loc-nav-tier");
      resetCurrent(nav);
      activateCurrent(control);
    }
  });

  applyTheme();
  window.setInterval(()=>{ if(getThemeMode()==="auto") applyTheme("auto"); },60000);
  window.addEventListener("storage",event=>{ if(event.key===THEME_STORAGE_KEY) applyTheme(); });
  window.addEventListener("hashchange",()=>{
    syncCurrent();
    alignCurrentHash();
    renderNav1();
  });
  window.addEventListener("DOMContentLoaded",()=>{
    ensurePageAnchors();
    renderNav1();
    syncThemeControl();
    cleanupContextGameEmbed();
    buildTiers();
    normalizeInternalPageLinks();
    syncCurrent();
    loadEnhancements();
    alignCurrentHash();
  });
})();