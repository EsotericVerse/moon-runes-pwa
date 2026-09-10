(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const loaded=new Set();

  function viewName(){return (location.hash||'#ranking').slice(1)||'ranking';}
  function loadScript(src,key){if(document.querySelector(`script[data-static-module="${key}"]`))return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.dataset.staticModule=key;s.onload=resolve;s.onerror=reject;document.body.appendChild(s)});}

  function navMarkup(name){
    if(name==='rune-trend'){
      return `
        <div class="nav-group"><a href="tutorial01.html"><strong>新手上路</strong><small>月之符文入門</small></a></div>
        <div class="nav-group"><a href="lots.html#draw"><strong>占卜抽籤</strong><small>線上即時抽牌引擎</small></a></div>
        <div class="nav-group"><a href="lots.html#library"><strong>符文總覽</strong><small>66 符 · 群組</small></a></div>
        <div class="nav-group"><a class="active" href="#rune-trend" data-statics-nav="rune-trend"><strong>符文統計</strong><small>每日符文 · 紀錄 · 趨勢</small></a></div>
        <div class="nav-group"><a href="runes.html#rag"><strong>符文知識庫</strong><small>RAG · 占卜解析 · 演算法</small></a></div>`;
    }
    return `
      <div class="nav-group"><a href="#ranking" data-statics-nav="ranking"><strong>排行榜</strong><small>關鍵字 · 曲風 · 符文</small></a></div>
      <div class="nav-group"><a href="#sources" data-statics-nav="sources"><strong>資料來源</strong><small>平台 · 日期 · 字數 · 筆數</small></a></div>
      <div class="nav-group"><a class="statics-placeholder" href="#import" aria-disabled="true" tabindex="-1"><strong>匯入</strong><small>暫時不開放</small></a></div>`;
  }

  function navNode(){return $('.loc-secondary-nav')||$('.sidebar .nav');}
  function paintSecondaryNav(name){
    const nav=navNode();
    if(!nav)return;
    nav.innerHTML=navMarkup(name);
    nav.classList.add('loc-secondary-nav');
    bindNav();
  }
  function switchView(name,update=true){
    const valid=['ranking','sources','rune-trend'];
    if(!valid.includes(name))name='ranking';
    $$('.statics-view').forEach(v=>v.hidden=v.dataset.view!==name);
    paintSecondaryNav(name);
    $$('[data-statics-nav]').forEach(a=>a.classList.toggle('active',a.dataset.staticsNav===name));
    if(update)history.replaceState(null,'','statics.html#'+name);
    loadView(name);
  }

  async function loadRanking(){
    if(loaded.has('ranking'))return;loaded.add('ranking');const host=$('#keywordRankingList');
    try{const sources=['facebook','threads','suno'];const settled=await Promise.allSettled(sources.map(async source=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch('https://moon-runes-pwa.onrender.com/analysis/keywords',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,start_date:'',end_date:'',top_k:50}),signal:controller.signal});const d=await r.json();if(!r.ok)throw new Error(d.detail||source+' 載入失敗');return {source,data:d};}finally{clearTimeout(timer)}}));const merged=new Map();for(const x of settled.filter(x=>x.status==='fulfilled').map(x=>x.value))for(const item of x.data.items||[]){const term=String(item.term||'').trim();if(!term)continue;const row=merged.get(term)||{term,document_count:0,hit_count:0};row.document_count+=Number(item.document_count||0);row.hit_count+=Number(item.hit_count||0);merged.set(term,row)}const rows=[...merged.values()].sort((a,b)=>b.document_count-a.document_count||b.hit_count-a.hit_count).slice(0,10);host.innerHTML=rows.length?rows.map((r,i)=>`<div class="ranking-row"><b>#${i+1}</b><strong>${esc(r.term)}</strong><span>${r.document_count} 篇／件</span><span>${r.hit_count} 次</span></div>`).join(''):'<div class="empty">目前沒有可排名資料。</div>';}catch(err){host.innerHTML='<div class="empty">關鍵字排行榜暫時無法載入：'+esc(err.message)+'</div>'}
    loadScript('js/loc3-style-ranking.js','loc3-style-ranking');loadScript('js/rune-frequency-ranking.js','rune-frequency-ranking');
  }

  async function ensureSourceStats(){if(window.LOC_SEARCH_SOURCE_STATS)return window.LOC_SEARCH_SOURCE_STATS;await loadScript('js/search-source-stats.js','search-source-stats');return window.LOC_SEARCH_SOURCE_STATS;}
  async function loadSources(){if(loaded.has('sources'))return;loaded.add('sources');const host=$('#sourceList');try{const d=await ensureSourceStats();const rows=[...(d?.text_sources||[]),...(d?.media_sources||[])];const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('zh-TW'):'—';host.innerHTML=rows.map(r=>`<article class="source-card"><strong>${esc(r.source||'未命名來源')}</strong><small>${esc(r.start_date||'—')} ～ ${esc(r.end_date||'—')}</small><div>${r.char_count_applicable===false?'非文字':fmt(r.char_count)+' 字'} · ${fmt(r.records??r.searchable_records??r.public_url_records)} 筆</div></article>`).join('')||'<div class="empty">尚無來源資料。</div>';$('#sourceUpdated').textContent=d?.generated_at?'更新：'+d.generated_at:'讀取 JS 靜態來源統計';}catch(err){host.innerHTML='<div class="empty">資料來源載入失敗：'+esc(err.message)+'</div>'}}

  function dailyMarkup(){return `<div class="daily-record-grid"><form class="daily-record-form" id="dailyRecordForm"><h3>手動記錄實體牌</h3><div class="daily-form-grid"><label>日期<input id="dailyRecordDate" type="date" required></label><label>類型<select id="dailyRecordKind"><option value="daily_draw">主抽</option><option value="daily_draw_supplement">補抽</option></select></label><label>符文<select id="dailyRecordRune" required><option value="">選擇符文</option></select></label><label>方向<select id="dailyRecordDirection"><option>正位</option><option>半正位</option><option>半逆位</option><option>逆位</option></select></label><label class="full">備註<input id="dailyRecordNote" type="text"></label></div><button type="submit">儲存紀錄</button><div id="dailyRecordStatus">尚未寫入任何資料。</div></form><div class="daily-stats-panel"><h3>每日符文趨勢統計</h3><p id="dailyStatsStatus">載入已記錄資料…</p><div class="daily-metrics"><div><small>紀錄數</small><strong id="dailyMetricCount">—</strong></div><div><small>主抽</small><strong id="dailyMetricPrimary">—</strong></div><div><small>補抽</small><strong id="dailyMetricSupplement">—</strong></div></div><div id="dailyHistoryList"></div><div id="dailyHistoryPagination" hidden><div id="dailyHistoryPageInfo"></div><div id="dailyHistoryPages"></div></div></div></div>`}
  async function loadRuneTrend(){if(loaded.has('rune-trend'))return;loaded.add('rune-trend');$('#runeTrendHost').innerHTML=dailyMarkup();await import('./rune-daily-records.js?v=20260910-statics')}

  async function loadView(name){if(name==='ranking')return loadRanking();if(name==='sources')return loadSources();if(name==='rune-trend')return loadRuneTrend()}
  function bindNav(){$$('[data-statics-nav]').forEach(a=>a.addEventListener('click',ev=>{ev.preventDefault();switchView(a.dataset.staticsNav)}));}
  window.addEventListener('hashchange',()=>switchView(viewName(),false));
  switchView(viewName(),false);
})();