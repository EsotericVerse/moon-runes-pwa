(() => {
  const FACETS_URL = 'data/json/registries/LOC3_FACETS.json';
  const REGISTRY_URL = 'data/json/registries/LOC3_STYLE_TAG_REGISTRY.json';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const norm = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();

  function containsAlias(raw, alias) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(raw);
  }

  function tagsForRaw(rawValue, registry) {
    const raw = norm(rawValue);
    const out = [];
    const seen = new Set();
    const add = tag => {
      const key = norm(tag);
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(tag);
      }
    };

    for (const bucket of registry.legacy_bucket_aliases || []) {
      if (norm(bucket.raw) === raw) (bucket.tags || []).forEach(add);
    }
    for (const item of registry.tags || []) {
      const aliases = item.aliases || [];
      if (aliases.some(alias => containsAlias(raw, norm(alias)))) add(item.tag);
    }
    return out;
  }

  async function loadRanking() {
    const host = document.getElementById('rankingView');
    if (!host || document.getElementById('loc3StyleRankingPanel')) return;

    const section = document.createElement('section');
    section.className = 'ranking-panel';
    section.id = 'loc3StyleRankingPanel';
    section.style.marginTop = '18px';
    section.innerHTML = `
      <div class="ranking-head"><div><h2>音樂曲風 Top 10</h2><p>LOC3 標準化曲風 tag；以作品計數，同一作品同一曲風只算一次。</p></div></div>
      <div class="ranking-scope" id="loc3StyleRankingScope">載入曲風統計中…</div>
      <div class="ranking-list" id="loc3StyleRankingList"><div class="empty">載入中…</div></div>`;

    const usage = document.getElementById('searchUsageList')?.closest('.ranking-panel');
    if (usage) host.insertBefore(section, usage);
    else host.appendChild(section);

    const scope = document.getElementById('loc3StyleRankingScope');
    const list = document.getElementById('loc3StyleRankingList');

    try {
      const [facets, registry] = await Promise.all([
        fetch(FACETS_URL, {cache:'no-store'}).then(r => { if (!r.ok) throw new Error('LOC3 facets 載入失敗'); return r.json(); }),
        fetch(REGISTRY_URL, {cache:'no-store'}).then(r => { if (!r.ok) throw new Error('曲風字典載入失敗'); return r.json(); })
      ]);

      const counts = new Map();
      for (const row of facets.facets?.styles || []) {
        const count = Number(row.count || 0);
        for (const tag of tagsForRaw(row.value, registry)) {
          counts.set(tag, (counts.get(tag) || 0) + count);
        }
      }

      const rows = [...counts.entries()]
        .map(([tag, count]) => ({tag, count}))
        .sort((a,b) => b.count - a.count || a.tag.localeCompare(b.tag, 'en'))
        .slice(0, 10);

      const workCount = Number(facets.dataset?.work_count || 0);
      scope.textContent = `LOC3 音樂作品 ${workCount.toLocaleString('zh-TW')} 首 · 固定曲風字典 · 不使用 API／語意推論`;
      list.innerHTML = rows.length
        ? rows.map((row, i) => `<div class="ranking-row"><div class="rank">#${i+1}</div><div class="term">${esc(row.tag)}</div><div class="metric">${row.count.toLocaleString('zh-TW')} 首</div><div class="metric secondary">作品數</div><button type="button" data-style-query="${esc(row.tag)}">搜尋 →</button></div>`).join('')
        : '<div class="empty">目前沒有可統計的標準曲風 tag。</div>';

      list.querySelectorAll('[data-style-query]').forEach(btn => btn.addEventListener('click', () => {
        const query = document.getElementById('query');
        if (!query) return;
        query.value = btn.dataset.styleQuery || '';
        document.querySelector('[data-search-view="query"]')?.click();
        document.getElementById('searchForm')?.requestSubmit();
      }));
    } catch (error) {
      scope.textContent = 'LOC3 曲風統計';
      list.innerHTML = `<div class="empty">曲風排行榜暫時無法載入：${esc(error.message || error)}</div>`;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadRanking);
  else loadRanking();
})();
