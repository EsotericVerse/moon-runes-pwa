(() => {
  if (window.__LOC_RUNE_DISPLAY_GOVERNANCE__) return;
  window.__LOC_RUNE_DISPLAY_GOVERNANCE__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'
  }[ch]));
  const clean = value => String(value ?? '').trim();
  const GOVERNED = 'locRuneDisplayGoverned';
  const PHASES = new Set(['新月','上弦','滿月','下弦','空亡']);
  let runeMap = new Map();
  let groupByRuneId = new Map();

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

  function runeId(rune){
    const id=Number(rune?.編號 ?? rune?.id);
    return Number.isInteger(id) ? id : null;
  }

  function cardAttribute(rune){
    const raw=valueOf(rune,'卡片屬性','card_attribute');
    if(['正面','正向'].includes(raw)) return '正面';
    if(['負面','負向'].includes(raw)) return '負面';
    if(['中平','中性','中立'].includes(raw)) return '中立';
    return '未知';
  }

  function cardPhase(rune){
    const raw=valueOf(rune,'月相','moon_phase');
    if(raw === '無' || raw === '空亡') return '空亡';
    return PHASES.has(raw) ? raw : '空亡';
  }

  function groupLabel(rune){
    const meta=groupByRuneId.get(runeId(rune));
    const zh=clean(meta?.group_zh) || valueOf(rune,'所屬分組','group');
    const en=clean(meta?.group_en);
    return en ? `${zh} ${en}` : zh;
  }

  function isGoverned(node){ return node?.dataset?.[GOVERNED] === '1'; }
  function markGoverned(node){ if(node?.dataset) node.dataset[GOVERNED]='1'; }

  function runeNameFromHeading(node){
    if(!node) return '';
    const explicit=clean(node.dataset?.runeName);
    if(explicit) return explicit;
    const clone=node.cloneNode(true);
    clone.querySelectorAll('small,span').forEach(el=>el.remove());
    return clean(clone.textContent)
      .replace(/^符文名稱\s*[：:]\s*/,'')
      .replace(/\s*\([^)]*\)\s*$/,'')
      .replace(/之符文$/,'');
  }

  function titleText(rune){
    const name=valueOf(rune,'符文名稱','名稱','name');
    const english=valueOf(rune,'英文','english');
    return `符文名稱：${name}之符文 (${english})`;
  }

  function fields(rune, direction=''){
    const note=valueOf(rune,'特別說明','說明','description');
    const archetype=valueOf(rune,'人格原型','archetype');
    const keyword=valueOf(rune,'關鍵詞','keyword');
    const reverse=valueOf(rune,'反向關鍵詞','反向關鍵字','reverse_keyword');
    const rows=[
      ['說明', `${note} / ${archetype}`],
      ['關鍵詞', `${keyword} / ${reverse}`],
      ['所屬分組', groupLabel(rune)],
      ['卡片詞性', cardAttribute(rune)],
      ['月相', `卡片 ${cardPhase(rune)} / 目前 ${realMoonPhase()}`]
    ];
    if(clean(direction)) rows.push(['卡片位向', clean(direction), 'position']);
    return rows;
  }

  function fieldHtml(label,value,type=''){
    const emphasis=type === 'position' ? ' loc-rune-position-bubble' : '';
    return `<div class="rune-result-field loc-rune-info-bubble${emphasis}"><span class="rune-result-label">${esc(label)}：</span><span class="rune-result-value">${esc(value)}</span></div>`;
  }

  function infoGridHtml(rune, direction=''){
    return `<div class="loc-rune-info-grid">${fields(rune,direction).map(([label,value,type])=>`<div class="loc-rune-info-bubble${type === 'position' ? ' loc-rune-position-bubble' : ''}"><strong>${esc(label)}：</strong>${esc(value)}</div>`).join('')}</div>`;
  }

  function titleBubbleHtml(rune){
    return `<div class="loc-rune-title-bubble" data-rune-name="${esc(valueOf(rune,'符文名稱','名稱','name'))}">${esc(titleText(rune))}</div>`;
  }

  function governHomepage(){
    const host=document.getElementById('attributes');
    if(!host || isGoverned(host)) return;
    const rune=runeMap.get('玄');
    if(!rune) return;
    host.innerHTML=`
      ${titleBubbleHtml(rune)}
      ${infoGridHtml(rune)}
      <a class="rune-data-cta" href="lots.html#library">
        <span><strong>查看完整月之符文資料</strong><small>月之符文66 圖鑑 · 八組分類 · 卡片詳細說明</small></span>
        <span aria-hidden="true">→</span>
      </a>`;
    markGoverned(host);
  }

  function governDrawCard(card){
    if(isGoverned(card)) return;
    const heading=card.querySelector('.rune-result-name');
    const rune=runeMap.get(runeNameFromHeading(heading));
    const grid=card.querySelector('.rune-result-grid');
    if(!rune || !grid || !heading) return;

    const originalFields=[...grid.querySelectorAll(':scope > .rune-result-field')];
    const directionField=originalFields.find(field=>{
      const label=clean(field.querySelector('.rune-result-label')?.textContent).replace(/[：:]$/,'');
      return label === '卡片方向' || label === '卡片位向';
    });
    const direction=clean(directionField?.querySelector('.rune-result-value')?.textContent);

    heading.className='rune-result-name loc-rune-title-bubble';
    heading.dataset.runeName=valueOf(rune,'符文名稱','名稱','name');
    heading.textContent=titleText(rune);
    grid.classList.add('loc-rune-info-grid');
    grid.innerHTML=fields(rune,direction).map(([label,value,type])=>fieldHtml(label,value,type)).join('');
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
      copy.innerHTML=`${titleBubbleHtml(rune)}${infoGridHtml(rune)}`;
    }else{
      const info=tile.querySelector('.rune-info');
      if(!info) return;
      info.innerHTML=`${titleBubbleHtml(rune)}${infoGridHtml(rune)}`;
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
      const [runeResponse,groupResponse]=await Promise.all([
        fetch('data/json/core/runes66.json',{cache:'no-store'}),
        fetch('data/json/core/runes66groups.json',{cache:'no-store'})
      ]);
      if(!runeResponse.ok) return;
      const runePayload=await runeResponse.json();
      const rows=Array.isArray(runePayload)?runePayload:(runePayload.runes||runePayload.items||[]);
      runeMap=new Map(rows.map(row=>[clean(row.符文名稱||row.名稱||row.name),row]).filter(([name])=>name));

      if(groupResponse.ok){
        const groupPayload=await groupResponse.json();
        const groups=Array.isArray(groupPayload)?groupPayload:(groupPayload.groups||[]);
        groupByRuneId=new Map();
        groups.forEach(group=>{
          (group.runes||[]).forEach(member=>{
            const id=Number(member.id);
            if(Number.isInteger(id)) groupByRuneId.set(id,group);
          });
        });
      }

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
