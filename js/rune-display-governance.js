(() => {
  if (window.__LOC_RUNE_DISPLAY_GOVERNANCE__) return;
  window.__LOC_RUNE_DISPLAY_GOVERNANCE__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const clean = value => String(value ?? '').trim();
  const GOVERNED = 'locRuneDisplayGoverned';
  let runeMap = new Map();

  function realMoonPhase(){
    return window.LOCMoonPhase?.getRealPhase?.() || sessionStorage.getItem('realPhase') || '未知';
  }

  function valueOf(rune, ...keys){
    for(const key of keys){
      const value=clean(rune?.[key]);
      if(value) return value;
    }
    return '—';
  }

  function installStyle(){
    if(document.getElementById('loc-rune-card-unified-style')) return;
    const style=document.createElement('style');
    style.id='loc-rune-card-unified-style';
    style.textContent=`
      .loc-rune-english,
      #attributes .rune66-kicker{
        display:block!important;
        margin:0!important;
        color:var(--gold,var(--loc-purple,#b49eff))!important;
        font-size:.76rem!important;
        font-weight:900!important;
        letter-spacing:.08em!important;
        line-height:1.35!important;
      }
      .loc-rune-title,
      #attributes .rune66-title{
        display:block!important;
        margin:4px 0 0!important;
        color:var(--gold,var(--loc-gold,#e7c27d))!important;
        font-size:1.18rem!important;
        font-weight:850!important;
        line-height:1.35!important;
      }
      .rune-result-name.loc-rune-heading{
        display:flex!important;
        flex-direction:column!important;
        align-items:flex-start!important;
        gap:0!important;
      }
      .loc-rune-info-grid,
      .rune-result-grid.loc-rune-info-grid,
      #attributes .rune66-details.loc-rune-info-grid{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:8px!important;
        margin-top:12px!important;
        padding:0!important;
        border:0!important;
      }
      .loc-rune-info-bubble,
      .rune-result-grid.loc-rune-info-grid > .rune-result-field,
      #attributes .rune66-detail.loc-rune-info-bubble{
        display:block!important;
        margin:0!important;
        padding:9px 11px!important;
        border:1px solid var(--line,var(--loc-border,rgba(180,158,255,.22)))!important;
        border-radius:12px!important;
        background:rgba(255,255,255,.035)!important;
        color:var(--muted,var(--loc-muted,#b9bfd0))!important;
        font-size:.78rem!important;
        line-height:1.55!important;
      }
      .loc-rune-info-bubble strong,
      .rune-result-grid.loc-rune-info-grid .rune-result-label,
      #attributes .rune66-detail.loc-rune-info-bubble strong{
        display:inline!important;
        margin:0!important;
        color:var(--gold,var(--loc-text,#f5f1ff))!important;
        font-weight:850!important;
      }
      .rune-result-grid.loc-rune-info-grid .rune-result-value{
        display:inline!important;
        margin-left:.35em!important;
        color:var(--muted,var(--loc-muted,#b9bfd0))!important;
      }
      .special-rune-meta.loc-rune-info-grid p,
      .rune-info .loc-rune-info-grid > div{margin:0!important;}
      article.card [data-semantic-authority="direction"]{opacity:.88;}
      article.card [data-semantic-authority="extension"]{opacity:.78;}
    `;
    document.head.appendChild(style);
  }

  function isGoverned(node){ return node?.dataset?.[GOVERNED] === '1'; }
  function markGoverned(node){ if(node?.dataset) node.dataset[GOVERNED]='1'; }

  function runeNameFromHeading(node){
    if(!node) return '';
    const explicit=node.querySelector?.('.loc-rune-title')?.textContent || '';
    if(explicit) return clean(explicit.replace(/之符文$/,''));
    const clone=node.cloneNode(true);
    clone.querySelectorAll('small,span').forEach(el=>el.remove());
    return clean(clone.textContent).replace(/之符文$/,'');
  }

  function titleHtml(rune){
    const english=valueOf(rune,'英文','english');
    const name=valueOf(rune,'符文名稱','名稱','name');
    return `<span class="loc-rune-english">${esc(english)}</span><span class="loc-rune-title">${esc(name)}之符文</span>`;
  }

  function fields(rune){
    const phase=valueOf(rune,'月相','moon_phase');
    return [
      ['說明', valueOf(rune,'特別說明','說明','description')],
      ['關鍵詞', valueOf(rune,'關鍵詞','keyword')],
      ['反向關鍵詞', valueOf(rune,'反向關鍵詞','反向關鍵字','reverse_keyword')],
      ['人格原型', valueOf(rune,'人格原型','archetype')],
      ['所屬分組', valueOf(rune,'所屬分組','group')],
      ['卡片詞性', valueOf(rune,'卡片屬性','card_attribute')],
      ['卡片月相', `${phase} / 真實月相：${realMoonPhase()}`]
    ];
  }

  function fieldHtml(label,value){
    return `<div class="rune-result-field loc-rune-info-bubble"><span class="rune-result-label">${esc(label)}：</span><span class="rune-result-value">${esc(value)}</span></div>`;
  }

  function infoGridHtml(rune){
    return `<div class="loc-rune-info-grid">${fields(rune).map(([label,value])=>`<div class="loc-rune-info-bubble"><strong>${esc(label)}：</strong>${esc(value)}</div>`).join('')}</div>`;
  }

  function governHomepage(){
    const host=document.getElementById('attributes');
    if(!host || isGoverned(host)) return;
    const rune=runeMap.get('玄');
    if(!rune) return;
    host.innerHTML=`
      <span class="rune66-kicker">${esc(valueOf(rune,'英文','english'))}</span>
      <strong class="rune66-title">${esc(valueOf(rune,'符文名稱','名稱','name'))}之符文</strong>
      <div class="rune66-details loc-rune-info-grid">
        ${fields(rune).map(([label,value])=>`<p class="rune66-detail loc-rune-info-bubble"><strong>${esc(label)}：</strong>${esc(value)}</p>`).join('')}
      </div>
      <a class="rune-data-cta" href="lots.html#library">
        <span><strong>查看完整月之符文資料</strong><small>月之符文66 圖鑑 · 八組分類 · 卡片詳細說明</small></span>
        <span aria-hidden="true">→</span>
      </a>`;
    markGoverned(host);
  }

  function governDrawCard(card){
    if(isGoverned(card)) return;
    const rune=runeMap.get(runeNameFromHeading(card.querySelector('.rune-result-name')));
    const grid=card.querySelector('.rune-result-grid');
    const heading=card.querySelector('.rune-result-name');
    if(!rune || !grid || !heading) return;

    heading.classList.add('loc-rune-heading');
    heading.innerHTML=titleHtml(rune);
    grid.classList.add('loc-rune-info-grid');
    grid.innerHTML=fields(rune).map(([label,value])=>fieldHtml(label,value)).join('');
    markGoverned(card);
  }

  function governLibraryTile(tile){
    if(isGoverned(tile)) return;
    const name=clean(tile.querySelector('.rune-info strong')?.textContent || tile.querySelector('.special-rune-name strong')?.textContent).replace(/之符文$/,'');
    const rune=runeMap.get(name);
    if(!rune) return;

    if(tile.matches('.special-rune-card')){
      const copy=tile.querySelector('.special-rune-copy');
      if(!copy) return;
      copy.innerHTML=`<div class="special-rune-name loc-rune-heading">${titleHtml(rune)}</div>${infoGridHtml(rune)}`;
    }else{
      const info=tile.querySelector('.rune-info');
      if(!info) return;
      info.innerHTML=`<div class="loc-rune-heading">${titleHtml(rune)}</div>${infoGridHtml(rune)}`;
    }
    markGoverned(tile);
  }

  function governSearchOracle(card){
    if(isGoverned(card)) return;
    const pills=[...card.querySelectorAll('.meta .pill')].map(x=>clean(x.textContent));
    if(!pills.some(x=>x.includes('符文語彙'))) return;
    [...card.querySelectorAll('[data-semantic-authority="spec"]')].forEach(node=>node.remove());
    [...card.querySelectorAll('p.summary')].forEach(p=>{
      const text=clean(p.textContent);
      if(text.startsWith('方位語意：')) p.dataset.semanticAuthority='direction';
      if(text.startsWith('延伸字樣：')) p.dataset.semanticAuthority='extension';
    });
    markGoverned(card);
  }

  function governElement(node){
    if(node.matches?.('#attributes')) governHomepage();
    if(node.matches?.('.rune-result-card')) governDrawCard(node);
    if(node.matches?.('.rune-tile,.special-rune-card')) governLibraryTile(node);
    if(node.matches?.('article.card')) governSearchOracle(node);
  }

  function govern(root=document){
    governHomepage();
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
