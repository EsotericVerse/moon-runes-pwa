(() => {
  const NAV_URL = "data/json/registries/LOC_NAV.json";
  const WEB_BUILD = "0.8";
  const GROUPS = ["靈魂", "連結", "生命", "自然", "礦物", "元素", "秩序", "無序", "特殊"];

  const fileName = () => location.pathname.split("/").pop() || "index.html";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  const DEFAULT_NAV = [
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"game",label:"遊戲",href:"game.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"evolution",label:"推演",href:"evolution.html"},
    {id:"statics",label:"統計",href:"statics.htm"}
  ];

  function currentId(node, items) {
    const file = fileName();
    if (file === "context.html") return "context";
    if (file === "game.html" || file === "loc2-game.html") return "game";
    if (file === "statics.htm" || file === "statics.html") return "statics";
    if (node?.dataset?.page) return node.dataset.page;
    return items.find(item => item.href === file)?.id || "";
  }

  function paintNav(node, items = DEFAULT_NAV) {
    const active = currentId(node, items);
    node.innerHTML = `<a class="loc-global-brand" href="index.html" aria-label="回到 LOC月典首頁">LOC月典</a><div class="loc-global-links">${items.filter(item => item.id !== "search").map(item => `<a class="loc-global-link" href="${esc(item.href)}"${item.id === active ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`).join("")}<form class="loc-global-search" action="search.html" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋" /><button class="loc-global-search-submit" type="submit">搜尋</button></form></div>`;
  }

  async function renderNav(node) {
    paintNav(node);
    try {
      const response = await fetch(NAV_URL, {cache:"no-store"});
      if (!response.ok) return;
      const data = await response.json();
      paintNav(node, Array.isArray(data.items) && data.items.length ? data.items : DEFAULT_NAV);
    } catch (error) { console.warn(error); }
  }

  function installStyles() {
    if (document.getElementById("loc-canonical-nav-runtime")) return;
    const style = document.createElement("style");
    style.id = "loc-canonical-nav-runtime";
    style.textContent = `.workspace-sidebar,.sidebar{display:none!important}.runes-third-nav{display:none!important}.loc-global-search{display:flex!important;align-items:center;gap:6px}.loc-global-search-submit{min-height:34px;padding:5px 8px;border:1px solid rgba(180,158,255,.24);border-radius:8px;background:transparent;color:var(--muted,#b9bfd0);font:inherit;font-size:.8rem;cursor:pointer}`;
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

  function tier(level, items, label) {
    const nav = document.createElement("nav");
    nav.className = "loc-nav-tier";
    nav.dataset.tier = String(level);
    nav.setAttribute("aria-label", label);
    const inner = document.createElement("div");
    inner.className = "loc-nav-tier-inner";
    items.forEach(item => inner.appendChild(item));
    nav.appendChild(inner);
    return nav;
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
    host.append(
      tier(2,[link("LOC月典簡介","#top"),link("新手上路","#start"),link("LOC架構圖","#framework-map"),link("目前進度","#progress"),link("其他","#about-title")],"首頁快速選單"),
      tier(3,[link("月之符文模組","#framework-map"),link("脈絡","#framework-map"),link("音樂","#framework-map"),link("文字創作","#framework-map"),link("多媒體","#framework-map"),link("演算法","#framework-map"),link("演算模組","#framework-map"),link("推演引擎","#framework-map")],"LOC1–8 模組")
    );
  }

  function buildRunes(host) {
    const t2 = tier(2,[
      button("新手上路",{"data-runes-view":"beginner"}),
      button("占卜抽籤",{"data-runes-view":"draw"}),
      button("符文總覽",{"data-runes-view":"library"}),
      link("符文統計","statics.htm#runes"),
      button("符文知識庫",{"data-runes-view":"reference"})
    ],"月之符文功能");
    const t3 = tier(3,[],"月之符文第三層");
    host.append(t2,t3);

    const renderThird = mode => {
      const inner = t3.querySelector(".loc-nav-tier-inner");
      inner.replaceChildren();
      if (mode === "library") GROUPS.forEach(group => inner.appendChild(link(group,`runes.html?group=${encodeURIComponent(group)}#library`,{"data-rune-group-shortcut":group})));
      if (mode === "draw") [["單卡","single"],["每日","daily"],["雙卡","2card"],["三卡","3card"],["五卡","5card"],["11卡","ow3gs"]].forEach(([label,value]) => inner.appendChild(link(label,`runes.html?mode=${value}#draw`)));
      if (mode === "draw") inner.appendChild(link("說明","runes.html#draw-help"));
      t3.hidden = inner.children.length === 0;
    };
    renderThird(location.hash === "#library" ? "library" : "draw");
    t2.addEventListener("click", event => {
      const control = event.target.closest("[data-runes-view]");
      if (!control) return;
      const mode = control.dataset.runesView;
      renderThird(mode === "library" ? "library" : mode === "draw" ? "draw" : "");
    });
  }

  function buildContext(host) {
    host.appendChild(tier(2,[
      button("關係圖",{"data-context-switch":"graph"}),
      button("節點",{"data-context-switch":"nodes"}),
      button("關聯",{"data-context-switch":"edges"}),
      button("情境",{"data-context-switch":"scenarios"})
    ],"脈絡功能"));
  }

  function buildEvolution(host) {
    host.appendChild(tier(2,[
      button("時期",{"data-view":"overview"}),
      button("時間線",{"data-view":"timeline"}),
      button("趨勢",{"data-view":"trend"}),
      button("軌跡",{"data-view":"trajectory"})
    ],"推演功能"));
  }

  function buildStatics(host) {
    host.appendChild(tier(2,[link("排行榜","statics.htm#ranking"),link("符文統計","statics.htm#runes"),link("來源管理","statics.htm#sources"),link("匯入","statics.htm#import")],"統計功能"));
  }

  function buildTiers() {
    const host = getTierHost();
    if (!host) return;
    host.replaceChildren();
    const file = fileName();
    if (file === "index.html") buildIndex(host);
    else if (file === "runes.html") buildRunes(host);
    else if (file === "context.html") buildContext(host);
    else if (file === "evolution.html") buildEvolution(host);
    else if (file === "statics.htm" || file === "statics.html") buildStatics(host);
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
    if (file === "runes.html") appendScript("js/runes-pwa-ia.js","runes-pwa-ia");
    if (file === "evolution.html") appendScript("js/life-daily-draw-history.js","life-draw-history");
  }

  window.addEventListener("DOMContentLoaded", () => {
    installStyles();
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    cleanupContextGameEmbed();
    buildTiers();
    loadEnhancements();
    document.querySelectorAll(".workspace-sidebar,.sidebar").forEach(node => node.remove());
  });
})();
