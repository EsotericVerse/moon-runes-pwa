(() => {
  if (window.LOCNav1) return;

  const ITEMS = Object.freeze([
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"game",label:"遊戲",href:"game.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"evolution",label:"推演",href:"evolution.html"},
    {id:"statics",label:"統計",href:"statics.htm"}
  ]);

  const PAGE_GROUP = Object.freeze({
    "index.html":"home",
    "lots.html":"runes",
    "runes.html":"runes",
    "game.html":"game",
    "loc2-game.html":"game",
    "context.html":"context",
    "evolution.html":"evolution",
    "statics.htm":"statics",
    "statics.html":"statics",
    "search.html":"search"
  });

  const fileName = () => location.pathname.split("/").pop() || "index.html";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function currentGroup(node){
    const file=fileName();
    return PAGE_GROUP[file] || node?.dataset?.page || "";
  }

  function render(node){
    const current=currentGroup(node);
    const brand=current==="home"
      ? '<span class="loc-global-brand loc-global-current" aria-current="page">LOC月典</span>'
      : '<a class="loc-global-brand" href="index.html" aria-label="回到 LOC月典首頁">LOC月典</a>';

    const links=ITEMS.map(item => item.id===current
      ? `<span class="loc-global-link loc-global-current" aria-current="page">${esc(item.label)}</span>`
      : `<a class="loc-global-link" href="${esc(item.href)}">${esc(item.label)}</a>`
    ).join("");

    node.innerHTML=`${brand}<div class="loc-global-links">${links}<form class="loc-global-search" action="search.html" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋" /><button class="loc-global-search-submit" type="submit">搜尋</button></form></div>`;
  }

  function mountAll(){
    document.querySelectorAll("[data-loc-nav]").forEach(render);
  }

  window.LOCNav1 = Object.freeze({mountAll});
})();
