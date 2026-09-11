(() => {
  const GROUPS = ["靈魂", "連結", "生命", "自然", "礦物", "元素", "秩序", "無序", "特殊"];
  const NAV3_ALLOW = new Set(["lots:draw", "lots:library"]);

  const fileName = () => location.pathname.split("/").pop() || "index.html";

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
    style.textContent = `.sidebar,.side-bar,.side-nav,.left-nav,.app-sidebar,.workspace-sidebar,.loc2-local-header{display:none!important}.runes-third-nav{display:none!important}.loc-guidance-note{margin:14px 0;padding:14px 16px;border:1px solid rgba(180,158,255,.22);border-radius:16px;background:rgba(23,43,72,.52);color:#dce6f7;line-height:1.7}.loc-guidance-note strong{color:#e7c27d}`;
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

  function nav3(key, items, label) {
    if (!NAV3_ALLOW.has(key)) return null;
    const box = document.createElement("nav");
    box.className = "loc-nav3";
    box.dataset.tier = "3";
    box.dataset.nav3 = key;
    box.setAttribute("aria-label", label);
    const inner = document.createElement("div");
    inner.className = "loc-nav3-inner";
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
    Object.entries(attrs).forEach(([key,value]) => {
      if (key === "disabled") b.disabled = true;
      else b.setAttribute(key,value);
    });
    return b;
  }

  function sectionHref(targetId, sectionId = targetId) {
    const target = document.getElementById(targetId);
    if (!target) return `#${targetId}`;
    const section = target.matches("section,.section,[data-context-view],[data-view]") ? target : target.closest("section,.section,[data-context-view],[data-view]");
    if (!section || section === target) return `#${targetId}`;
    if (!section.id) section.id = sectionId;
    return `#${section.id}`;
  }

  function normalizeLegacyLinks(root=document) {
    root.querySelectorAll('a[href*="statics.htm"]').forEach(a => {
      a.setAttribute("href", a.getAttribute("href").replace("statics.htm", "statics.html"));
    });
    root.querySelectorAll('a[href*="loc2-game.html"]').forEach(a => {
      a.setAttribute("href", a.getAttribute("href").replace("loc2-game.html", "game.html"));
      a.removeAttribute("target");
      a.removeAttribute("rel");
    });
  }

  function buildIndex(host) {
    const top = document.getElementById("top") || document.querySelector("main,.loc-page");
    if (top && !top.id) top.id = "top";
    const startHref = sectionHref("start-title", "start");
    const aboutHref = sectionHref("about-title", "about");
    host.appendChild(tier([
      link("LOC月典簡介",sectionHref("top")),
      link("新手上路",startHref),
      link("LOC架構圖",sectionHref("framework-map")),
      link("目前進度",sectionHref("current-progress")),
      link("作者的話",aboutHref)
    ],"首頁快速選單"));
  }

  function buildRunes(host) {
    const beginnerHref = fileName() === "lots.html" ? "lots.html#beginner" : "runes.html#beginner";
    host.appendChild(tier([
      link("新手上路",beginnerHref),
      link("占卜抽籤","lots.html#draw"),
      link("符文總覽","lots.html#library"),
      link("符文統計","statics.html#runes"),
      link("符文知識庫","runes.html#reference")
    ],"月之符文功能"));

    const drawView = fileName() === "lots.html" ? document.getElementById("drawView") : null;
    if (drawView && !drawView.querySelector(":scope > .loc-nav3")) {
      const menu = nav3("lots:draw", [
        link("單卡","lots.html?mode=single#draw"),
        link("每日","lots.html?mode=daily#draw"),
        link("雙卡","lots.html?mode=2card#draw"),
        link("三卡","lots.html?mode=3card#draw"),
        link("五卡","lots.html?mode=5card#draw"),
        link("11卡 OW3gs","lots.html?mode=ow3gs#draw"),
        link("說明","lots.html#beginner")
      ],"抽牌快速選單");
      if (menu) drawView.appendChild(menu);
    }

    const libraryView = fileName() === "lots.html" ? document.getElementById("libraryView") : null;
    if (libraryView && !libraryView.querySelector(":scope > .loc-nav3")) {
      const menu = nav3("lots:library", GROUPS.map(group => link(group,`lots.html?group=${encodeURIComponent(group)}#library`,{"data-rune-group-shortcut":group})),"符文群組快速選單");
      if (menu) libraryView.appendChild(menu);
    }
  }

  function buildContext(host) {
    host.appendChild(tier([
      button("關係圖 Graph",{"data-context-switch":"graph"}),
      button("節點 Nodes",{"data-context-switch":"nodes"}),
      button("關聯 Edges",{"data-context-switch":"relations"}),
      button("情境 Scenarios",{"data-context-switch":"scenario"})
    ],"脈絡功能"));
  }

  function buildEvolution(host) {
    host.appendChild(tier([
      button("時期 Period",{"data-view":"overview"}),
      button("時間線 Timeline",{"data-view":"timeline"}),
      button("趨勢 Trend",{"data-view":"trend"}),
      button("軌跡 Trajectory",{"data-view":"trajectory"})
    ],"推演功能"));
  }

  function buildStatics(host) {
    host.appendChild(tier([
      link("排行榜","statics.html#ranking"),
      link("符文統計","statics.html#runes"),
      link("來源管理","statics.html#sources"),
      link("匯入","statics.html#import")
    ],"統計功能"));
  }

  function buildGovernance(host){
    host.appendChild(tier([
      link("原則","governance.html#principles"),
      link("版權","governance.html#copyright"),
      link("理念","governance.html#philosophy"),
      link("文件","governance.html#documents")
    ],"治理內容"));
  }

  function buildAuthor(host){
    host.appendChild(tier([
      button("作者個人網頁介紹",{"aria-current":"true",disabled:""})
    ],"作者頁"));
  }

  function buildTiers() {
    const host = getTierHost();
    if (!host) return;
    host.replaceChildren();
    const file = fileName();
    if (file === "index.html") buildIndex(host);
    else if (file === "runes.html" || file === "lots.html") buildRunes(host);
    else if (file === "context.html") buildContext(host);
    else if (file === "evolution.html") buildEvolution(host);
    else if (file === "governance.html") buildGovernance(host);
    else if (file === "statics.html" || file === "statics.htm") buildStatics(host);
    else if (file === "lo3rwang.html") buildAuthor(host);
    if (!host.childElementCount) host.remove();
  }

  function installThemeGuidance(){
    const file=fileName();
    if(file==="governance.html"){
      const principles=document.getElementById("principles");
      if(principles && !document.getElementById("daily-theme-governance")){
        const p=document.createElement("p");
        p.id="daily-theme-governance";
        p.innerHTML="<strong>每日抽牌是中立立場的直接演示：</strong>沒有預設問題時，從無中生有地抽出一個『今天的主題』，作為語言遞迴的起點。這個語意可以在後續觀察、書寫與脈絡中繼續成長；使用者可以選擇如何灌溉、修剪與延伸它，而不是把抽牌當成命定未來或必須服從的決定。";
        principles.appendChild(p);
      }
    }

    if(file==="tutorial01.html"){
      const s3=document.querySelector("#s3 .slide-inner > div:first-child");
      if(s3 && !document.getElementById("daily-theme-tutorial")){
        const p=document.createElement("p");
        p.id="daily-theme-tutorial";
        p.className="copy";
        p.style.marginTop="3%";
        p.innerHTML="<strong>為什麼沒事也可以抽一張？</strong> 因為每日抽牌可以從無中生有地先長出一個『今天的主題』，作為語言遞迴的起點。它不是替你決定未來，而是先給一顆語意種子；接下來要怎麼理解、灌溉、延伸或修剪，仍由你依今天真正發生的事情決定。";
        const first=s3.querySelector("p.copy");
        if(first) first.after(p); else s3.appendChild(p);
      }
    }

    if(file==="lots.html"){
      const params=new URLSearchParams(location.search);
      if(params.get("mode")==="daily"){
        const drawView=document.getElementById("drawView");
        if(drawView && !document.getElementById("daily-theme-note")){
          const note=document.createElement("div");
          note.id="daily-theme-note";
          note.className="loc-guidance-note";
          note.innerHTML="<strong>每日抽牌看的是『今天的主題』。</strong> 沒有問題也可以抽一張：先從無中生有地得到一個語意種子，讓語言開始遞迴成長。你可以依今天的現實脈絡決定怎麼灌溉、延伸或修剪它；它不是命定未來，也不是指示你一定要做什麼。單卡則是針對當下問題或情境的一張回應。";
          const menu=drawView.querySelector(":scope > .loc-nav3");
          if(menu) drawView.insertBefore(note,menu); else drawView.appendChild(note);
        }
      }
    }
  }

  function cleanupContextGameEmbed() {
    if (fileName() !== "context.html") return;
    const frame = document.querySelector(".game-frame");
    const view = frame?.closest("[data-context-view]");
    if (view) view.remove();
    else { document.querySelector(".game-frame-wrap")?.remove(); document.querySelector(".game-open")?.remove(); }
  }

  function loadEnhancements() {
    const file = fileName();
    if (file === "index.html") appendScript("js/home-canonical.js","home-canonical");
    if (file === "runes.html" || file === "lots.html") appendScript("js/runes-pwa-ia.js","runes-pwa-ia");
    if (file === "evolution.html") appendScript("js/life-daily-draw-history.js","life-draw-history");
  }

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    loadNav1();
    normalizeLegacyLinks(document);
    cleanupContextGameEmbed();
    buildTiers();
    installThemeGuidance();
    loadEnhancements();
  });
})();