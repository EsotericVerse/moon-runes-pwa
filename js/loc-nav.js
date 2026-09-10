(() => {
  const NAV_URL = "data/json/registries/LOC_NAV.json";
  const WEB_BUILD = "0.7";
  const GROUPS = ["靈魂", "連結", "生命", "自然", "礦物", "元素", "秩序", "無序", "特殊"];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  function fileName() { return location.pathname.split("/").pop() || "index.html"; }

  function currentId(node, items) {
    const file = fileName();
    if (file === "context.html") return "context";
    if (file === "game.html" || file === "loc2-game.html") return "game";
    if (file === "statics.htm" || file === "statics.html") return "statics";
    const explicit = node.dataset.page;
    if (explicit) return explicit;
    return items.find(item => item.href === file)?.id || "";
  }

  function appendScript(src, datasetKey) {
    if (document.querySelector(`script[data-${datasetKey}]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset[datasetKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = "true";
    document.body.appendChild(script);
  }

  function installCanonicalNavStyles() {
    if (document.getElementById("loc-canonical-nav-runtime")) return;
    const style = document.createElement("style");
    style.id = "loc-canonical-nav-runtime";
    style.textContent = `
      .workspace-sidebar,.sidebar{display:none!important}
      .runes-third-nav{display:none!important}
      .loc-global-search{display:flex!important;align-items:center;gap:6px}
      .loc-global-search-submit{min-height:34px;padding:5px 8px;border:1px solid rgba(180,158,255,.24);border-radius:8px;background:transparent;color:var(--muted,#b9bfd0);font:inherit;font-size:.8rem;cursor:pointer}
      .loc-global-search-submit:hover,.loc-global-search-submit:focus-visible{color:var(--text,#f5f1ff);border-color:var(--gold,#e7c27d);outline:none}
    `;
    document.head.appendChild(style);
  }

  const DEFAULT_NAV = [
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"game",label:"遊戲",href:"game.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"evolution",label:"推演",href:"evolution.html"},
    {id:"statics",label:"統計",href:"statics.htm"}
  ];

  function paintNav(node, items = DEFAULT_NAV) {
    const active = currentId(node, items);
    node.innerHTML = `
      <a class="loc-global-brand" href="index.html" aria-label="回到 LOC月典首頁">LOC月典</a>
      <div class="loc-global-links">
        ${items.filter(item => item.id !== "search").map(item => `<a class="loc-global-link" href="${esc(item.href)}"${item.id === active ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`).join("")}
        <form class="loc-global-search" action="search.html" method="get" role="search">
          <input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋" />
          <button class="loc-global-search-submit" type="submit">搜尋</button>
        </form>
      </div>`;
  }

  async function renderNav(node) {
    paintNav(node);
    try {
      const response = await fetch(NAV_URL, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const items = Array.isArray(data.items) && data.items.length ? data.items : DEFAULT_NAV;
      paintNav(node, items);
    } catch (error) { console.warn(error); }
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

  function tier(level, items = [], label) {
    const nav = document.createElement("nav");
    nav.className = "loc-nav-tier";
    nav.dataset.tier = String(level);
    nav.setAttribute("aria-label", label || `第${level}層導覽`);
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
    Object.entries(attrs).forEach(([key, value]) => { if (key.startsWith("data-")) a.setAttribute(key, value); });
    return a;
  }

  function relabelControl(control, label) {
    if (!control) return null;
    control.classList.remove("workspace-switch", "view-switch", "active");
    control.classList.add("loc-nav-tier-link");
    control.replaceChildren(document.createTextNode(label));
    return control;
  }

  function firstControl(selectors, fallbackIndex = -1) {
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found) return found;
    }
    if (fallbackIndex >= 0) {
      const controls = [...document.querySelectorAll(".workspace-sidebar button,.workspace-sidebar a,.sidebar button,.sidebar a")];
      return controls[fallbackIndex] || null;
    }
    return null;
  }

  function buildIndexTiers(host) {
    host.append(
      tier(2, [link("LOC月典簡介", "#top"),link("新手上路", "#start"),link("LOC架構圖", "#framework-map"),link("目前進度", "#progress"),link("其他", "#about-title")], "首頁快速選單"),
      tier(3, [link("月之符文模組", "#framework-map"),link("脈絡", "#framework-map"),link("音樂", "#framework-map"),link("文字創作", "#framework-map"),link("多媒體", "#framework-map"),link("演算法", "#framework-map"),link("演算模組", "#framework-map"),link("推演引擎", "#framework-map")], "LOC1–8 模組")
    );
  }

  function buildRunesTiers(host) {
    const beginner = document.createElement("button");
    beginner.type = "button";
    beginner.dataset.runesView = "beginner";
    relabelControl(beginner, "新手上路");
    const draw = relabelControl(firstControl(['[data-runes-view="draw"]'], 0), "占卜抽籤") || link("占卜抽籤", "runes.html#draw");
    const library = relabelControl(firstControl(['[data-runes-view="library"]']), "符文總覽") || link("符文總覽", "runes.html#library");
    const reference = relabelControl(firstControl(['[data-runes-view="reference"]']), "符文知識庫") || link("符文知識庫", "runes.html#reference");
    const t2 = tier(2, [beginner, draw, library, link("符文統計", "statics.htm#runes"), reference], "月之符文功能");
    const t3 = tier(3, [], "月之符文第三層");
    host.append(t2, t3);

    const renderThird = mode => {
      const inner = t3.querySelector(".loc-nav-tier-inner");
      inner.replaceChildren();
      if (mode === "library") {
        GROUPS.forEach(group => inner.appendChild(link(group, `runes.html?group=${encodeURIComponent(group)}#library`, {"data-rune-group-shortcut":group})));
      } else if (mode === "draw") {
        [["單卡","single"],["每日","daily"],["雙卡","2card"],["三卡","3card"],["五卡","5card"],["11卡","ow3gs"]].forEach(([labelText,value]) => inner.appendChild(link(labelText, `runes.html?mode=${value}#draw`)));
        inner.appendChild(link("說明", "runes.html#draw-help"));
      }
      t3.hidden = inner.children.length === 0;
    };
    renderThird(location.hash === "#library" ? "library" : "draw");
    t2.addEventListener("click", event => {
      const control = event.target.closest("[data-runes-view]");
      if (!control) return;
      renderThird(control.dataset.runesView === "library" ? "library" : control.dataset.runesView === "draw" ? "draw" : "");
    });
  }

  function buildContextTier(host) {
    const controls = [
      ["關係圖", ['[data-context-switch="graph"]']],
      ["節點", ['[data-context-switch="nodes"]']],
      ["關聯", ['[data-context-switch="edges"]','[data-context-switch="relations"]']],
      ["情境", ['[data-context-switch="scenarios"]','[data-context-switch="scenario"]','[data-context-switch="context"]']]
    ].map(([labelText, selectors], index) => relabelControl(firstControl(selectors, index), labelText) || link(labelText, `context.html#${index}`));
    host.appendChild(tier(2, controls, "脈絡功能"));
  }

  function buildEvolutionTier(host) {
    const controls = [["時期",'[data-view="overview"]'],["時間線",'[data-view="timeline"]'],["趨勢",'[data-view="trend"]'],["軌跡",'[data-view="trajectory"]']].map(([labelText,selector],index) => relabelControl(firstControl([selector],index),labelText) || link(labelText,`evolution.html#${labelText}`));
    host.appendChild(tier(2, controls, "推演功能"));
  }

  function buildStaticsTier(host) {
    host.appendChild(tier(2, [link("排行榜","statics.htm#ranking"),link("符文統計","statics.htm#runes"),link("來源管理","statics.htm#sources"),link("匯入","statics.htm#import")], "統計功能"));
  }

  function removeLegacySidebars() { document.querySelectorAll(".workspace-sidebar,.sidebar").forEach(sidebar => sidebar.remove()); }

  function buildCanonicalTiers() {
    const host = getTierHost();
    if (!host) return;
    host.replaceChildren();
    const file = fileName();
    if (file === "index.html") buildIndexTiers(host);
    else if (file === "runes.html") buildRunesTiers(host);
    else if (file === "context.html") buildContextTier(host);
    else if (file === "evolution.html") buildEvolutionTier(host);
    else if (file === "statics.htm" || file === "statics.html") buildStaticsTier(host);
    removeLegacySidebars();
  }

  function cleanupContextGameEmbed() {
    if (fileName() !== "context.html") return;
    const frame = document.querySelector('.game-frame');
    const view = frame?.closest('[data-context-view]');
    if (view) view.remove();
    else { document.querySelector('.game-frame-wrap')?.remove(); document.querySelector('.game-open')?.remove(); }
    document.querySelectorAll('a[href="loc2-game.html"]').forEach(a => { a.href = "game.html"; a.removeAttribute("target"); a.removeAttribute("rel"); });
  }

  function loadPageEnhancements() {
    const file = fileName();
    if (file === "index.html") appendScript("js/home-canonical.js", "home-canonical");
    if (file === "evolution.html") appendScript("js/life-daily-draw-history.js", "life-draw-history");
    if (file === "runes.html") appendScript("js/runes-pwa-ia.js", "runes-pwa-ia");
    if (file === "context.html") cleanupContextGameEmbed();
  }

  function enhanceSearchSummary() {
    if (fileName() !== "search.html") return;
    const queryView = document.getElementById("queryView");
    const sourceStats = document.getElementById("sourceStats");
    const searchPanel = queryView?.querySelector(".search-panel");
    if (!queryView || !sourceStats || !searchPanel || sourceStats.dataset.pwaSummary === "true") return;
    sourceStats.dataset.pwaSummary = "true";
    queryView.insertBefore(sourceStats, searchPanel);
  }

  window.addEventListener("DOMContentLoaded", () => {
    installCanonicalNavStyles();
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    cleanupContextGameEmbed();
    buildCanonicalTiers();
    loadPageEnhancements();
    enhanceSearchSummary();
  });
})();
