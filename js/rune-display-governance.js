(() => {
  if (window.__LOC_RUNE_DISPLAY_GOVERNANCE__) return;
  window.__LOC_RUNE_DISPLAY_GOVERNANCE__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const clean = value => String(value ?? '').trim();
  const GOVERNED = 'locRuneDisplayGoverned';
  let runeMap = new Map();

  function installStyle(){
    if(document.getElementById('loc-rune-semantic-authority-style')) return;
    const style=document.createElement('style');
    style.id='loc-rune-semantic-authority-style';
    style.textContent=`
      [data-semantic-authority="spec"]{border-color:rgba(231,194,125,.5)!important;background:rgba(231,194,125,.07)!important;}
      [data-semantic-authority="spec"] .rune-result-label,
      [data-semantic-authority="spec"] strong{font-weight:900!important;letter-spacing:.01em;}
      [data-semantic-authority="keywords"]{opacity:.96;}
      [data-semantic-authority="direction"]{opacity:.88;}
      [data-semantic-authority="extension"]{opacity:.78;}
      article.card [data-semantic-authority="spec"]{padding:.7rem .8rem;border:1px solid rgba(231,194,125,.35);border-radius:12px;}
      article.card [data-semantic-authority="keywords"]{margin-top:.55rem;}
    `;
    document.head.appendChild(style);
  }

  function isGoverned(node){ return node?.dataset?.[GOVERNED] === '1'; }
  function markGoverned(node){ if(node?.dataset) node.dataset[GOVERNED]='1'; }

  function runeNameFromHeading(node){
    if(!node) return '';
    const clone=node.cloneNode(true);
    clone.querySelectorAll('small,span').forEach(el=>el.remove());
    return clean(clone.textContent);
  }

  function fieldLabel(field){
    return clean(field?.querySelector?.('.rune-result-label')?.textContent || field?.querySelector?.('strong')?.textContent);
  }

  function makeDrawField(label,value,authority){
    const div=document.createElement('div');
    div.className='rune-result-field';
    div.dataset.semanticAuthority=authority;
    div.innerHTML=`<span class="rune-result-label">${esc(label)}</span><span class="rune-result-value">${esc(value)}</span>`;
    return div;
  }

  function makeInfoBox(label,value,authority){
    const div=document.createElement('div');
    div.dataset.semanticAuthority=authority;
    div.style.cssText='padding:9px 10px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.025);font-size:.74rem;line-height:1.5';
    div.innerHTML=`<strong style="display:block;color:var(--gold);font-size:.72rem">${esc(label)}</strong><span style="display:block;color:var(--muted);margin-top:2px">${esc(value)}</span>`;
    return div;
  }

  function governDrawCard(card){
    if(isGoverned(card)) return;
    const rune=runeMap.get(runeNameFromHeading(card.querySelector('.rune-result-name')));
    const grid=card.querySelector('.rune-result-grid');
    if(!rune || !grid) return;

    let fields=[...grid.querySelectorAll(':scope > .rune-result-field')];
    let spec=fields.find(f=>['Spec','顯化形式','Spec／顯化形式'].includes(fieldLabel(f)));
    if(!spec && clean(rune.顯化形式)){
      spec=makeDrawField('Spec／顯化形式',rune.顯化形式,'spec');
      grid.prepend(spec);
    }else if(spec){ spec.dataset.semanticAuthority='spec'; }

    fields=[...grid.querySelectorAll(':scope > .rune-result-field')];
    let keyword=fields.find(f=>fieldLabel(f)==='關鍵詞');
    if(!keyword && clean(rune.關鍵詞)){
      keyword=makeDrawField('關鍵詞',rune.關鍵詞,'keywords');
      grid.appendChild(keyword);
    }else if(keyword){ keyword.dataset.semanticAuthority='keywords'; }

    fields=[...grid.querySelectorAll(':scope > .rune-result-field')];
    const direction=fields.find(f=>fieldLabel(f)==='卡片方向');
    if(direction) direction.dataset.semanticAuthority='direction';

    const priority=[spec,keyword,direction].filter(Boolean);
    const rest=[...grid.querySelectorAll(':scope > .rune-result-field')].filter(node=>!priority.includes(node));
    [...priority,...rest].forEach(node=>grid.appendChild(node));
    markGoverned(card);
  }

  function governLibraryTile(tile){
    if(isGoverned(tile)) return;
    const name=clean(tile.querySelector('.rune-info strong')?.textContent || tile.querySelector('.special-rune-name strong')?.textContent);
    const rune=runeMap.get(name);
    if(!rune) return;

    const special=tile.matches('.special-rune-card');
    const host=special ? tile.querySelector('.special-rune-meta') : tile.querySelector('.rune-info > div:last-child');
    if(!host) return;

    const labelOf=node=>clean(node.querySelector('strong')?.textContent);
    let children=[...host.children];
    let spec=children.find(node=>['Spec','Spec／顯化形式','顯化形式'].includes(labelOf(node)));
    if(!spec && clean(rune.顯化形式)){
      if(special){
        spec=document.createElement('p');
        spec.dataset.semanticAuthority='spec';
        spec.innerHTML=`<strong>Spec／顯化形式</strong>${esc(rune.顯化形式)}`;
      }else{
        spec=makeInfoBox('Spec／顯化形式',rune.顯化形式,'spec');
      }
      host.prepend(spec);
    }else if(spec){ spec.dataset.semanticAuthority='spec'; }

    children=[...host.children];
    const keyword=children.find(node=>labelOf(node)==='關鍵詞');
    if(keyword) keyword.dataset.semanticAuthority='keywords';
    const reverse=children.find(node=>labelOf(node)==='反向關鍵詞');
    const moon=children.find(node=>labelOf(node)==='卡片月相');
    const priority=[spec,keyword,reverse,moon].filter(Boolean);
    const rest=[...host.children].filter(node=>!priority.includes(node));
    [...priority,...rest].forEach(node=>host.appendChild(node));
    markGoverned(tile);
  }

  function governSearchOracle(card){
    if(isGoverned(card)) return;
    const pills=[...card.querySelectorAll('.meta .pill')].map(x=>clean(x.textContent));
    if(!pills.some(x=>x.includes('符文語彙'))) return;

    const identity=pills.find(x=>x.includes('·') && !x.includes('符文語彙')) || '';
    const rune=runeMap.get(clean(identity.split('·')[0]));
    const heading=card.querySelector('h3');
    if(!rune || !heading) return;

    let spec=card.querySelector('[data-semantic-authority="spec"]');
    if(!spec && clean(rune.顯化形式)){
      spec=document.createElement('p');
      spec.className='summary';
      spec.dataset.semanticAuthority='spec';
      spec.innerHTML=`<strong>Spec／顯化形式：</strong>${esc(rune.顯化形式)}`;
      heading.after(spec);
    }

    let keyword=card.querySelector('[data-semantic-authority="keywords"]');
    if(!keyword && clean(rune.關鍵詞)){
      keyword=document.createElement('p');
      keyword.className='summary';
      keyword.dataset.semanticAuthority='keywords';
      keyword.innerHTML=`<strong>關鍵詞：</strong>${esc(rune.關鍵詞)}`;
      (spec||heading).after(keyword);
    }

    [...card.querySelectorAll('p.summary')].forEach(p=>{
      const text=clean(p.textContent);
      if(text.startsWith('方位語意：')) p.dataset.semanticAuthority='direction';
      if(text.startsWith('延伸字樣：')) p.dataset.semanticAuthority='extension';
    });

    const direction=card.querySelector('[data-semantic-authority="direction"]');
    const extension=card.querySelector('[data-semantic-authority="extension"]');
    let anchor=heading;
    [spec,keyword,direction,extension].filter(Boolean).forEach(node=>{
      anchor.after(node);
      anchor=node;
    });
    markGoverned(card);
  }

  function governElement(node){
    if(node.matches?.('.rune-result-card')) governDrawCard(node);
    if(node.matches?.('.rune-tile,.special-rune-card')) governLibraryTile(node);
    if(node.matches?.('article.card')) governSearchOracle(node);
  }

  function govern(root=document){
    if(root?.nodeType===Node.ELEMENT_NODE) governElement(root);
    root.querySelectorAll?.('.rune-result-card').forEach(governDrawCard);
    root.querySelectorAll?.('.rune-tile,.special-rune-card').forEach(governLibraryTile);
    root.querySelectorAll?.('article.card').forEach(governSearchOracle);
  }

  async function start(){
    try{
      installStyle();
      const response=await fetch('data/json/core/runes66.json',{cache:'no-store'});
      if(!response.ok) return;
      const payload=await response.json();
      const rows=Array.isArray(payload)?payload:(payload.runes||payload.items||[]);
      runeMap=new Map(rows.map(row=>[clean(row.符文名稱||row.名稱||row.name),row]).filter(([name])=>name));
      govern(document);
      new MutationObserver(records=>{
        for(const record of records){
          for(const node of record.addedNodes){
            if(node.nodeType===Node.ELEMENT_NODE) govern(node);
          }
        }
      }).observe(document.body,{childList:true,subtree:true});
    }catch(_){ /* display governance must never block the page */ }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
