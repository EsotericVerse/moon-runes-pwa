(() => {
  const NAV_URL = "data/json/registries/LOC_NAV.json";
  const WEB_BUILD = "0.5";

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  function currentId(node, items) {
    const file = location.pathname.split("/").pop() || "index.html";
    if (file === "context.html") return "context";
    if (file === "game.html" || file === "loc2-game.html") return "game";
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

  function renderBuildLabel() {
    document.querySelectorAll(".workspace-sidebar").forEach(sidebar => {
      if (sidebar.querySelector("[data-web-build]")) return;
      const label = document.createElement("div");
      label.dataset.webBuild = "true";
      label.textContent = "Web Build " + WEB_BUILD;
      label.style.marginTop = "14px";
      label.style.paddingTop = "10px";
      label.style.borderTop = "1px solid rgba(127,135,148,.18)";
      label.style.fontSize = "11px";
      label.style.letterSpacing = ".08em";
      label.style.opacity = ".58";
      label.style.textAlign = "center";
      sidebar.appendChild(label);
    });
  }

  async function enhanceSearchSummary() {
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

    try {
      const response = await fetch("data/json/generated/search/SEARCH_SOURCE_STATS.json", { cache: "no-store" });
      if (!response.ok) throw new Error("stats unavailable");
      const data = await response.json();
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
    } catch (_) {
      summary.textContent = "搜尋資料｜點開查看總數、日期與來源";
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    renderBuildLabel();
    loadPageEnhancements();
    enhanceSearchSummary();
  });
})();
