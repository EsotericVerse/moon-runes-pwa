(() => {
  if (window.__LOC_RUNES_PWA_IA__) return;
  window.__LOC_RUNES_PWA_IA__ = true;

  function addStyles() {
    if (document.getElementById("runes-pwa-ia-style")) return;
    const style = document.createElement("style");
    style.id = "runes-pwa-ia-style";
    style.textContent = `
      #draw-mode-selector{display:none!important}
      .runes-beginner-shell{padding-bottom:24px}
      .runes-beginner-actions{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}
      .runes-beginner-action{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:8px 12px;border:1px solid var(--line);border-radius:999px;color:var(--text);text-decoration:none;font-size:.78rem;font-weight:800;background:rgba(255,255,255,.03)}
      .runes-beginner-action.primary{background:linear-gradient(135deg,#c7b7ff,#e8c57f);color:#171021;border:0}
      .runes-beginner-video{margin:0 0 20px;padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.025)}
      .runes-beginner-video strong{display:block;margin-bottom:5px;color:var(--gold)}
      .runes-beginner-video p{margin:0;color:var(--muted);font-size:.86rem;line-height:1.65}
      .runes-beginner-video a{display:inline-flex;margin-top:10px;color:var(--text);font-weight:800;text-decoration:none;border-bottom:1px solid var(--gold)}
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
      @media(max-width:720px){.beginner-slide{min-height:560px;border-radius:15px}.beginner-inner{position:relative;inset:auto;min-height:560px;padding:68px 18px 34px}.beginner-glass{width:100%;padding:22px 18px}.beginner-glass p,.beginner-glass ul{font-size:.92rem}.beginner-two{grid-template-columns:1fr}.beginner-overview{width:100%}.beginner-title-xl{font-size:2.3rem}.beginner-title-lg{font-size:1.85rem}.beginner-title-md{font-size:1.45rem}}
    `;
    document.head.appendChild(style);
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
    view.innerHTML=`<header class="hero loc-header"><p class="loc-header-meta">LunaRunes · Beginner Guide</p><h1 class="loc-header-title">新手上路</h1><h2 class="loc-header-subtitle">66 語言種子符文 × 八組符文分組 × 四卡牌方向 × 月相交互 × 符文演算法</h2></header><div class="runes-beginner-actions"><a class="runes-beginner-action primary" href="lots.html?mode=daily#draw">先抽一張</a><a class="runes-beginner-action" href="lots.html#library">月之符文66 圖鑑</a><a class="runes-beginner-action" href="docs/LOC_Tutorial_02_月之符文入門.pdf" target="_blank" rel="noopener">PDF 教材</a></div><div class="runes-beginner-video"><strong>先看一個實際例子</strong><p>這支短影片用月之符文做一次大眾占卜示範，可以先看牌怎麼被抽出、排列與解讀，再往下讀完整教學。</p><a href="https://www.instagram.com/reel/DMA9yDAzeRK/" target="_blank" rel="noopener">觀看 Instagram Reels 短影片 →</a></div><div id="runesBeginnerContent"><div class="empty">載入新手上路…</div></div>`;
    main.prepend(view);
    try{
      const r=await fetch("data/html/runes-beginner.html",{cache:"force-cache"});
      if(!r.ok)throw new Error("HTTP "+r.status);
      document.getElementById("runesBeginnerContent").innerHTML=await r.text();
    }catch(error){
      document.getElementById("runesBeginnerContent").innerHTML='<div class="empty">新手上路暫時無法載入。</div>';
      console.warn(error);
    }
    return view;
  }

  function showBeginner(){
    const beginner=document.getElementById("beginnerView");
    document.querySelectorAll(".runes-view").forEach(view=>view.hidden=view!==beginner);
  }

  async function init(){
    const file=location.pathname.split("/").pop()||"";
    if(!["runes.html","lots.html"].includes(file))return;
    addStyles();
    await ensureBeginnerView();
    if((file==="runes.html" && (!location.hash || location.hash==="#beginner")) || (file==="lots.html" && location.hash==="#beginner")) showBeginner();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();