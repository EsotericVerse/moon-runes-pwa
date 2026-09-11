import { mountQuickSelector } from './quick-selector.js';

async function initRunePage() {
  const file = location.pathname.split("/").pop() || "";
  if (!["runes.html", "lots.html"].includes(file)) return;

  const grid = document.querySelector("#rune-grid");
  const count = document.querySelector("#rune-count");
  const toolbar = document.querySelector("#group-filter")?.closest(".toolbar");
  const overviewLink = document.querySelector('.overview-image-link');
  const overviewHead = document.querySelector('.rune-overview-head');
  const overviewCopy = document.querySelector('.rune-overview-head p');
  const downloadSection = document.querySelector('.physical-card-download');

  toolbar?.remove();

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  let runeRows = [];
  let groups = [];
  try {
    const [runeResponse, groupResponse] = await Promise.all([
      fetch("data/json/core/runes66.json", { cache: "no-store" }),
      fetch("data/json/core/runes66groups.json", { cache: "no-store" })
    ]);
    if (!runeResponse.ok) throw new Error(`runes66.json HTTP ${runeResponse.status}`);
    if (!groupResponse.ok) throw new Error(`runes66groups.json HTTP ${groupResponse.status}`);
    const runePayload = await runeResponse.json();
    const groupPayload = await groupResponse.json();
    runeRows = Array.isArray(runePayload) ? runePayload : (runePayload.runes || []);
    groups = Array.isArray(groupPayload) ? groupPayload : (groupPayload.groups || []);
  } catch (error) {
    console.error("Rune library data load failed", error);
    if (grid) grid.innerHTML = '<div class="empty">符文資料載入失敗，請重新整理頁面。</div>';
    return;
  }

  const groupByRuneId = new Map();
  for (const meta of groups) for (const member of meta.runes || []) {
    const id = Number(member.id);
    if (Number.isInteger(id)) groupByRuneId.set(id, meta);
  }

  function normalize(row){
    const id = Number(row.編號 ?? row.id);
    const meta = groupByRuneId.get(id) || null;
    const member = meta?.runes?.find(x => Number(x.id) === id);
    const name = row.符文名稱 ?? row.名稱 ?? row.name ?? member?.zh ?? "";
    return {...row,編號:id,符文名稱:name,英文:row.英文 ?? row.english ?? member?.en ?? "",所屬分組:meta?.group_zh ?? row.所屬分組 ?? row.group ?? "",月相:row.月相 ?? row.moon_phase ?? "",顯化形式:row.顯化形式 ?? row.keyword ?? "",關鍵詞:row.關鍵詞 ?? row.keyword ?? "",反向關鍵字:row.反向關鍵字 ?? row.反向關鍵詞 ?? row.reverse_keyword ?? "",符文變化歷史:row.history?.符文變化歷史 ?? row.符文變化歷史 ?? "",圖檔名稱:row.image ?? row.圖檔名稱 ?? (id > 0 && name ? `${String(id).padStart(2,"0")}_${name}.png` : null),drawable:row.drawable ?? (id >= 1 && id <= 66),group_meta:meta};
  }

  const all = runeRows.map(normalize).filter(r => Number.isInteger(r.編號) && r.編號 >= 0 && r.編號 <= 66);
  const runeByName = new Map(all.filter(r => r.符文名稱).map(r => [r.符文名稱, r]));

  function infoBox(label, value){
    if (!value) return "";
    return `<div class="loc-rune-info-bubble"><strong>${esc(label)}</strong><span>${esc(value)}</span></div>`;
  }

  function tile(r){
    const n = String(r.編號).padStart(2,"0");
    const visual = `<img class="rune-thumb" src="64images/${encodeURIComponent(r.圖檔名稱)}" alt="${esc(r.符文名稱)}符文卡面縮圖" loading="lazy" decoding="async" />`;
    const infoPanel = `<div class="rune-info-panel">${infoBox("卡片月相", r.月相)}${infoBox("關鍵詞", r.關鍵詞)}${infoBox("反向關鍵詞", r.反向關鍵字)}${infoBox("符文變化歷史", r.符文變化歷史)}</div>`;
    return `<article class="rune-tile">${visual}<div class="rune-info"><span class="num">#${n}</span><div class="rune-name-line"><strong>${esc(r.符文名稱)}</strong>${r.英文 ? `<span>${esc(r.英文)}</span>` : ""}</div>${infoPanel}</div></article>`;
  }

  function specialTile(r){
    const n = String(r.編號).padStart(2,"0");
    const meta = [["卡片月相", r.月相],["關鍵詞", r.關鍵詞],["反向關鍵詞", r.反向關鍵字],["符文變化歷史", r.符文變化歷史]].filter(([,value]) => value && String(value).trim());
    return `<article class="special-rune-card"><img class="rune-thumb" src="64images/${encodeURIComponent(r.圖檔名稱)}" alt="${esc(r.符文名稱)}符文卡面" loading="lazy" decoding="async" /><div class="special-rune-copy"><span class="num">#${n}</span><div class="special-rune-name"><strong>${esc(r.符文名稱)}</strong>${r.英文 ? `<span>${esc(r.英文)}</span>` : ""}</div><div class="special-rune-meta">${meta.map(([label,value]) => `<p><strong>${esc(label)}</strong>${esc(value)}</p>`).join("")}</div></div></article>`;
  }

  const coreGroups = groups.filter(meta => (meta.runes || []).some(member => Number(member.id) >= 1 && Number(member.id) <= 64));
  const specialRunes = all.filter(r => r.編號 === 65 || r.編號 === 66).sort((a,b) => a.編號 - b.編號);

  if (overviewHead) {
    const summary = document.createElement('p');
    summary.className = 'rune-overview-summary';
    summary.innerHTML = `資料共 67 筆：1–64 為八個基本群組，65「玄」與 66「命」為特殊符文；第 0 符「德」為作者／月語者誌銘，不參與抽牌、沒有卡面。<a href="governance.html#de-rune">了解德之符文的治理定位 →</a>`;
    overviewHead.insertBefore(summary, overviewCopy || null);
  }


  if (overviewLink && coreGroups.length) {
    const quickHost = document.createElement('div');
    quickHost.id = 'rune-group-quick-selector';
    overviewLink.after(quickHost);
    const quickItems = coreGroups.map(meta => ({id:meta.id || meta.group_en || meta.group_zh,label:meta.group_zh,kicker:meta.group_en,title:meta.group_zh,description:meta.description,extra:[meta.trait ? `特質：${meta.trait}` : '',meta.style_module ? `風格模組：${meta.style_module}` : '',Array.isArray(meta.possible_tone) && meta.possible_tone.length ? `可能語氣：${meta.possible_tone.join('、')}` : ''].filter(Boolean),href:`search.html?q=${encodeURIComponent(`月之符文 ${meta.group_zh}群組 方法論`)}`,linkLabel:`搜尋${meta.group_zh}群組方法論`,runeIds:(meta.runes || []).map(member => Number(member.id)).filter(id => id >= 1 && id <= 64)}));
    const quickSelector = mountQuickSelector({target:quickHost,imageTarget:overviewLink,display:'modal',items:quickItems,renderContent:item => {const ids = new Set(item.runeIds || []);const items = all.filter(r => ids.has(r.編號)).sort((a,b) => a.編號 - b.編號);return `<div class="group-row">${items.map(tile).join("")}</div>`;}});
    const requestedGroup = new URLSearchParams(location.search).get('group');
    if (requestedGroup && quickSelector) {
      const requestedItem = quickItems.find(item => item.label === requestedGroup || item.id === requestedGroup);
      if (requestedItem) setTimeout(() => quickSelector.select(requestedItem.id, true), 0);
    }
  }

  if (specialRunes.length) {
    const specialSection = document.createElement('section');
    specialSection.className = 'special-rune-section';
    specialSection.setAttribute('aria-label', '特殊符文');
    specialSection.innerHTML = `<h2>特殊符文</h2><p>玄與命位於 1–64 八組之外。</p><div class="special-rune-row">${specialRunes.map(specialTile).join("")}</div>`;
    if (downloadSection) downloadSection.before(specialSection); else overviewLink?.closest('.rune-overview')?.after(specialSection);
  }

  if (grid) { grid.innerHTML = ""; grid.hidden = true; }
  if (count) count.textContent = "8 組 · 64 枚基本符文 + 2 枚特殊符文";
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initRunePage, {once:true});
else initRunePage();

/* Shared LunaRunes dynamic card presentation.
   Fixed page copy belongs in HTML; this section only governs dynamic rune/search cards. */
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
