(() => {
  const NAV_URL = "data/shared/LOC_NAV.json";

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
    if (file !== "life.html") return;
    if (document.querySelector('script[data-life-draw-history]')) return;

    const script = document.createElement('script');
    script.src = 'js/life-daily-draw-history.js';
    script.defer = true;
    script.dataset.lifeDrawHistory = 'true';
    document.body.appendChild(script);
  }

  async function renderNav(node) {
    try {
      const response = await fetch(NAV_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("LOC nav unavailable");
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const active = currentId(node, items);
      const brand = data.brand || {};

      node.innerHTML = `
        <a class="loc-global-brand" href="${esc(brand.href || "index.html")}">
          <strong>${esc(brand.label || "LOC · 月典")}</strong>
          <small>${esc(brand.subtitle || "Luna Codex")}</small>
        </a>
        <div class="loc-global-links">
          ${items.map(item => `
            <a class="loc-global-link" href="${esc(item.href)}"${item.id === active ? ' aria-current="page"' : ""}>
              <strong>${esc(item.label)}</strong>
              <small>${esc(item.description || "")}</small>
            </a>
          `).join("")}
        </div>
      `;
    } catch (error) {
      node.innerHTML = '<a class="loc-global-brand" href="index.html"><strong>LOC · 月典</strong><small>回到首頁</small></a>';
      console.warn(error);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    loadPageEnhancements();
  });
})();
