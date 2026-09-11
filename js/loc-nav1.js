(() => {
  if (window.LOCNav1) return;

  const ITEMS = Object.freeze([
    {id:"runes",label:"月之符文",href:"runes.html"},
    {id:"game",label:"遊戲",href:"game.html"},
    {id:"context",label:"脈絡",href:"context.html"},
    {id:"governance",label:"治理",href:"governance.html"},
    {id:"statics",label:"統計",href:"statics.html"},
    {id:"evolution",label:"推演",href:"evolution.html"}
  ]);

  const PAGE_GROUP = Object.freeze({
    "index.html":"home",
    "lots.html":"runes",
    "runes.html":"runes",
    "game.html":"game",
    "context.html":"context",
    "evolution.html":"evolution",
    "governance.html":"governance",
    "statics.html":"statics",
    "search.html":"search",
    "lo3rwang.html":"author"
  });

  const fileName = () => location.pathname.split("/").pop() || "index.html";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function currentGroup(node){
    const file=fileName();
    return PAGE_GROUP[file] || node?.dataset?.page || "";
  }

  function render(node){
    const current=currentGroup(node);
    const links=ITEMS.map(item => item.id===current
      ? `<span class="loc-global-link loc-global-current" aria-current="page">${esc(item.label)}</span>`
      : `<a class="loc-global-link" href="${esc(item.href)}">${esc(item.label)}</a>`
    ).join("");
    const search=`<form class="loc-global-search" action="search.html" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字" /><button class="loc-global-search-submit" type="submit">搜尋</button></form>`;
    const home=current==="home"?"":'<a class="loc-global-home" href="index.html">回月典首頁</a>';
    node.innerHTML=`<div class="loc-global-links">${links}</div>${search}${home}`;
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

  function loadRuneDisplayGovernance(){
    const file=fileName();
    if(!["index.html","runes.html","lots.html","search.html"].includes(file)) return;
    loadScript('js/rune-display-governance.js','loc-rune-display-governance');
  }

  function loadSearchDisplayGovernance(){
    if(fileName()!=="search.html") return;
    loadScript('js/search-display-governance.js','loc-search-display-governance');
  }

  function mountAll(){
    document.querySelectorAll("[data-loc-nav]").forEach(render);
    loadScript('js/public-terminology.js','loc-public-terminology');
    loadScript('js/nav-current.js','loc-nav-current');
    loadConceptNotes();
    loadRuneDisplayGovernance();
    loadSearchDisplayGovernance();
  }

  window.LOCNav1 = Object.freeze({mountAll});
})();