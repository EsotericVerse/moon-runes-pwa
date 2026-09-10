(() => {
  const GROUPS = ["靈魂", "連結", "生命", "自然", "礦物", "元素", "秩序", "無序", "特殊"];

  const fileName = () => location.pathname.split("/").pop() || "index.html";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));



  function loadNav1(){
    const mount=()=>window.LOCNav1?.mountAll?.();
    if(window.LOCNav1){mount();return;}
    const existing=document.querySelector('script[data-loc-nav1-module]');
    if(existing){existing.addEventListener('load',mount,{once:true});return;}
    const script=document.createElement('script');
    script.src='js/loc-nav1.js';
    script.defer=true;
    script.dataset.locNav1Module='true';
    script.addEventListener('load',mount,{once:true});
    document.head.appendChild(script);
  }

  function installStyles() {
    if (document.getElementById("loc-canonical-nav-runtime")) return;
    const style = document.createElement("style");
    style.id = "loc-canonical-nav-runtime";
    style.textContent = `.runes-third-nav{display:none!important}`;
    document.head.appendChild(style);
  }

  function appendScript(src, key) {
    if (document.querySelector(`script[data-${key}]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = "true";
    document.body.appendChild(script);
  }

  function getTierHost() {
    let host = document.querySelector(".loc-nav-tiers");
    if (host) return host;
    const globalShell = document.querySelector(".loc-global-shell");
    if (!globalShell) return null;
    host = document.createElement("div");
    host.className = "loc-nav-tiers";
    globalShell.after(host);
    return host;
  }

  function tier(items, label) {
    const nav = document.createElement("nav");
    nav.className = "loc-nav-tier";
    nav.dataset.tier = "2";
    nav.setAttribute("aria-label", label);
    const inner = document.createElement("div");
    inner.className = "loc-nav-tier-inner";
    items.forEach(item => inner.appendChild(item));
    nav.appendChild(inner);
    return nav;
  }

  function sectionMenu(items, label) {
    const box = document.createElement("div");
    box.className = "loc-section-menu";
    box.setAttribute("role", "navigation");
    box.setAttribute("aria-label", label);
    const inner = document.createElement("div");
    inner.className = "loc-section-menu-inner";
    items.forEach(item => inner.appendChild(item));
    box.appendChild(inner);
    return box;
  }

  function link(label, href, attrs = {}) {
    const a = document.createElement("a");
    a.className = "loc-nav-tier-link";
    a.href = href;
    a.textContent = label;
    Object.entries(attrs).forEach(([key,value]) => a.setAttribute(key,value));
    return a;
  }

  function button(label, attrs = {}) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "loc-nav-tier-link";
    b.textContent = label;
    Object.entries(attrs).forEach(([key,value]) => b.setAttribute(key,value));
    return b;
  }

  function buildIndex(host) {
    host.appendChild(tier([
      link("LOC月典簡介","#top"),
      link("新手上路","#start"),
      link("LOC架構圖","#framework-map"),
      link("目前進度","#progress"),
      link("作者的話","#about-title")
    ],"首頁快速選單"));

    const framework = document.getElementById("framework-map");
    if (framework && !framework.querySelector(":scope > .loc-section-menu")) {
      framework.prepend(sectionMenu([
        link("月之符文模組","#framework-map"),
        link("脈絡","#framework-map"),
        link("音樂","#framework-map"),
        link("文字創作","#framework-map"),
        link("多媒體","#framework-map"),
        link("演算法","#framework-map"),
        link("演算模組","#framework-map"),
        link("推演引擎","#framework-map")
      ],"LOC架構圖快速切換"));
    }
  }

  function buildRunes(host) {
    host.appendChild(tier([
      link("新手上路","lots.html#beginner"),
      link("占卜抽籤","lots.html#draw"),
      link("符文總覽","lots.html#library"),
      link("符文統計","statics.htm#runes"),
      link("符文知識庫","runes.html#reference")
    ],"月之符文功能"));

    const drawView = fileName() === "lots.html" ? document.getElementById("drawView") : null;
    if (drawView && !drawView.querySelector(":scope > .loc-section-menu")) {
      drawView.prepend(sectionMenu([
        link("單卡","lots.html?mode=single#draw"),
        link("每日","lots.html?mode=daily#draw"),
        link("雙卡","lots.html?mode=2card#draw"),
        link("三卡","lots.html?mode=3card#draw"),
        link("五卡","lots.html?mode=5card#draw"),
        link("11卡","lots.html?mode=ow3gs#draw"),
        link("說明","lots.html#draw-help")
      ],"抽牌快速選單"));
    }

    const libraryView = fileName() === "lots.html" ? document.getElementById("libraryView") : null;
    if (libraryView && !libraryView.querySelector(":scope > .loc-section-menu")) {
      libraryView.prepend(sectionMenu(GROUPS.map(group => link(group,`lots.html?group=${encodeURIComponent(group)}#library`,{"data-rune-group-shortcut":group})),"符文群組快速選單"));
    }
  }

  function buildContext(host) {
    host.appendChild(tier([
      button("關係圖",{"data-context-switch":"graph"}),
      button("節點",{"data-context-switch":"nodes"}),
      button("關聯",{"data-context-switch":"edges"}),
      button("情境",{"data-context-switch":"scenarios"})
    ],"脈絡功能"));
  }

  function buildEvolution(host) {
    host.appendChild(tier([
      button("時期",{"data-view":"overview"}),
      button("時間線",{"data-view":"timeline"}),
      button("趨勢",{"data-view":"trend"}),
      button("軌跡",{"data-view":"trajectory"})
    ],"推演功能"));
  }

  function buildStatics(host) {
    host.appendChild(tier([
      link("排行榜","statics.htm#ranking"),
      link("符文統計","statics.htm#runes"),
      link("來源管理","statics.htm#sources"),
      link("匯入","statics.htm#import")
    ],"統計功能"));
  }

  function buildTiers() {
    const host = getTierHost();
    if (!host) return;
    host.replaceChildren();
    const file = fileName();
    if (file === "index.html") buildIndex(host);
    else if (file === "runes.html" || file === "lots.html" || file === "statics.htm" || file === "statics.html") buildRunes(host);
    else if (file === "context.html") buildContext(host);
    else if (file === "evolution.html") buildEvolution(host);
    
  }

  function cleanupContextGameEmbed() {
    if (fileName() !== "context.html") return;
    const frame = document.querySelector(".game-frame");
    const view = frame?.closest("[data-context-view]");
    if (view) view.remove();
    else { document.querySelector(".game-frame-wrap")?.remove(); document.querySelector(".game-open")?.remove(); }
    document.querySelectorAll('a[href="loc2-game.html"]').forEach(a => { a.href="game.html"; a.removeAttribute("target"); a.removeAttribute("rel"); });
  }

  function loadEnhancements() {
    const file = fileName();
    if (file === "index.html") appendScript("js/home-canonical.js","home-canonical");
    if (file === "lots.html") appendScript("js/runes-pwa-ia.js","runes-pwa-ia");
    if (file === "evolution.html") appendScript("js/life-daily-draw-history.js","life-draw-history");
  }

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    loadNav1();
    cleanupContextGameEmbed();
    buildTiers();
    loadEnhancements();
  });
})();
