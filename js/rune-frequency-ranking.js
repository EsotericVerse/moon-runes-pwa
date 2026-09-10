(() => {
  const STATS_URL = 'data/json/generated/LOC_RUNE_FREQUENCY_STATS.json';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  function section(title, subtitle, body, id) {
    const el = document.createElement('section');
    el.className = 'ranking-panel';
    if (id) el.id = id;
    el.innerHTML = `
      <div class="ranking-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div></div>
      ${body}`;
    return el;
  }

  function rankingRows(rows, labelKey, countLabel, queryable = false) {
    if (!rows.length) return '<div class="empty">目前沒有可統計資料。</div>';
    return `<div class="ranking-list">${rows.map((row, i) => {
      const label = row[labelKey];
      return `<div class="ranking-row">
        <div class="rank">#${i + 1}</div>
        <div class="term">${esc(label)}</div>
        <div class="metric">${Number(row.count || 0).toLocaleString('zh-TW')} ${esc(countLabel)}</div>
        <div class="metric secondary">${labelKey === 'rune' ? esc(row.group || '') : '群組總數'}</div>
        ${queryable ? `<button type="button" data-rune-query="${esc(label)}之符文">查看內容 →</button>` : '<span></span>'}
      </div>`;
    }).join('')}</div>`;
  }

  async function loadRuneFrequencyRanking() {
    const host = document.getElementById('rankingView');
    if (!host || document.getElementById('runeFrequencySummaryPanel')) return;

    try {
      const response = await fetch(STATS_URL, {cache: 'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const stats = await response.json();

      const summary = section(
        '月之符文統計',
        '所有已結構化的符文命中直接累加；抽牌、作品符文與語意分類可各自形成有效命中。',
        `<div class="ranking-scope">總符文命中 ${Number(stats.total_rune_hits || 0).toLocaleString('zh-TW')} 次 · 有紀錄符文 ${Number(stats.distinct_runes_with_hits || 0)} / 66</div>`,
        'runeFrequencySummaryPanel'
      );

      const runePanel = section(
        '66 符文總數排行',
        '依每一枚符文在目前結構化資料中的累積命中次數排序。',
        rankingRows((stats.rune_ranking || []).slice(0, 66), 'rune', '次', true),
        'runeFrequencyRankingPanel'
      );

      const groupPanel = section(
        '符文群組總數排行',
        '八大群組加特殊符文；各群組總數為所屬符文命中的直接加總。',
        rankingRows(stats.group_ranking || [], 'group', '次', false),
        'runeGroupRankingPanel'
      );

      const firstPanel = host.querySelector('.ranking-panel');
      if (firstPanel) {
        host.insertBefore(groupPanel, firstPanel);
        host.insertBefore(runePanel, groupPanel);
        host.insertBefore(summary, runePanel);
      } else {
        host.append(summary, runePanel, groupPanel);
      }

      host.querySelectorAll('[data-rune-query]').forEach(btn => btn.addEventListener('click', () => {
        const query = document.getElementById('query');
        if (!query) return;
        query.value = btn.dataset.runeQuery || '';
        document.querySelector('[data-search-view="query"]')?.click();
        document.getElementById('searchForm')?.requestSubmit();
      }));
    } catch (error) {
      const panel = section(
        '月之符文統計',
        '統計快照尚未產生或目前不可用。',
        `<div class="empty">符文統計暫時無法載入：${esc(error.message || error)}</div>`,
        'runeFrequencySummaryPanel'
      );
      host.prepend(panel);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadRuneFrequencyRanking);
  else loadRuneFrequencyRanking();
})();
