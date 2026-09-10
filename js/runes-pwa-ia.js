(() => {
  if (window.__LOC_RUNES_PWA_IA__) return;
  window.__LOC_RUNES_PWA_IA__ = true;

  const GROUPS = ["靈魂", "連結", "生命", "自然", "礦物", "元素", "秩序", "無序", "特殊"];
  const DRAW_MODES = [
    ["daily", "每日"],
    ["single", "單卡"],
    ["2card", "雙卡"],
    ["3card", "三卡"],
    ["5card", "五卡"]
  ];

  function addStyles() {
    if (document.getElementById("runes-pwa-ia-style")) return;
    const style = document.createElement("style");
    style.id = "runes-pwa-ia-style";
    style.textContent = `
      #draw-mode-selector{display:none!important}
      .runes-third-nav{display:flex;align-items:center;gap:7px;overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin:0 0 14px;padding:8px;border:1px solid var(--line);border-radius:14px;background:rgba(11,27,49,.58)}
      .runes-third-nav::-webkit-scrollbar{display:none}
      .runes-third-nav-label{flex:0 0 auto;color:var(--muted);font-size:.7rem;font-weight:800;letter-spacing:.08em;padding:0 4px}
      .runes-third-link{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:7px 11px;border:1px solid transparent;border-radius:10px;color:var(--muted);background:transparent;text-decoration:none;font-size:.78rem;font-weight:800;white-space:nowrap;cursor:pointer}
      .runes-third-link:hover,.runes-third-link:focus-visible,.runes-third-link.active{color:var(--text);border-color:var(--line);background:rgba(180,158,255,.1);outline:none}
      .runes-third-link[aria-disabled="true"]{opacity:.48;pointer-events:none}
      .runes-beginner-shell{padding-bottom:24px}
      .runes-beginner-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}
      .runes-beginner-action{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:8px 12px;border:1px solid var(--line);border-radius:999px;color:var(--text);text-decoration:none;font-size:.78rem;font-weight:800;background:rgba(255,255,255,.03)}
      .runes-beginner-action.primary{background:linear-gradient(135deg,#c7b7ff,#e8c57f);color:#171021;border:0}
      .runes-beginner-deck{display:grid;gap:20px}
      .beginner-slide{position:relative;min-height:clamp(360px,52vw,650px);overflow:hidden;border:1px solid var(--line);border-radius:20px;background:radial-gradient(circle at 80% 12%,rgba(78,190,255,.12),transparent 25%),radial-gradient(circle at 18% 80%,rgba(55,109,164,.16),transparent 30%),linear-gradient(135deg,#09233f 0%,#06182d 68%,#03101f 100%)}
      .beginner-slide:before{content:"☾";position:absolute;left:4%;top:3%;font-size:clamp(2.4rem,6vw,6rem);color:var(--gold);opacity:.95}.beginner-slide:after{content:"✦  ✦  ✦";position:absolute;right:4%;top:5%;color:var(--gold);letter-spacing:.65rem;font-size:clamp(.65rem,1.3vw,1.1rem);opacity:.9}
      .beginner-inner{position:absolute;inset:0;padding:7% 8%;display:grid;align-content:center;gap:18px}.beginner-num{position:absolute;left:2.7%;bottom:2.8%;z-index:2;color:#74c7ff;font-size:.72rem;font-weight:900;letter-spacing:.05em}
      .beginner-title-xl,.beginner-title-lg,.beginner-title-md{margin:0;text-align:center;letter-spacing:-.04em}.beginner-title-xl{font-size:clamp(2.1rem,5vw,5rem);line-height:1}.beginner-title-lg{font-size:clamp(1.6rem,3.5vw,3.4rem);line-height:1.08}.beginner-title-md{font-size:clamp(1.25rem,2.8vw,2.6rem);line-height:1.12}
      .beginner-sub{margin:0 auto;color:var(--muted);font-size:clamp(.78rem,1.35vw,1.2rem);max-width:90%;text-align:center}.beginner-glass{width:min(92%,1080px);margin:auto;padding:4.2% 4.8%;border:1px solid rgba(177,217,255,.25);border-radius:22px;background:rgba(245,250,255,.9);color:#254f72;box-shadow:0 0 0 10px rgba(38,93,143,.18)}
      .beginner-glass p,.beginner-glass ul{margin:0;font-size:clamp(.78rem,1.35vw,1.2rem);line-height:1.65}.beginner-glass ul{padding-left:1.25em}.beginner-glass li+li{margin-top:.2em}.beginner-quote{font-weight:800}
      .beginner-two{display:grid;grid-template-columns:1fr 1fr;gap:5%;align-items:center}.beginner-box{padding:6%;border:1px solid rgba(177,217,255,.25);border-radius:20px;background:rgba(245,250,255,.9);color:#254f72}.beginner-box h3{margin:0 0 .4em}.beginner-box p{margin:0;line-height:1.6}
      .beginner-formula{text-align:center;font-weight:900;font-size:clamp(1rem,2.2vw,2.1rem)!important}.beginner-chips{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.beginner-chip{padding:.6em 1em;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.05);color:inherit;text-decoration:none;font-size:.82rem;font-weight:800}.beginner-overview{display:block;width:min(80%,820px);margin:auto;border-radius:14px;border:1px solid var(--line)}
      .beginner-caption{padding:8px 4px 0;color:var(--muted);font-size:.72rem;display:flex;justify-content:space-between;gap:10px}.beginner-caption a{color:var(--gold);text-decoration:none;font-weight:800}
      @media(max-width:720px){.runes-third-nav{margin-bottom:10px;padding:6px;gap:5px;border-radius:11px}.runes-third-link{min-height:44px;padding:8px 10px;font-size:.76rem}.runes-third-nav-label{display:none}.beginner-slide{min-height:560px;border-radius:15px}.beginner-inner{position:relative;inset:auto;min-height:560px;padding:68px 18px 34px}.beginner-glass{width:100%;padding:22px 18px}.beginner-glass p,.beginner-glass ul{font-size:.92rem}.beginner-two{grid-template-columns:1fr}.beginner-overview{width:100%}.beginner-title-xl{font-size:2.3rem}.beginner-title-lg{font-size:1.85rem}.beginner-title-md{font-size:1.45rem}}
    `;
    document.head.appendChild(style);
  }

  function normalizeWorkspaceNav() {
    const nav = document.querySelector(".workspace-nav");
    if (!nav) return;
    if (!nav.querySelector('[data-runes-view="beginner"]')) {
      const drawGroup = nav.querySelector('[data-runes-view="draw"]')?.closest(".workspace-nav-group");
      const group = document.createElement("div");
      group.className = "workspace-nav-group";
      group.innerHTML = '<div class="workspace-nav-label">02 · 入門</div><button class="workspace-switch" type="button" data-runes-view="beginner"><strong>新手入門</strong><small>月之符文入門 · 19 段教學</small></button>';
      if (drawGroup) drawGroup.after(group); else nav.prepend(group);
    }
    const order = [["draw","01 · 抽牌"],["beginner","02 · 入門"],["daily","03 · 趨勢"],["reference","04 · 解析"],["systems","05 · 體系"],["library","06 · 資料"]];
    order.forEach(([view,labelText])=>{
      const button=nav.querySelector(`[data-runes-view="${view}"]`);
      const label=button?.closest(".workspace-nav-group")?.querySelector(".workspace-nav-label");
      if(label)label.textContent=labelText;
    });
  }

  async function ensureBeginnerView() {
    let view=document.getElementById("beginnerView");
    if(view)return view;
    const main=document.querySelector(".workspace-main");
    if(!main)return null;
    view=document.createElement("div");
    view.className="runes-view runes-beginner-shell";
    view.id="beginnerView";
    view.hidden=true;
    view.innerHTML=`<header class="hero loc-header"><p class="loc-header-meta">LunaRunes · Beginner Guide</p><h1 class="loc-header-title">新手入門</h1><h2 class="loc-header-subtitle">66 語言種子符文 × 八組符文分組 × 四卡牌方向 × 月相交互 × 符文演算法</h2></header><div class="runes-beginner-actions"><a class="runes-beginner-action primary" href="runes.html?mode=daily#draw">先抽一張</a><a class="runes-beginner-action" href="runes.html#library" data-runes-jump="library">月之符文66 圖鑑</a><a class="runes-beginner-action" href="docs/LOC_Tutorial_02_月之符文入門.pdf" target="_blank" rel="noopener">PDF 教材</a></div><div id="runesBeginnerContent"><div class="empty">載入新手入門…</div></div>`;
    main.prepend(view);
    try{
      const r=await fetch("data/html/runes-beginner.html",{cache:"force-cache"});
      if(!r.ok)throw new Error("HTTP "+r.status);
      document.getElementById("runesBeginnerContent").innerHTML=await r.text();
    }catch(error){
      document.getElementById("runesBeginnerContent").innerHTML='<div class="empty">新手入門暫時無法載入。</div>';
      console.warn(error);
    }
    return view;
  }

  function showBeginner(updateUrl=true){
    const beginner=document.getElementById("beginnerView");
    document.querySelectorAll(".runes-view").forEach(view=>view.hidden=view!==beginner);
    document.querySelectorAll("[data-runes-view]").forEach(button=>button.classList.toggle("active",button.dataset.runesView==="beginner"));
    if(updateUrl)history.replaceState(null,"","runes.html#beginner");
  }

  function jumpExistingView(name){
    const beginner=document.getElementById("beginnerView");
    if(beginner)beginner.hidden=true;
    const button=document.querySelector(`[data-runes-view="${name}"]`);
    if(button){button.click();return true}
    return false;
  }

  function wireNavigation(){
    document.addEventListener("click",event=>{
      const beginnerButton=event.target.closest('[data-runes-view="beginner"]');
      if(beginnerButton){event.preventDefault();showBeginner();window.scrollTo({top:0,behavior:"smooth"});return}
      const other=event.target.closest('[data-runes-view]:not([data-runes-view="beginner"])');
      if(other){const beginner=document.getElementById("beginnerView");if(beginner)beginner.hidden=true;return}
      const jump=event.target.closest("[data-runes-jump]");
      if(jump){event.preventDefault();jumpExistingView(jump.dataset.runesJump);return}
      const anchor=event.target.closest('a[href^="runes.html#"]');
      if(anchor){
        const hash=new URL(anchor.href,location.href).hash.replace(/^#/,"");
        if(["library","reference","systems","daily","draw"].includes(hash)){event.preventDefault();jumpExistingView(hash)}
      }
    },true);

    document.querySelectorAll('a[href="tutorial02.html"],a[href$="/tutorial02.html"]').forEach(anchor=>{anchor.href="runes.html#beginner";anchor.removeAttribute("target");anchor.removeAttribute("rel")});
    window.addEventListener("hashchange",()=>{
      if(location.hash==="#beginner")showBeginner(false);
    });
    if(location.hash==="#beginner")setTimeout(()=>showBeginner(false),0);
  }

  function addDrawThirdLevel(){
    const selector=document.getElementById("draw-mode-selector");
    if(!selector||document.getElementById("drawThirdNav"))return;
    const nav=document.createElement("nav");
    nav.id="drawThirdNav";nav.className="runes-third-nav";nav.setAttribute("aria-label","抽牌數量快速選單");
    const mode=new URLSearchParams(location.search).get("mode")||"";
    nav.innerHTML='<span class="runes-third-nav-label">LOTS</span>'+DRAW_MODES.map(([value,label])=>`<a class="runes-third-link${mode===value?" active":""}" href="runes.html?mode=${value}#draw">${label}</a>`).join("")+'<span class="runes-third-link" aria-disabled="true" title="目前公開抽牌入口尚未啟用 OW3gs">OW3gs 11</span>';
    selector.before(nav);
  }

  function addLibraryThirdLevel(){
    const library=document.getElementById("libraryView");
    if(!library||document.getElementById("libraryThirdNav"))return;
    const header=library.querySelector(".loc-header");
    const nav=document.createElement("nav");
    nav.id="libraryThirdNav";nav.className="runes-third-nav";nav.setAttribute("aria-label","符文群組快速選單");
    nav.innerHTML='<span class="runes-third-nav-label">GROUPS</span>'+GROUPS.map(group=>`<a class="runes-third-link" href="runes.html?group=${encodeURIComponent(group)}#library" data-rune-group-shortcut="${group}">${group}</a>`).join("");
    if(header)header.after(nav);else library.prepend(nav);
  }

  function bindGroupShortcuts(){
    document.addEventListener("click",event=>{
      const link=event.target.closest("[data-rune-group-shortcut]");
      if(!link)return;
      const group=link.dataset.runeGroupShortcut;
      if(group==="特殊"){
        const section=document.querySelector(".special-rune-section");
        if(section){event.preventDefault();section.scrollIntoView({behavior:"smooth",block:"start"})}
        return;
      }
      const quick=document.getElementById("rune-group-quick-selector");
      if(quick){
        const button=[...quick.querySelectorAll("button,[role=button]")].find(node=>node.textContent?.includes(group));
        if(button){event.preventDefault();button.click()}
      }
    });
    if(new URLSearchParams(location.search).get("group")==="特殊")setTimeout(()=>document.querySelector(".special-rune-section")?.scrollIntoView({block:"start"}),300);
  }

  async function init(){
    if((location.pathname.split("/").pop()||"")!=="runes.html")return;
    addStyles();normalizeWorkspaceNav();await ensureBeginnerView();normalizeWorkspaceNav();wireNavigation();addDrawThirdLevel();addLibraryThirdLevel();bindGroupShortcuts();setTimeout(normalizeWorkspaceNav,250);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
