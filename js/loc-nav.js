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
    if (file === "evolution.html") appendScript("js/life-daily-draw-history.js", "life-draw-history");
    if (file === "runes.html") appendScript("js/runes-pwa-ia.js", "runes-pwa-ia");
    if (file === "context.html") cleanupContextGameEmbed();
  }

  const DEFAULT_NAV = [
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"search",label:"搜尋",href:"search.html"},
    {id:"game",label:"遊戲",href:"game.html"},
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
    originalChildren.forEach(node => body.appendChild(node));
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
      summary.textContent = [
        `搜尋資料｜${count} 筆`,
        dateText,
        categories.join(" / ")
      ].filter(Boolean).join(" · ");
    } catch (_) {
      summary.textContent = "搜尋資料｜點開查看總數、日期與來源";
    }
  }

  const TERMINOLOGY_REPLACEMENTS = [
    ["一套從月之符文與脈絡出發，延伸到音樂、文字創作、多媒體、方法論、演算法（知識庫）與時間推演的語言系統模型", "一套從細小語言單元出發，透過脈絡、作品、演算法與演算模組進行組織，並在時間中持續推演的語言模組框架"],
    ["系統分別處理月之符文與籤詩、脈絡、音樂、文字、多媒體、方法論、演算法，以及時間中的推演", "框架分別組織月之符文、脈絡、音樂、文字、多媒體、演算法、演算模組與推演引擎"],
    ["政德風是 方法論中的重要個人方法與治理案例", "政德風是人生演算法的一個治理面向"],
    ["它用來記錄個人語言、價值、界線、選擇與自我治理如何形成、變化與被重新檢視；它可以作為方法論實例，但不等同全部方法論", "它處理個人語言、價值、界線、選擇與自我治理如何被整理、檢查與修正；它是人生演算法中的治理面向，不等同人生演算法的全部"],
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

  function applyCurrentPageCopy() {
    const file = location.pathname.split("/").pop() || "index.html";

    if (file === "index.html") {
      const heroCopy = document.querySelector(".hero .loc-header-copy");
      if (heroCopy) {
        heroCopy.textContent = "月典是一套用來分析、整理、搜尋與推演語言的模組化框架。它從細小的語言單元開始，把文字、作品、脈絡、規則與時間組織起來，讓複雜內容可以更輕量地被理解、比較與重組。";
      }

      const progressHeadingCopy = document.querySelector('#current-progress .section-heading > p');
      if (progressHeadingCopy) {
        progressHeadingCopy.textContent = "目前已能從月之符文、作品與歷史文字資料出發，進行搜尋、統計、脈絡連結與時間比較；更深一層的符文語意分析與推演則建立在同一套資料結構上。";
      }

      const progressSection = document.getElementById("current-progress");
      if (progressSection && !document.getElementById("current-progress-summary")) {
        const summary = document.createElement("div");
        summary.id = "current-progress-summary";
        summary.className = "loc-note";
        summary.innerHTML = "<strong>目前進度：</strong> LunaRunes 66 符核心語意、分組與關鍵詞已完成校準；多元搜尋、關鍵字排行與資料來源追溯已可使用；Context／Graph 已能呈現資料之間的脈絡；曲風、標籤與其他明確欄位可直接統計，不需要 API；符文 RAG 的前置資料與語意規則已準備完成，後續可在這些基礎上進一步分析作品中的符文語意與群組分布。";
        const actions = progressSection.querySelector(".hero-actions, .start-actions");
        if (actions) progressSection.insertBefore(summary, actions);
        else progressSection.appendChild(summary);
      }

      const frameworkSection = document.getElementById("framework-map");
      if (frameworkSection && !document.getElementById("framework-bridge")) {
        const bridge = document.createElement("section");
        bridge.id = "framework-bridge";
        bridge.className = "section";
        bridge.setAttribute("aria-labelledby", "framework-bridge-title");
        bridge.innerHTML = `
          <div class="section-heading">
            <div>
              <p class="eyebrow">From Use to Structure</p>
              <h2 id="framework-bridge-title">從「可以做什麼」，再往下看「它怎麼做到」。</h2>
            </div>
          </div>
          <p style="margin:0;color:var(--loc-muted);max-width:900px;">前面的抽牌、搜尋、排行、脈絡與推演不是彼此獨立的功能。LOC 先把語言資料拆成較容易處理的單元，再依需要建立分類、關係與規則；成熟的處理規則可以進一步形成演算法與模組，讓不同資料使用相同方法，也能保留各自的差異。</p>
          <div class="loc-note"><strong>這是一套參考方法，不是世界的唯一答案。</strong> LOC 保持中立：它提供分類、組織、解析與推演的方法，但不預設某一套價值、信仰或分類必然正確。不同領域可以重新定義自己的單元、分組、關係與規則。</div>
        `;
        frameworkSection.parentNode.insertBefore(bridge, frameworkSection);
      }

      const frameworkCopy = document.querySelector("#framework-map .loc-header-copy");
      if (frameworkCopy) {
        frameworkCopy.textContent = "LOC 提供跨尺度、跨領域的分組框架建議。不同領域可以重新定義自己的單元、分類、關係與規則；這些分類與規則是分析參考，不是替世界建立唯一答案。框架讓複雜語言資料可以用較輕量、清楚的方式被組織與解析。";
      }

      const aboutTitle = document.getElementById("about-title");
      if (aboutTitle) {
        aboutTitle.textContent = "治理已知，是為了把時間還給未知。";
      }

      const aboutCopy = document.querySelector('[aria-labelledby="about-title"] > p');
      if (aboutCopy) {
        aboutCopy.textContent = "月典最初從月之符文開始，之後逐步形成脈絡、作品與多元體系、方法論、演算法與知識庫模組，整理為語言模型，再放回時間中持續推演。它不是為了把人生固定，也不是用一套分類替世界下定義，而是把散落、原本只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可重用，也能整理出風格並進一步推演的語言架構。";
      }
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    normalizeWebsiteTerminology();
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    renderBuildLabel();
    loadPageEnhancements();
    enhanceSearchSummary();
    setTimeout(applyCurrentPageCopy, 0);
  });
})();
