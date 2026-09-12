(() => {
  if (window.__LOC_STATICS_DASHBOARD__) return;
  window.__LOC_STATICS_DASHBOARD__ = true;

  const GENERAL_PAGE_SIZE = 10;
  const RUNE_PAGE_SIZE = 8;
  const state = {
    ranking: { source: 'threads', page: 1, rows: [] },
    sources: { page: 1, rows: [] },
    runes: { page: 1, rows: [], drawable: 0 }
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const getJSON = async path => {
    const r = await fetch(path,{cache:'no-cache'});
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json();
  };

  const card = (title,value,note='') => `<div class="stats-metric"><small>${esc(title)}</small><strong>${esc(value)}</strong>${note?`<span>${esc(note)}</span>`:''}</div>`;

  function pageNumbers(current,total){
    const out=[];
    const start=Math.max(1,Math.min(current-2,Math.max(1,total-4)));
    const end=Math.min(total,Math.max(5,current+2));
    for(let i=start;i<=end;i++) out.push(i);
    return out;
  }

  function paginationHtml(kind,page,total,pageSize){
    const totalPages=Math.max(1,Math.ceil(total/pageSize));
    if(total<=pageSize) return '';
    const current=Math.min(Math.max(1,page),totalPages);
    const from=(current-1)*pageSize+1;
    const to=Math.min(total,current*pageSize);
    const nums=pageNumbers(current,totalPages);
    let buttons=`<button class="daily-page-btn" type="button" data-stats-page-kind="${kind}" data-stats-page="${current-1}" ${current===1?'disabled':''}>上一頁</button>`;
    if(nums[0]>1){
      buttons+=`<button class="daily-page-btn" type="button" data-stats-page-kind="${kind}" data-stats-page="1">1</button>`;
      if(nums[0]>2) buttons+='<span class="daily-history-page-info">…</span>';
    }
    buttons+=nums.map(n=>`<button class="daily-page-btn ${n===current?'active':''}" type="button" data-stats-page-kind="${kind}" data-stats-page="${n}">${n}</button>`).join('');
    if(nums[nums.length-1]<totalPages){
      if(nums[nums.length-1]<totalPages-1) buttons+='<span class="daily-history-page-info">…</span>';
      buttons+=`<button class="daily-page-btn" type="button" data-stats-page-kind="${kind}" data-stats-page="${totalPages}">${totalPages}</button>`;
    }
    buttons+=`<button class="daily-page-btn" type="button" data-stats-page-kind="${kind}" data-stats-page="${current+1}" ${current===totalPages?'disabled':''}>下一頁</button>`;
    return `<div class="daily-history-pagination"><div class="daily-history-page-info">第 ${from}–${to} 筆，共 ${total} 筆 · 第 ${current} / ${totalPages} 頁</div><div>${buttons}</div></div>`;
  }

  function renderSourcesPage(host,metrics){
    const rows=state.sources.rows;
    const totalPages=Math.max(1,Math.ceil(rows.length/GENERAL_PAGE_SIZE));
    state.sources.page=Math.min(Math.max(1,state.sources.page),totalPages);
    const start=(state.sources.page-1)*GENERAL_PAGE_SIZE;
    const pageRows=rows.slice(start,start+GENERAL_PAGE_SIZE);
    host.innerHTML = `
      ${metrics}
      <div class="stats-table-wrap"><table class="stats-table"><thead><tr><th>來源</th><th>類別</th><th>總筆數</th><th>可搜尋</th><th>文字量</th><th>時間</th><th>狀態</th></tr></thead><tbody>
      ${pageRows.map(row=>`<tr><td>${esc(row.source)}</td><td>${esc(row.source_category||row.source_type||'')}</td><td>${Number(row.records||0).toLocaleString()}</td><td>${Number(row.searchable_records ?? row.public_url_records ?? 0).toLocaleString()}</td><td>${row.char_count_applicable===false?'—':`${Number(row.char_count||0).toLocaleString()} 字`}</td><td>${esc(`${row.start_date||'—'} ～ ${row.end_date||'—'}`)}</td><td>${esc(row.status||'')}</td></tr>`).join('')}
      </tbody></table></div>
      ${paginationHtml('sources',state.sources.page,rows.length,GENERAL_PAGE_SIZE)}`;
  }

  async function renderSources(){
    const host = document.getElementById('sourcesDashboard');
    if (!host) return;
    try{
      const data = await getJSON('data/json/generated/search/SEARCH_SOURCE_STATS.json');
      const s = data.search_summary || {};
      const t = data.text_summary || {};
      state.sources.rows = [...(data.text_sources||[]),...(data.media_sources||[])];
      const metrics=`<div class="stats-metrics">
        ${card('可比對總筆數',(s.comparable_records||0).toLocaleString())}
        ${card('可搜尋文字數',(s.char_count||0).toLocaleString(),'字元')}
        ${card('全文搜尋筆數',(t.fulltext_records||0).toLocaleString())}
        ${card('時間範圍',`${t.start_date||'—'} ～ ${t.end_date||'—'}`)}
      </div>`;
      host.dataset.metrics=metrics;
      renderSourcesPage(host,metrics);
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

  function splitStyle(value){
    return String(value||'').split(/[｜|,，;/；\n]+/).map(item=>item.trim()).filter(Boolean);
  }

  async function aggregateStyles(){
    const manifestPath = 'data/json/search/loc3/LOC3_LYRICS_SEARCH_v0.1.json';
    const manifest = await getJSON(manifestPath);
    const names = Array.isArray(manifest.shards) ? manifest.shards : [];
    const base = manifestPath.slice(0,manifestPath.lastIndexOf('/')+1);
    const map = new Map();
    for (const name of names) {
      const payload = await getJSON(`${base}${name}`);
      for (const work of payload.works || []) {
        const seen = new Set(splitStyle(work.style));
        for (const term of seen) map.set(term,(map.get(term)||0)+1);
      }
    }
    return [...map.entries()].map(([term,count])=>({term,count})).sort((a,b)=>b.count-a.count || a.term.localeCompare(b.term,'zh-Hant')).slice(0,30);
  }

  function renderRankingPage(host){
    const rows=state.ranking.rows;
    const totalPages=Math.max(1,Math.ceil(rows.length/GENERAL_PAGE_SIZE));
    state.ranking.page=Math.min(Math.max(1,state.ranking.page),totalPages);
    const start=(state.ranking.page-1)*GENERAL_PAGE_SIZE;
    const pageRows=rows.slice(start,start+GENERAL_PAGE_SIZE);
    const source=state.ranking.source;
    host.innerHTML = `<div class="stats-tabs"><button type="button" data-stats-rank="threads" ${source==='threads'?'aria-current="true"':''}>文字／Threads</button><button type="button" data-stats-rank="music" ${source==='music'?'aria-current="true"':''}>音樂關鍵字</button><button type="button" data-stats-rank="styles" ${source==='styles'?'aria-current="true"':''}>曲風</button></div><div class="ranking-list">${pageRows.map((row,i)=>`<div class="ranking-row"><span>${start+i+1}</span><strong>${esc(row.term)}</strong><em>${Number(row.count||0).toLocaleString()}</em></div>`).join('')}</div>${paginationHtml('ranking',state.ranking.page,rows.length,GENERAL_PAGE_SIZE)}`;
  }

  async function renderRanking(source='threads'){
    const host = document.getElementById('rankingDashboard');
    if (!host) return;
    host.innerHTML = '<p>載入排行榜…</p>';
    try{
      let rows = [];
      if (source === 'styles') rows = await aggregateStyles();
      else {
        const music = source === 'music';
        const data = await getJSON(music ? 'data/json/registries/LOC3_PERIOD_KEYWORD_ANALYSIS.json' : 'data/json/registries/LOC6_PERIOD_KEYWORD_ANALYSIS.json');
        rows = music ? aggregateMusic(data) : aggregateThreads(data);
      }
      state.ranking.source=source;
      state.ranking.page=1;
      state.ranking.rows=rows;
      renderRankingPage(host);
    }catch(error){host.innerHTML=`<p class="stats-error">排行榜載入失敗：${esc(error.message)}</p>`;}
  }

  function renderRunesPage(host){
    const rows=state.runes.rows;
    const totalPages=Math.max(1,Math.ceil(rows.length/RUNE_PAGE_SIZE));
    state.runes.page=Math.min(Math.max(1,state.runes.page),totalPages);
    const start=(state.runes.page-1)*RUNE_PAGE_SIZE;
    const pageRows=rows.slice(start,start+RUNE_PAGE_SIZE);
    host.innerHTML = `<div class="stats-metrics">${card('可抽符文',state.runes.drawable)}${card('基本八組',8)}${card('特殊符文',2,'玄／命')}${card('治理基準',1,'德，不抽')}</div><div class="rune-group-stats">${pageRows.map(g=>`<div><strong>${esc(g.group_zh)}</strong><span>${(g.runes||[]).filter(r=>Number(r.id)>0).length} 枚</span><small>${esc(g.trait||g.description||'')}</small></div>`).join('')}</div>${paginationHtml('runes',state.runes.page,rows.length,RUNE_PAGE_SIZE)}`;
  }

  async function renderRunes(){
    const host = document.getElementById('runesDashboard');
    if (!host) return;
    try{
      const data = await getJSON('data/json/core/runes66groups.json');
      const groups = data.groups || [];
      state.runes.rows=groups;
      state.runes.page=1;
      state.runes.drawable=groups.reduce((sum,g)=>sum+(g.runes||[]).filter(r=>Number(r.id)>0).length,0);
      renderRunesPage(host);
    }catch(error){host.innerHTML=`<p class="stats-error">符文統計載入失敗：${esc(error.message)}</p>`;}
  }

  function bind(){
    document.addEventListener('click',event=>{
      const rankBtn = event.target.closest('[data-stats-rank]');
      if(rankBtn){renderRanking(rankBtn.dataset.statsRank);return;}
      const pageBtn=event.target.closest('[data-stats-page]');
      if(!pageBtn||pageBtn.disabled)return;
      const page=Number(pageBtn.dataset.statsPage||1);
      if(!Number.isFinite(page)||page<1)return;
      const kind=pageBtn.dataset.statsPageKind;
      if(kind==='ranking'){
        state.ranking.page=page;
        const host=document.getElementById('rankingDashboard');
        if(host)renderRankingPage(host);
      }else if(kind==='sources'){
        state.sources.page=page;
        const host=document.getElementById('sourcesDashboard');
        if(host)renderSourcesPage(host,host.dataset.metrics||'');
      }else if(kind==='runes'){
        state.runes.page=page;
        const host=document.getElementById('runesDashboard');
        if(host)renderRunesPage(host);
      }
    });
  }

  function start(){renderRanking();renderSources();renderRunes();bind();}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();