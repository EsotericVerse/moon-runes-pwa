(() => {
  const NAV_URL = "data/json/registries/LOC_NAV.json";

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
    if (file !== "projection.html") return;
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
      node.innerHTML = '<a class="loc-global-brand" href="index.html"><strong>LOC · 月典</strong><small>Luna Codex</small></a><div class="loc-global-links"><a class="loc-global-link" href="runes.html"><strong>月之符文</strong><small>66 符文圖鑑</small></a><a class="loc-global-link" href="context.html"><strong>脈絡</strong><small>LOC2 · Relation · Graph · 月符沙盒</small></a><a class="loc-global-link" href="search.html"><strong>綜合搜尋</strong><small>跨內容整合搜尋</small></a><a class="loc-global-link" href="projection.html"><strong>推演</strong><small>LOC8 · 每日符文 · ERA · Event · Trend</small></a></div>';
      console.warn(error);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-loc-nav]").forEach(renderNav);
    loadPageEnhancements();
  });
})();
