(() => {
  if (window.LOCNav1) return;

  const ITEMS = Object.freeze([
    {id:"home",label:"首頁",href:"index.html"},
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"game",label:"遊戲",href:"game.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"evolution",label:"推演",href:"evolution.html"},
    {id:"governance",label:"治理",href:"governance.html"},
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
    "governance.html":"governance",
    "statics.htm":"statics",
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
    const brand='<span class="loc-global-brand">LOC月典</span>';

    const links=ITEMS.map(item => item.id===current
      ? `<span class="loc-global-link loc-global-current" aria-current="page">${esc(item.label)}</span>`
      : `<a class="loc-global-link" href="${esc(item.href)}">${esc(item.label)}</a>`
    ).join("");

    node.innerHTML=`${brand}<div class="loc-global-links">${links}<form class="loc-global-search" action="search.html" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="搜尋" /><button class="loc-global-search-submit" type="submit">搜尋</button></form></div>`;
  }

  function loadScript(src,key){
    if(document.querySelector(`script[data-${key}]`)) return;
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='true';
    document.body.appendChild(script);
  }

  function loadConceptNotes(){
    const file=fileName();
    if(!["governance.html","runes.html","lots.html","evolution.html"].includes(file)) return;
    loadScript('js/loc-concept-notes.js','loc-concept-notes');
  }

  function installAnchorGovernance(){
    if(document.getElementById('loc-anchor-governance')) return;
    const style=document.createElement('style');
    style.id='loc-anchor-governance';
    style.textContent='[id]{scroll-margin-top:64px}@media(max-width:720px){[id]{scroll-margin-top:58px}}';
    document.head.appendChild(style);
  }

  function mountAll(){
    document.querySelectorAll("[data-loc-nav]").forEach(render);
    installAnchorGovernance();
    loadScript('js/public-terminology.js','loc-public-terminology');
    loadConceptNotes();
  }

  window.LOCNav1 = Object.freeze({mountAll});
})();
