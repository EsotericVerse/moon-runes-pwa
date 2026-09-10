import { mountQuickSelector } from './quick-selector.js';

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('#rune-grid');
  const count = document.querySelector('#rune-count');
  const overviewLink = document.querySelector('.overview-image-link');
  const overviewHead = document.querySelector('.rune-overview-head');
  const overviewCopy = document.querySelector('.rune-overview-head p');
  const downloadSection = document.querySelector('.physical-card-download');

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const realPhase = window.LOCMoonPhase?.getRealPhase?.() || sessionStorage.getItem('realPhase') || '未知';

  let runeRows = [];
  let groups = [];
  try {
    const [runeResponse, groupResponse] = await Promise.all([
      fetch('data/json/core/runes66.json', { cache: 'no-store' }),
      fetch('data/json/core/runes66groups.json', { cache: 'no-store' })
    ]);
    if (!runeResponse.ok) throw new Error(`runes66.json HTTP ${runeResponse.status}`);
    if (!groupResponse.ok) throw new Error(`runes66groups.json HTTP ${groupResponse.status}`);

    runeRows = await runeResponse.json();
    const groupPayload = await groupResponse.json();
    if (!Array.isArray(runeRows)) throw new Error('Current runes66 schema must be a JSON array');
    groups = Array.isArray(groupPayload) ? groupPayload : (groupPayload.groups || []);
  } catch (error) {
    console.error('Rune library data load failed', error);
    if (grid) grid.innerHTML = '<div class="empty">符文資料載入失敗，請重新整理頁面。</div>';
    return;
  }

  const groupByRuneId = new Map();
  for (const meta of groups) {
    for (const member of meta.runes || []) {
      const id = Number(member.id);
      if (Number.isInteger(id)) groupByRuneId.set(id, meta);
    }
  }

  // Current schema only. Do not accept runes64-era aliases or merged Spec/History fields.
  function normalize(row) {
    const id = Number(row.編號);
    const name = row.符文名稱 ?? '';
    return {
      編號: id,
      符文名稱: name,
      英文: row.英文 ?? '',
      圖騰: row.圖騰 ?? null,
      所屬分組: row.所屬分組 ?? '',
      月相: row.月相 ?? '無',
      卡片屬性: row.卡片屬性 ?? '',
      關鍵詞: row.關鍵詞 ?? '',
      反向關鍵詞: row.反向關鍵詞 ?? '',
      特別說明: row.特別說明 ?? '',
      正向表示: row.正向表示 ?? '',
      半正向表示: row.半正向表示 ?? '',
      半逆向表示: row.半逆向表示 ?? '',
      逆向表示: row.逆向表示 ?? '',
      圖檔名稱: id > 0 && name ? `${String(id).padStart(2, '0')}_${name}.png` : null,
      drawable: id >= 1 && id <= 66,
      group_meta: groupByRuneId.get(id) || null
    };
  }

  const all = runeRows.map(normalize).filter(r => Number.isInteger(r.編號) && r.編號 >= 0 && r.編號 <= 66);

  function cardDetails(r) {
    return `
      <div class="rune-card-current-details">
        <p><strong>關鍵詞：</strong>${esc(r.關鍵詞 || '—')}</p>
        <p><strong>所屬分組：</strong>${esc(r.所屬分組 || '—')}</p>
        <p><strong>卡片屬性：</strong>${esc(r.卡片屬性 || '—')}</p>
        <p><strong>卡片月相：</strong>${esc(r.月相 || '無')} / <strong>真實月相：</strong>${esc(realPhase)}</p>
      </div>`;
  }

  function tile(r) {
    const n = String(r.編號).padStart(2, '0');
    const visual = r.圖檔名稱
      ? `<img class="rune-thumb" src="64images/${encodeURIComponent(r.圖檔名稱)}" alt="${esc(r.符文名稱)}符文卡面縮圖" loading="lazy" decoding="async" />`
      : '';
    return `<article class="rune-tile">${visual}<div class="rune-info"><span class="num">#${n}</span><span class="en">${esc(r.英文)}</span><strong class="name">${esc(r.符文名稱)}之符文</strong>${cardDetails(r)}</div></article>`;
  }

  function specialTile(r) {
    const n = String(r.編號).padStart(2, '0');
    const visual = r.圖檔名稱
      ? `<img class="rune-thumb" src="64images/${encodeURIComponent(r.圖檔名稱)}" alt="${esc(r.符文名稱)}符文卡面" loading="lazy" decoding="async" />`
      : '';
    return `<article class="special-rune-card">${visual}<div class="special-rune-copy"><span class="num">#${n}</span><div class="special-rune-name"><span>${esc(r.英文)}</span><strong>${esc(r.符文名稱)}之符文</strong></div>${cardDetails(r)}</div></article>`;
  }

  function renderRitualPreview() {
    const host = document.querySelector('#ritual-view .ritual-left');
    const r = all.find(item => item.編號 === 65);
    if (!host || !r) return;
    host.innerHTML = `
      <article class="rune-result-card" data-density="full">
        <div class="rune-result-image"><img src="64images/${esc(r.圖檔名稱)}" alt="玄之符文" /></div>
        <div class="rune-result-body">
          <span class="rune-result-english">${esc(r.英文)}</span>
          <h2 class="rune-result-name">${esc(r.符文名稱)}之符文</h2>
          <div class="rune-result-grid">
            <div class="rune-result-field"><span class="rune-result-label">關鍵詞</span><span class="rune-result-value">${esc(r.關鍵詞)}</span></div>
            <div class="rune-result-field"><span class="rune-result-label">所屬分組</span><span class="rune-result-value">${esc(r.所屬分組)}</span></div>
            <div class="rune-result-field"><span class="rune-result-label">卡片屬性</span><span class="rune-result-value">${esc(r.卡片屬性)}</span></div>
            <div class="rune-result-field moon"><span class="rune-result-label">卡片月相</span><span class="rune-result-value">${esc(r.月相 || '無')} / 真實月相：${esc(realPhase)}</span></div>
          </div>
        </div>
      </article>`;
  }

  renderRitualPreview();

  const coreGroups = groups.filter(meta => (meta.runes || []).some(member => Number(member.id) >= 1 && Number(member.id) <= 64));
  const specialRunes = all.filter(r => r.編號 === 65 || r.編號 === 66).sort((a,b) => a.編號 - b.編號);

  if (overviewHead && !overviewHead.querySelector('.rune-overview-summary')) {
    const summary = document.createElement('p');
    summary.className = 'rune-overview-summary';
    summary.innerHTML = `1–64 為八個基本群組，65「玄」與 66「命」為特殊符文；第 0 符「德」不參與抽牌。`;
    overviewHead.insertBefore(summary, overviewCopy || null);
  }

  if (overviewCopy) overviewCopy.textContent = '選擇群組查看符文資料。';

  if (overviewLink && coreGroups.length) {
    const quickHost = document.createElement('div');
    quickHost.id = 'rune-group-quick-selector';
    overviewLink.after(quickHost);

    const quickItems = coreGroups.map(meta => ({
      id: meta.id || meta.group_en || meta.group_zh,
      label: meta.group_zh,
      kicker: meta.group_en,
      title: meta.group_zh,
      description: meta.description,
      extra: [meta.trait, meta.style_module].filter(Boolean),
      runeIds: (meta.runes || []).map(member => Number(member.id)).filter(id => id >= 1 && id <= 64)
    }));

    const quickSelector = mountQuickSelector({
      target: quickHost,
      imageTarget: overviewLink,
      display: 'modal',
      items: quickItems,
      renderContent: item => {
        const ids = new Set(item.runeIds || []);
        const items = all.filter(r => ids.has(r.編號)).sort((a,b) => a.編號 - b.編號);
        return `<div class="group-row">${items.map(tile).join('')}</div>`;
      }
    });

    const requestedGroup = new URLSearchParams(location.search).get('group');
    if (requestedGroup && quickSelector) {
      const requestedItem = quickItems.find(item => item.label === requestedGroup || item.id === requestedGroup);
      if (requestedItem) setTimeout(() => quickSelector.select(requestedItem.id, true), 0);
    }
  }

  if (specialRunes.length && !document.querySelector('.special-rune-section')) {
    const specialSection = document.createElement('section');
    specialSection.className = 'special-rune-section';
    specialSection.setAttribute('aria-label', '特殊符文');
    specialSection.innerHTML = `<h2>特殊符文</h2><p>玄與命位於 1–64 八組之外。</p><div class="special-rune-row">${specialRunes.map(specialTile).join('')}</div>`;
    if (downloadSection) downloadSection.before(specialSection);
    else overviewLink?.closest('.rune-overview')?.after(specialSection);
  }

  if (grid) {
    grid.innerHTML = '';
    grid.hidden = true;
  }
  if (count) count.textContent = '8 組 · 64 枚基本符文 + 2 枚特殊符文';
});
