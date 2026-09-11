(() => {
  if (window.__LOC_RUNES_PWA_IA__) return;
  window.__LOC_RUNES_PWA_IA__ = true;

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
    await ensureBeginnerView();
    if((file==="runes.html" && (!location.hash || location.hash==="#beginner")) || (file==="lots.html" && location.hash==="#beginner")) showBeginner();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();