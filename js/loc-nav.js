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

  function installGovernanceStyles(){
    if(fileName()!=="governance.html" || document.getElementById("loc-governance-canonical-style")) return;
    const style=document.createElement("style");
    style.id="loc-governance-canonical-style";
    style.textContent=`
      :root{color-scheme:dark;--bg:#07182d!important;--card:rgba(13,31,56,.88)!important;--text:#f5f1ff!important;--muted:#b9bfd0!important;--line:rgba(180,158,255,.22)!important;--purple:#b49eff;--gold:#e7c27d;--surface2:rgba(23,43,72,.72)}
      body{background:radial-gradient(circle at 10% 8%,rgba(103,75,171,.24),transparent 30rem),radial-gradient(circle at 88% 88%,rgba(35,105,135,.18),transparent 30rem),linear-gradient(180deg,#07182d 0%,#091729 62%,#06111f 100%)!important;color:var(--text)!important;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif!important;line-height:1.7!important}
      .app-shell{display:block!important;width:min(1180px,calc(100% - 28px))!important;margin:0 auto!important;padding:18px 0 64px!important}
      .workspace-main{min-width:0}
      .governance-view article{background:transparent!important;border:0!important;border-radius:0!important;padding:0!important}
      .governance-view .eyebrow{color:var(--purple)!important;font-size:.78rem!important;font-weight:800!important;letter-spacing:.08em!important;text-transform:none!important}
      .governance-view h1{margin:.25rem 0 .7rem!important;font-size:clamp(2rem,5vw,3.1rem)!important;line-height:1.18!important;color:var(--text)!important}
      .governance-view .lead{margin:0 0 20px!important;color:var(--muted)!important;font-size:1rem!important;line-height:1.75!important}
      .governance-view h2{margin:18px 0 0!important;padding:16px 18px 6px!important;border:1px solid var(--line)!important;border-bottom:0!important;border-radius:18px 18px 0 0!important;background:rgba(11,27,49,.58)!important;color:var(--gold)!important;font-size:1.08rem!important}
      .governance-view h2 + p,.governance-view h2 + ul,.governance-view h2 + ol,.governance-view h2 + h3{margin-top:0!important}
      .governance-view h3{margin:0!important;padding:12px 18px 4px!important;border-left:1px solid var(--line)!important;border-right:1px solid var(--line)!important;background:rgba(11,27,49,.58)!important;color:var(--purple)!important;font-size:.92rem!important}
      .governance-view p,.governance-view ul,.governance-view ol{margin:0!important;padding:8px 18px 14px!important;border-left:1px solid var(--line)!important;border-right:1px solid var(--line)!important;background:rgba(11,27,49,.58)!important;color:#dce6f7!important}
      .governance-view ul,.governance-view ol{padding-left:38px!important}
      .governance-view h2 ~ p:last-child,.governance-view section>p:last-child{border-bottom:1px solid var(--line)!important;border-radius:0 0 18px 18px!important}
      .governance-view a{color:var(--gold)!important}
      .governance-view .back{display:inline-flex!important;margin-top:16px!important;padding:9px 13px!important;border:1px solid var(--line)!important;border-radius:999px!important;background:rgba(180,158,255,.06)!important;text-decoration:none!important}
      @media(max-width:560px){.app-shell{width:min(100% - 18px,1180px)!important}.governance-view h2{padding:14px 14px 5px!important}.governance-view h3,.governance-view p,.governance-view ul,.governance-view ol{padding-left:14px!important;padding-right:14px!important}.governance-view ul,.governance-view ol{padding-left:32px!important}}
    `;
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
      link("新手上路","runes.html#beginner"),
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

  function buildGovernance(host){
    host.appendChild(tier([
      link("中立立場","governance.html#governanceView"),
      link("Copyleft","COPYLEFT.md"),
      link("政德風治理理念","governance.html#style")
    ],"治理內容"));
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
    else if (file === "governance.html") buildGovernance(host);
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
    if (file === "runes.html" || file === "lots.html") appendScript("js/runes-pwa-ia.js","runes-pwa-ia");
    if (file === "evolution.html") appendScript("js/life-daily-draw-history.js","life-draw-history");
  }

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    installGovernanceStyles();
    loadNav1();
    cleanupContextGameEmbed();
    buildTiers();
    loadEnhancements();
  });
})();
