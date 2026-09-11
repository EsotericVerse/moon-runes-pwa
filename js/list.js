import { mountQuickSelector } from './quick-selector.js';

document.addEventListener("DOMContentLoaded", async () => {

  const grid = document.querySelector("#rune-grid");
  const count = document.querySelector("#rune-count");
  const toolbar = document.querySelector("#group-filter")?.closest(".toolbar");
  const overviewLink = document.querySelector('.overview-image-link');
  const overviewHead = document.querySelector('.rune-overview-head');
  const overviewCopy = document.querySelector('.rune-overview-head p');
  const downloadSection = document.querySelector('.physical-card-download');
  const headerCopies = Array.from(document.querySelectorAll('.loc-header-copy'));

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

  function keywordForDirection(runeRow, directionName){
    const negative = directionName === '逆位' || directionName === '半逆位';
    if (negative) return runeRow?.負面關鍵詞 || runeRow?.反向關鍵字 || runeRow?.反向關鍵詞 || runeRow?.關鍵詞 || '—';
    return runeRow?.正面關鍵詞 || runeRow?.關鍵詞 || '—';
  }

  function renderRitualPreview(){
    const host = document.querySelector('#ritual-view .ritual-left');
    const r = all.find(item => item.編號 === 65);
    if (!host || !r) return;
    const realPhase = window.LOCMoonPhase?.getRealPhase?.() || sessionStorage.getItem('realPhase') || '未知';
    const keyword = keywordForDirection(r, '正位');
    host.innerHTML = `<article class="rune-result-card" data-density="full"><div class="rune-result-image"><img src="64images/${esc(r.圖檔名稱)}" alt="玄之符文" /></div><div class="rune-result-body"><h2 class="rune-result-name">${esc(r.符文名稱)}${r.英文 ? `<small>${esc(r.英文)}</small>` : ''}</h2><div class="rune-result-grid"><div class="rune-result-field"><span class="rune-result-label">卡片方向</span><span class="rune-result-value">正位</span></div><div class="rune-result-field"><span class="rune-result-label">關鍵詞</span><span class="rune-result-value">${esc(keyword)}</span></div><div class="rune-result-field"><span class="rune-result-label">所屬分組</span><span class="rune-result-value">特殊</span></div><div class="rune-result-field moon"><span class="rune-result-label">卡片月相</span><span class="rune-result-value">${esc(r.月相 || '無')} / 真實月相：${esc(realPhase)}</span></div></div></div></article>`;
  }

  function enhanceDrawCards(){
    document.querySelectorAll('#cards-grid .rune-result-card').forEach(card => {
      const nameNode = card.querySelector('.rune-result-name');
      const name = nameNode?.childNodes?.[0]?.textContent?.trim() || '';
      const runeRow = runeByName.get(name);
      if (!runeRow) return;
      const fields = [...card.querySelectorAll('.rune-result-field')];
      const directionField = fields.find(field => field.querySelector('.rune-result-label')?.textContent.trim() === '卡片方向');
      const directionName = directionField?.querySelector('.rune-result-value')?.textContent.trim() || '';
      if (directionField && !fields.some(field => field.querySelector('.rune-result-label')?.textContent.trim() === '關鍵詞')) {
        const keywordField = document.createElement('div');
        keywordField.className = 'rune-result-field';
        keywordField.innerHTML = `<span class="rune-result-label">關鍵詞</span><span class="rune-result-value">${esc(keywordForDirection(runeRow, directionName))}</span>`;
        directionField.after(keywordField);
      }
      const groupField = [...card.querySelectorAll('.rune-result-field')].find(field => field.querySelector('.rune-result-label')?.textContent.trim() === '所屬分組');
      const groupValue = groupField?.querySelector('.rune-result-value');
      if (groupValue && !groupValue.querySelector('a')) {
        const groupName = runeRow.所屬分組 || '';
        if (['靈魂','連結','生命','自然','礦物','元素','秩序','無序'].includes(groupName)) groupValue.innerHTML = `<a class="rune-result-group-link" href="lots.html?group=${encodeURIComponent(groupName)}#library">${esc(groupName)}組</a>`;
        else groupValue.textContent = groupName === '特殊' || runeRow.編號 >= 65 ? '特殊' : groupName;
      }
    });
  }

  renderRitualPreview();
  const cardsGrid = document.getElementById('cards-grid');
  if (cardsGrid) {
    new MutationObserver(enhanceDrawCards).observe(cardsGrid, { childList:true, subtree:true });
    enhanceDrawCards();
  }

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

  headerCopies.forEach(node => node.remove());
  if (overviewCopy) overviewCopy.textContent = "點選圖上的八個群組，可查看各組說明與符文資料。";

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
});