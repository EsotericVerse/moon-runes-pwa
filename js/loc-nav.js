(() => {
  const NAV_URL = "data/json/registries/LOC_NAV.json";
  const WEB_BUILD = "0.7";

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  }

  function currentId(node, items) {
    const explicit = node.dataset.page;
    if (explicit) return explicit;
    const file = location.pathname.split("/").pop() || "index.html";
    return items.find(item => item.href === file)?.id || "";
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
        ${items.map(item => `<a class="loc-global-link" href="${esc(item.href)}"${item.id === active ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`).join("")}
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

  function addWorkspaceLink(sidebar,label,href,small){
    const nav=sidebar?.querySelector('.workspace-nav,.nav');
    if(!nav||nav.querySelector(`a[href="${href}"]`))return;
    const group=document.createElement('div');
    group.className=nav.classList.contains('workspace-nav')?'workspace-nav-group':'nav-group';
    group.innerHTML=nav.classList.contains('workspace-nav')
      ? `<div class="workspace-nav-label">工具</div><a class="workspace-switch" style="text-decoration:none" href="${href}"><strong>${label}</strong><small>${small}</small></a>`
      : `<div class="nav-label">工具</div><a href="${href}"><strong>${label}</strong><small>${small}</small></a>`;
    nav.appendChild(group);
  }

  function pruneSearchWorkspace(){
    const file=location.pathname.split('/').pop()||'index.html';
    if(file!=="search.html")return;
    document.querySelectorAll('[data-search-view]').forEach(btn=>{
      if(btn.dataset.searchView!=='query') btn.closest('.workspace-nav-group')?.remove();
    });
    ['eraView','rankingView','sourcesView'].forEach(id=>document.getElementById(id)?.remove());
    const sidebar=document.querySelector('.workspace-sidebar');
    addWorkspaceLink(sidebar,'統計與資料','statics.html#ranking','排行榜 · 時期 · 來源 · 時間線');
    const foot=sidebar?.querySelector('.workspace-foot');
    if(foot)foot.textContent='Search 只負責跨資料搜尋；統計、時期與來源管理已移至獨立 Statics。';
  }

  function routeEvolutionTimeline(){
    const file=location.pathname.split('/').pop()||'index.html';
    if(file!=="evolution.html")return;
    const btn=document.querySelector('[data-view="timeline"]');
    if(btn){
      const group=btn.closest('.nav-group');
      if(group){
        const link=document.createElement('a');
        link.className='view-switch';
        link.href='statics.html#timeline';
        link.style.textDecoration='none';
        link.innerHTML='<strong>時間線</strong><small>事件 · 新增 · 編輯 · 刪除</small>';
        btn.replaceWith(link);
      }
    }
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
    if (file === "search.html" && !document.querySelector('script[data-km-concepts-search]')) {
      const script = document.createElement('script');
      script.src = 'js/km-concepts-search.js';
      script.defer = true;
      script.dataset.kmConceptsSearch = 'true';
      document.body.appendChild(script);
    }
  }

  function renderBuildLabel() {
    document.querySelectorAll(".workspace-sidebar,.sidebar").forEach(sidebar => {
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
    pruneSearchWorkspace();
    routeEvolutionTimeline();
    renderBuildLabel();
    loadPageEnhancements();
  });
})();