(() => {
  const NAV_URL = "data/json/registries/LOC_NAV.json";
  const WEB_BUILD = "0.6";

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  function currentId(node, items) {
    const file = location.pathname.split("/").pop() || "index.html";
    if (file === "context.html") return "context";
    if (file === "game.html" || file === "loc2-game.html") return "game";
    if (file === "search.html" && location.hash === "#rankingView") return "statics";
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

  function cleanupContextGameEmbed() {
    if ((location.pathname.split("/").pop() || "") !== "context.html") return;
    document.querySelector('[data-context-switch="sandbox-game"]')?.closest('.workspace-nav-group')?.remove();
    const frame = document.querySelector('.game-frame');
    const view = frame?.closest('[data-context-view]');
    if (view) view.remove();
    else {
      document.querySelector('.game-frame-wrap')?.remove();
      document.querySelector('.game-open')?.remove();
    }
    document.querySelectorAll('a[href="loc2-game.html"]').forEach(a => {
      a.href = "game.html";
      a.removeAttribute("target");
      a.removeAttribute("rel");
    });
  }

  function loadPageEnhancements() {
    const file = location.pathname.split("/").pop() || "index.html";
    if (file === "index.html") appendScript("js/home-canonical.js", "home-canonical");
    if (file === "evolution.html") appendScript("js/life-daily-draw-history.js", "life-draw-history");
    if (file === "runes.html") appendScript("js/runes-pwa-ia.js", "runes-pwa-ia");
    if (file === "context.html") cleanupContextGameEmbed();
  }

  const DEFAULT_NAV = [
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"game",label:"遊戲",href:"game.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"evolution",label:"推演",href:"evolution.html"},
    {id:"statics",label:"統計",href:"search.html#rankingView"},
    {id:"search",label:"搜尋",href:"search.html"}
  ];

  function paintNav(node, items = DEFAULT_NAV) {
    const active = currentId(node, items);
    node.innerHTML = `
      <a class="loc-global-brand" href="index.html" aria-label="回到 LOC月典首頁">LOC月典</a>
      <div class="loc-global-links">
        ${items.map(item => `
          <a class="loc-global-link" href="${esc(item.href)}"${item.id === active ? ' aria-current="page"' : ""}>
            ${esc(item.label)}
          </a>
        `).join("")}
        <form class="loc-global-search" action="search.html" method="get" role="search">
          <input name="q" type="search" aria-label="搜尋" placeholder="搜尋" />
        </form>
      </div>
    `;
  }

  async function renderNav(node) {
    paintNav(node);
    try {
      const response = await fetch(NAV_URL, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const items = Array.isArray(data.items) && data.items.length ? data.items : DEFAULT_NAV;
      paintNav(node, items);
    } catch (error) {
      console.warn(error);
    }
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

  function promoteWorkspaceNav() {
    const host = getTierHost();
    if (!host) return;

    const sidebars = [...document.querySelectorAll(".workspace-sidebar, .sidebar")];
    const moved = new Set();

    sidebars.forEach(sidebar => {
      const nav = sidebar.querySelector(".workspace-nav, .nav");
      if (!nav || moved.has(nav)) return;
      moved.add(nav);

      const tier = document.createElement("nav");
      tier.className = "loc-nav-tier";
      tier.dataset.tier = "2";
      tier.setAttribute("aria-label", nav.getAttribute("aria-label") || "頁面功能導覽");

      nav.classList.add("loc-nav-tier-inner");
      nav.querySelectorAll(".workspace-nav-label,.nav-label").forEach(label => label.remove());
      nav.querySelectorAll(".workspace-switch,.view-switch,a,button").forEach(control => {
        control.classList.add("loc-nav-tier-link");
        const strong = control.querySelector("strong");
        if (strong) {
          const text = strong.textContent.trim();
          control.replaceChildren(document.createTextNode(text));
        } else {
          control.querySelectorAll("small").forEach(small => small.remove());
        }
      });

      tier.appendChild(nav);
      host.appendChild(tier);
    });
  }

  function addIndexTiers() {
    const file = location.pathname.split("/").pop() || "index.html";
    if (file !== "index.html") return;
    const host = getTierHost();
    if (!host || host.querySelector('[data-page-tier="index"]')) return;

    const tier2 = document.createElement("nav");
    tier2.className = "loc-nav-tier";
    tier2.dataset.tier = "2";
    tier2.dataset.pageTier = "index";
    tier2.innerHTML = `<div class="loc-nav-tier-inner">
      <a class="loc-nav-tier-link" href="#top">LOC月典簡介</a>
      <a class="loc-nav-tier-link" href="#start">新手上路</a>
      <a class="loc-nav-tier-link" href="#framework-map">LOC架構圖</a>
      <a class="loc-nav-tier-link" href="#progress">目前進度</a>
      <a class="loc-nav-tier-link" href="#about-title">其他</a>
    </div>`;

    const tier3 = document.createElement("nav");
    tier3.className = "loc-nav-tier";
    tier3.dataset.tier = "3";
    tier3.innerHTML = `<div class="loc-nav-tier-inner">
      <a class="loc-nav-tier-link" href="#rune-entry">月之符文模組</a>
      <a class="loc-nav-tier-link" href="#language-evolution">脈絡</a>
      <a class="loc-nav-tier-link" href="#language-evolution">音樂</a>
      <a class="loc-nav-tier-link" href="#language-evolution">文字創作</a>
      <a class="loc-nav-tier-link" href="#language-evolution">多媒體</a>
      <a class="loc-nav-tier-link" href="#language-evolution">演算法</a>
      <a class="loc-nav-tier-link" href="#language-evolution">演算模組</a>
      <a class="loc-nav-tier-link" href="#language-evolution">推演引擎</a>
    </div>`;
    host.append(tier2, tier3);
  }

  function enhanceSearchSummary() {
    const file = location.pathname.split("/").pop() || "index.html";
    if (file !== "search.html") return;
    const queryView = document.getElementById("queryView");
    const sourceStats = document.getElementById("sourceStats");
    const searchPanel = queryView?.querySelector(".search-panel");
    if (!queryView || !sourceStats || !searchPanel || sourceStats.dataset.pwaSummary === "true") return;

    sourceStats.dataset.pwaSummary = "true";
    queryView.insertBefore(sourceStats, searchPanel);
    const originalChildren = Array.from(sourceStats.childNodes);
    const details = document.createElement("details");
    details.className = "source-stats-pwa-details";
    const summary = document.createElement("summary");
    summary.className = "source-stats-pwa-summary";
    summary.textContent = "搜尋資料｜載入中…";
    const body = document.createElement("div");
    body.className = "source-stats-pwa-body";
    originalChildren.forEach(child => body.appendChild(child));
    details.append(summary, body);
    sourceStats.appendChild(details);

    fetch("data/json/generated/search/SEARCH_SOURCE_STATS.json", { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("stats unavailable");
        return response.json();
      })
      .then(data => {
        const count = Number(data?.search_summary?.comparable_records || data?.text_summary?.searchable_records || 0).toLocaleString("zh-TW");
        const start = data?.text_summary?.start_date || "";
        const end = data?.text_summary?.end_date || "";
        const categories = [];
        const textSources = data?.text_sources || [];
        const mediaSources = data?.media_sources || [];
        if (textSources.some(item => item?.source_type !== "lyrics")) categories.push("文字");
        if (textSources.some(item => item?.source_type === "lyrics")) categories.push("音樂");
        if (mediaSources.length) categories.push("多媒體");
        if (Number(data?.knowledge_summary?.knowledge_document_records || 0) > 0) categories.push("知識");
        const dateText = start && end ? `${start}–${end}` : (start || end);
        summary.textContent = [`搜尋資料｜${count} 筆`, dateText, categories.join(" / ")].filter(Boolean).join(" · ");
      })
      .catch(() => { summary.textContent = "搜尋資料｜點開查看總數、日期與來源"; });
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    cleanupContextGameEmbed();
    promoteWorkspaceNav();
    addIndexTiers();
    loadPageEnhancements();
    enhanceSearchSummary();
  });
})();
