(() => {
  if (window.__LOC_STATICS_DASHBOARD__) return;
  window.__LOC_STATICS_DASHBOARD__ = true;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const getJSON = async path => {
    const r = await fetch(path,{cache:'no-store'});
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json();
  };

  const card = (title,value,note='') => `<div class="stats-metric"><small>${esc(title)}</small><strong>${esc(value)}</strong>${note?`<span>${esc(note)}</span>`:''}</div>`;

  async function renderSources(){
    const host = document.getElementById('sourcesDashboard');
    if (!host) return;
    try{
      const data = await getJSON('data/json/generated/search/SEARCH_SOURCE_STATS.json');
      const s = data.search_summary || {};
      const t = data.text_summary || {};
      const rows = [...(data.text_sources||[]),...(data.media_sources||[])];
      host.innerHTML = `
        <div class="stats-metrics">
          ${card('可比對總筆數',(s.comparable_records||0).toLocaleString())}
          ${card('可搜尋文字數',(s.char_count||0).toLocaleString(),'字元')}
          ${card('全文搜尋筆數',(t.fulltext_records||0).toLocaleString())}
          ${card('時間範圍',`${t.start_date||'—'} ～ ${t.end_date||'—'}`)}
        </div>
        <div class="stats-table-wrap"><table class="stats-table"><thead><tr><th>來源</th><th>類別</th><th>總筆數</th><th>可搜尋</th><th>時間</th><th>狀態</th></tr></thead><tbody>
        ${rows.map(row=>`<tr><td>${esc(row.source)}</td><td>${esc(row.source_category||row.source_type||'')}</td><td>${Number(row.records||0).toLocaleString()}</td><td>${Number(row.searchable_records ?? row.public_url_records ?? 0).toLocaleString()}</td><td>${esc(`${row.start_date||'—'} ～ ${row.end_date||'—'}`)}</td><td>${esc(row.status||'')}</td></tr>`).join('')}
        </tbody></table></div>`;
    }catch(error){host.innerHTML=`<p class="stats-error">來源統計載入失敗：${esc(error.message)}</p>`;}
  }

  function aggregateThreads(data){
    const map = new Map();
    for (const period of data.periods || []) {
      for (const row of period.keywords || []) {
        const cur = map.get(row.term) || {term:row.term,count:0,hits:0};
        cur.count += Number(row.document_count||0);
        cur.hits += Number(row.hit_count||0);
        map.set(row.term,cur);
      }
    }
    return [...map.values()].sort((a,b)=>b.count-a.count || b.hits-a.hits).slice(0,30);
  }

  function aggregateMusic(data){
    const map = new Map();
    for (const period of data.periods || []) {
      for (const row of period.normalized_top_keywords || []) {
        const cur = map.get(row.term) || {term:row.term,count:0,hits:0};
        cur.count += Number(row.count||0);
        cur.hits += Number(row.count||0);
        map.set(row.term,cur);
      }
    }
    return [...map.values()].sort((a,b)=>b.count-a.count).slice(0,30);
  }

  async function renderRanking(source='threads'){
    const host = document.getElementById('rankingDashboard');
    if (!host) return;
    host.innerHTML = '<p>載入排行榜…</p>';
    try{
      const music = source === 'music';
      const data = await getJSON(music ? 'data/json/registries/LOC3_PERIOD_KEYWORD_ANALYSIS.json' : 'data/json/registries/LOC6_PERIOD_KEYWORD_ANALYSIS.json');
      const rows = music ? aggregateMusic(data) : aggregateThreads(data);
      host.innerHTML = `<div class="stats-tabs"><button type="button" data-stats-rank="threads" ${source==='threads'?'aria-current="true"':''}>文字／Threads</button><button type="button" data-stats-rank="music" ${source==='music'?'aria-current="true"':''}>音樂／LOC3</button></div><div class="ranking-list">${rows.map((row,i)=>`<div class="ranking-row"><span>${i+1}</span><strong>${esc(row.term)}</strong><em>${Number(row.count||0).toLocaleString()}</em></div>`).join('')}</div>`;
    }catch(error){host.innerHTML=`<p class="stats-error">排行榜載入失敗：${esc(error.message)}</p>`;}
  }

  async function renderRunes(){
    const host = document.getElementById('runesDashboard');
    if (!host) return;
    try{
      const data = await getJSON('data/json/core/runes66groups.json');
      const groups = data.groups || [];
      const drawable = groups.reduce((sum,g)=>sum+(g.runes||[]).filter(r=>Number(r.id)>0).length,0);
      host.innerHTML = `<div class="stats-metrics">${card('可抽符文',drawable)}${card('基本八組',8)}${card('特殊符文',2,'玄／命')}${card('治理基準',1,'德，不抽')}</div><div class="rune-group-stats">${groups.map(g=>`<div><strong>${esc(g.group_zh)}</strong><span>${(g.runes||[]).filter(r=>Number(r.id)>0).length} 枚</span><small>${esc(g.trait||g.description||'')}</small></div>`).join('')}</div>`;
    }catch(error){host.innerHTML=`<p class="stats-error">符文統計載入失敗：${esc(error.message)}</p>`;}
  }

  function bind(){
    document.addEventListener('click',event=>{
      const btn = event.target.closest('[data-stats-rank]');
      if (!btn) return;
      renderRanking(btn.dataset.statsRank);
    });
  }

  function start(){renderRanking();renderSources();renderRunes();bind();}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
