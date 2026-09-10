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
        heroCopy.textContent = "語言除了傳達，也用來記錄人存在於世界中的資料。LOC 是 lo3rwang 的 Language Module Framework／語言模組框架，提供分組與模組化方法，讓這些語言資料更容易被分類、解析、組織與推演。";
      }

      const frameworkCopy = document.querySelector("#framework-map .loc-header-copy");
      if (frameworkCopy) {
        frameworkCopy.textContent = "LOC 提供跨尺度、跨領域的分組框架建議。不同領域可以重新定義自己的單元、分類、關係與規則；框架不要求外部資料服從 LunaRunes 的 66 符或八組結構，而是讓複雜語言資料可以用較輕量、清楚的方式被組織與解析。";
      }

      const aboutTitle = document.getElementById("about-title");
      if (aboutTitle) {
        aboutTitle.textContent = "治理已知，是為了把時間還給未知。";
      }

      const aboutCopy = document.querySelector('[aria-labelledby="about-title"] > p');
      if (aboutCopy) {
        aboutCopy.textContent = "月典最初從月之符文開始，之後逐步形成脈絡、作品與多元體系、方法論、演算法（知識庫）與時間中的推演。它不是為了把人生固定，而是把散落、原本只能靠直覺掌握的語言與經驗，整理成可回看、可搜尋、可重用的結構。";
      }
    }

    if (file === "lo3rwang.html") {
      const headings = [...document.querySelectorAll("h2")];
      const workHeading = headings.find(node => node.textContent.includes("他主要在做什麼"));
      if (workHeading) {
        const first = workHeading.nextElementSibling;
        const second = first?.nextElementSibling;
        if (first?.tagName === "P") {
          first.innerHTML = "主要工作重心不是單純的社群內容創作，而是建立與整理 <strong>LOC／月典（Luna Codex）</strong>。LOC 是 lo3rwang 的數位思想資產與 <strong>Language Module Framework／語言模組框架</strong>，把長期累積的分類方式、語言結構、符文系統、脈絡判讀、演算法與推演方法整理成可重複使用的框架。";
        }
        if (second?.tagName === "P") {
          second.textContent = "語言除了傳達，也用來記錄人存在於世界中的資料。LOC 提供分組與模組化方法，讓作品、生活文字、事件、關係與其他語言資料更容易被分類、解析、組織與推演。";
        }
      }

      const locHeading = headings.find(node => node.textContent.trim() === "LOC／月典");
      if (locHeading) {
        const first = locHeading.nextElementSibling;
        const second = first?.nextElementSibling;
        if (first?.tagName === "P") {
          first.innerHTML = "LOC 是 <strong>Language Module Framework／語言模組框架</strong>。它提供跨尺度、跨領域的分類、組織、解析與推演參考；不同領域可以依自己的資料重新定義單元、分組、關係與規則。";
        }
        if (second?.tagName === "P") {
          second.textContent = "LOC 提供的是框架，不強迫外部資料服從 LunaRunes 的 66 符或八組結構。LunaRunes 是其中最完整、最具體的實證案例之一。";
        }
      }
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    normalizeWebsiteTerminology();
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    renderBuildLabel();
    loadPageEnhancements();
    setTimeout(applyCurrentPageCopy, 0);
  });
})();
