(() => {
  const DATA_URL = 'data/json/search/faq/LOC_KM_CONCEPTS_v0.1.json';
  const PANEL_ID = 'locKmConceptResults';
  let dataset = null;
  let loading = null;
  let rendering = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const norm = value => String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();

  function loadData() {
    if (dataset) return Promise.resolve(dataset);
    if (loading) return loading;
    loading = fetch(DATA_URL, {cache:'no-store'})
      .then(r => {
        if (!r.ok) throw new Error('KM concepts HTTP ' + r.status);
        return r.json();
      })
      .then(data => (dataset = data))
      .finally(() => { loading = null; });
    return loading;
  }

  function scoreChunk(query, row) {
    const q = norm(query);
    if (!q) return 0;
    const fields = [
      row.intent,
      row.question,
      ...(row.aliases || []),
      ...(row.keywords || []),
      row.answer
    ].map(norm).filter(Boolean);

    let score = 0;
    for (const field of fields) {
      if (field === q) score += 120;
      else if (field.includes(q)) score += 50;
      else if (q.includes(field) && field.length >= 2) score += 25;
    }

    for (const token of String(query).split(/[\s、，,／/]+/).map(norm).filter(x => x.length >= 2)) {
      if (fields.some(field => field.includes(token))) score += 8;
    }
    return score;
  }

  function makePanel(rows) {
    const section = document.createElement('section');
    section.id = PANEL_ID;
    section.className = 'group';
    section.dataset.kmConceptResults = 'true';
    section.innerHTML = `
      <div class="grouphead"><h2>KM 概念</h2><span>LOC 現行概念說明</span></div>
      <div class="cards">
        ${rows.map(({row}) => `
          <article class="card">
            <div class="meta"><span class="pill">${esc(row.category || 'KM')}</span><span class="pill">creator-confirmed</span></div>
            <h3>${esc(row.question || row.intent || row.id)}</h3>
            <p class="summary">${esc(row.answer || '')}</p>
          </article>`).join('')}
      </div>`;
    return section;
  }

  async function render() {
    if (rendering) return;
    const host = document.getElementById('groups');
    const input = document.getElementById('query');
    if (!host || !input) return;

    const query = input.value.trim();
    const old = document.getElementById(PANEL_ID);
    if (!query) {
      old?.remove();
      return;
    }

    rendering = true;
    try {
      const data = await loadData();
      const rows = (data.chunks || [])
        .map(row => ({row, score: scoreChunk(query, row)}))
        .filter(x => x.score > 0)
        .sort((a,b) => b.score - a.score)
        .slice(0, 4);

      document.getElementById(PANEL_ID)?.remove();
      if (rows.length) host.prepend(makePanel(rows));
    } catch (error) {
      console.warn('KM concept search unavailable', error);
    } finally {
      rendering = false;
    }
  }

  function boot() {
    const host = document.getElementById('groups');
    const form = document.getElementById('searchForm');
    const input = document.getElementById('query');
    if (!host || !form || !input) return;

    form.addEventListener('submit', () => setTimeout(render, 0));
    input.addEventListener('change', render);

    const observer = new MutationObserver(() => {
      if (rendering) return;
      if (!document.getElementById(PANEL_ID)) setTimeout(render, 0);
    });
    observer.observe(host, {childList:true});

    if (input.value.trim()) render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
