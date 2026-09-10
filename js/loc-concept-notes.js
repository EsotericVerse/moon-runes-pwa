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

  function addGovernanceNote(){
    if(document.getElementById('loc-governance-neutral-note')) return;
    const host = document.getElementById('principles');
    if(!host) return;
    const box = document.createElement('div');
    box.id = 'loc-governance-neutral-note';
    box.className = 'loc-concept-note';
    box.innerHTML = `
      <small>Neutrality · De-mystification</small>
      <p><strong>LOC 是語言系統模組：以中立方式切分語言，把模糊問題拆成可處理的模組、方法與演算法，不替使用者決定哪個答案必然正確。</strong></p>
      <p>月之符文是符號式語言模組。它以「月」作為主體與識別，但盡可能公正、客觀地描述語言本身；籤詩的「指引」只是把不確定性整理成可以理解、比較與選擇的可能，不等於神諭、預言或命定。</p>
      <p>可以把它想成：<strong>把申論題先整理成選擇題。</strong> 系統負責提供可辨認的路徑，人仍保有最後的判斷與選擇。</p>`;
    host.appendChild(box);
  }

  function addRunesNote(){
    if(document.getElementById('loc-runes-modular-note')) return;
    const host = document.querySelector('.rune-basics') || document.querySelector('.daily-entry') || document.querySelector('main');
    if(!host) return;
    const box = document.createElement('section');
    box.id = 'loc-runes-modular-note';
    box.className = 'loc-concept-note';
    box.innerHTML = `
      <small>LunaRunes · Symbolic Language Module</small>
      <p><strong>月之符文是符號式語言模組：以「月」作為主體與識別，但盡可能公正、客觀地描述語言本身。</strong></p>
      <p>它透過符文、群組、方向與組合，把模糊語意切成可以辨認、比較與重新組合的單位。籤詩保留「指引」的形式，但不是替人決定未來；它把原本開放的不確定性先整理成有限而可選的方向，像是把申論題先整理成選擇題，再由人判斷怎麼理解與行動。</p>
      <p><strong>LOC 是語言系統模組，提供中立的切分、模組化、方法論與演算法。</strong> 月之符文提供一套已實際運作的符號式語言模組作為參考實證，LOC 再把這種切分、組合、脈絡與推演方法擴展到其他語言系統，因此兩者相輔相成。</p>`;
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
      <p>月之符文的籤詩指引模式提供一個實際例子：用語意切分把模糊問題拆成不同方向，讓原本必須自由作答的申論題，先變成可以比較的選擇題。這些選項不是命定答案，而是可供判斷的路徑。</p>
      <p>LOC 這個語言系統模組把同樣的中立切分方式擴展成模組、方法論與演算法：<strong>不確定性 → 語意拆分 → 模組化可能性 → 路徑比較 → 人的選擇 → 新結果 → 再次推演</strong>。選擇仍屬於人，新的結果再成為下一輪語言與脈絡的輸入。</p>`;
    hero.after(box);
  }

  if(file === 'governance.html') addGovernanceNote();
  if(file === 'runes.html' || file === 'lots.html') addRunesNote();
  if(file === 'evolution.html') addEvolutionNote();
})();
