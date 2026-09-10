(() => {
  const NAV_URL = "data/json/registries/LOC_NAV.json";
  const WEB_BUILD = "0.6";

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  function currentId(node, items) {
    const explicit = node.dataset.page;
    if (explicit) return explicit;
    const file = location.pathname.split("/").pop() || "index.html";
    return items.find(item => item.href === file)?.id || "";
  }

  function loadPageEnhancements() {
    const file = location.pathname.split("/").pop() || "index.html";

    if (file === "evolution.html" && !document.querySelector('script[data-life-draw-history]')) {
      const script = document.createElement('script');
      script.src = 'js/life-daily-draw-history.js';
      script.defer = true;
      script.dataset.lifeDrawHistory = 'true';
      document.body.appendChild(script);
    }

    if (file === "search.html" && !document.querySelector('script[data-keyword-ranking-fetch-guard]')) {
      const script = document.createElement('script');
      script.src = 'js/keyword-ranking-fetch-guard.js';
      script.defer = true;
      script.dataset.keywordRankingFetchGuard = 'true';
      document.body.appendChild(script);
    }

    if (file === "search.html" && !document.querySelector('script[data-loc3-style-ranking]')) {
      const script = document.createElement('script');
      script.src = 'js/loc3-style-ranking.js';
      script.defer = true;
      script.dataset.loc3StyleRanking = 'true';
      document.body.appendChild(script);
    }

    if (file === "search.html" && !document.querySelector('script[data-km-concepts-search]')) {
      const script = document.createElement('script');
      script.src = 'js/km-concepts-search.js';
      script.defer = true;
      script.dataset.kmConceptsSearch = 'true';
      document.body.appendChild(script);
    }

    if (file === "search.html" && !document.querySelector('script[data-rune-frequency-ranking]')) {
      const script = document.createElement('script');
      script.src = 'js/rune-frequency-ranking.js';
      script.defer = true;
      script.dataset.runeFrequencyRanking = 'true';
      document.body.appendChild(script);
    }
  }

  const DEFAULT_NAV = [
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"game",label:"脈絡",href:"context.html"},
    {id:"search",label:"搜尋",href:"search.html"},
    {id:"evolution",label:"推演",href:"evolution.html"}
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

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    renderBuildLabel();
    loadPageEnhancements();
  });
})();
