(() => {
  const NAV_URL = "data/json/registries/LOC_NAV.json";
  const WEB_BUILD = "0.5";

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
    if (file !== "evolution.html") return;
    if (document.querySelector('script[data-life-draw-history]')) return;

    const script = document.createElement('script');
    script.src = 'js/life-daily-draw-history.js';
    script.defer = true;
    script.dataset.lifeDrawHistory = 'true';
    document.body.appendChild(script);
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

  const TERMINOLOGY_REPLACEMENTS = [
    ["一套從月之符文與脈絡出發，延伸到音樂、文字創作、多媒體、方法論、演算法（知識庫）與時間推演的語言系統模型", "一套從細小語言單元出發，透過脈絡、作品、演算法與演算模組進行組織，並在時間中持續推演的語言模組框架"],
    ["系統分別處理月之符文與籤詩、脈絡、音樂、文字、多媒體、方法論、演算法，以及時間中的推演", "框架分別組織月之符文、脈絡、音樂、文字、多媒體、演算法、演算模組與推演引擎"],
    ["政德風是 方法論中的重要個人方法與治理案例", "政德風是治理中的重要個人語言案例"],
    ["它可以作為方法論實例，但不等同全部方法論", "它可以作為治理實例，但不等同全部治理方法"],
    ["LOC1–8 只作方便分類與說明，不構成它的階級歸屬", "LOC1–8 是 LOC 的模組架構；德之符文作為治理錨點，不歸入其中任何一個模組"],
    ["公開 UI 不需要反覆暴露內部 LOC 編號；編號主要作為資料治理識別", "LOC1–8 是框架的模組結構；公開 UI 依閱讀情境顯示模組名稱與編號"],
    ["方法論、演算法（知識庫）與時間推演", "演算法、演算模組與推演引擎"],
    ["LOC6 · Methodology", "LOC6 · Algorithm"],
    ["LOC7 · Algorithm", "LOC7 · Module"],
    ["Methodology／方法論", "Algorithm／演算法"],
    ["Algorithm／演算法（知識庫）", "Module／演算模組"],
    ["Evolution／推演", "Evolution／推演引擎"],
    ["Language System Model", "Language Module Framework"],
    ["語言系統模型", "語言模組框架"],
    ["MultiMedia", "Multimedia"]
  ];

  function normalizeTerminology(value) {
    let next = String(value ?? "");
    TERMINOLOGY_REPLACEMENTS.forEach(([from, to]) => {
      next = next.split(from).join(to);
    });
    return next;
  }

  function normalizeWebsiteTerminology() {
    document.title = normalizeTerminology(document.title);
    document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]').forEach(node => {
      if (node.content) node.content = normalizeTerminology(node.content);
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script,style,noscript,textarea")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const next = normalizeTerminology(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    normalizeWebsiteTerminology();
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    renderBuildLabel();
    loadPageEnhancements();
  });
})();
