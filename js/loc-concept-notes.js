(() => {
  const file = location.pathname.split('/').pop() || 'index.html';

  const style = document.createElement('style');
  style.textContent = `
    .loc-concept-note{margin:16px 0;padding:18px 20px;border:1px solid rgba(180,158,255,.22);border-radius:18px;background:rgba(13,31,56,.78);color:#dce6f7;line-height:1.72}
    .loc-concept-note small{display:block;margin-bottom:5px;color:#b49eff;font-weight:800;letter-spacing:.06em}
    .loc-concept-note strong{color:#e7c27d}
    .loc-concept-note p{margin:.55rem 0}
    .loc-concept-note p:last-child{margin-bottom:0}
  `;
  document.head.appendChild(style);

  function addRunesNote(){
    if(document.getElementById('loc-runes-modular-note')) return;
    const host = document.querySelector('.rune-basics') || document.querySelector('.daily-entry') || document.querySelector('main');
    if(!host) return;
    const box = document.createElement('section');
    box.id = 'loc-runes-modular-note';
    box.className = 'loc-concept-note';
    box.innerHTML = `
      <small>LunaRunes · Modular Possibility</small>
      <p><strong>月之符文不是替你決定未來，而是把不確定性切成可以理解、比較與選擇的可能。</strong></p>
      <p>籤詩保留「指引」的形式，但不需要神秘學前提。它先提供一個語意切入點，再把原本開放、模糊的問題拆成有限而可辨識的方向；像是先把申論題整理成選擇題，再由人決定怎麼理解、怎麼行動。</p>
      <p>LOC 的語言系統模組化也參考這種切分方式：月之符文提供可運作的語意模組實證，LOC 再把同樣的拆分、組合、脈絡與推演方法擴展到更大的語言系統。兩者因此相輔相成。</p>`;
    host.after(box);
  }

  function addEvolutionNote(){
    if(document.getElementById('loc-evolution-uncertainty-note')) return;
    const overview = document.getElementById('overviewView');
    const hero = overview?.querySelector('.hero');
    if(!overview || !hero) return;
    const box = document.createElement('section');
    box.id = 'loc-evolution-uncertainty-note';
    box.className = 'loc-concept-note';
    box.innerHTML = `
      <small>Evolution · Structured Possibility</small>
      <p><strong>推演不是預測命運，而是把不確定性拆成可以理解、比較與選擇的可能。</strong></p>
      <p>月之符文的籤詩指引模式提供一個實際做法：先用語意把模糊問題切成不同方向，再比較路徑、形成選擇，讓原本的申論題先變成可處理的選擇題。</p>
      <p>選擇之後產生新的結果，結果再成為下一輪語言與脈絡的輸入。這就是推演中的遞迴：<strong>不確定性 → 語意拆分 → 模組化可能性 → 路徑比較 → 人的選擇 → 新結果 → 再次推演</strong>。</p>`;
    hero.after(box);
  }

  if(file === 'runes.html' || file === 'lots.html') addRunesNote();
  if(file === 'evolution.html') addEvolutionNote();
})();
