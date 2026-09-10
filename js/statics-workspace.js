(() => {
  const API='https://script.google.com/macros/s/AKfycby_-G_G5EqwvIRguRw9DtAt-_v9953N7z9dav5UuHoRajv1IDbas0y4HqOcXXYOa2ei/exec';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const loaded=new Set();
  let events=[];

  function viewName(){return (location.hash||'#ranking').slice(1)||'ranking';}
  function switchView(name,update=true){
    const valid=['ranking','era','sources','rune-trend','timeline'];
    if(!valid.includes(name))name='ranking';
    $$('.statics-view').forEach(v=>v.hidden=v.dataset.view!==name);
    $$('[data-statics-nav]').forEach(a=>a.classList.toggle('active',a.dataset.staticsNav===name));
    if(update)history.replaceState(null,'','statics.html#'+name);
    loadView(name);
  }

  async function fetchJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}

  async function loadRanking(){
    if(loaded.has('ranking'))return;loaded.add('ranking');
    const host=$('#keywordRankingList');
    try{
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
      const sources=['facebook','threads','suno'];
      const settled=await Promise.allSettled(sources.map(async source=>{
        const r=await fetch('https://moon-runes-pwa.onrender.com/analysis/keywords',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,start_date:'',end_date:'',top_k:50}),signal:controller.signal});
        const d=await r.json();if(!r.ok)throw new Error(d.detail||source+' 載入失敗');return {source,data:d};
      }));clearTimeout(timer);
      const merged=new Map();
      for(const x of settled.filter(x=>x.status==='fulfilled').map(x=>x.value))for(const item of x.data.items||[]){const term=String(item.term||'').trim();if(!term)continue;const row=merged.get(term)||{term,document_count:0,hit_count:0};row.document_count+=Number(item.document_count||0);row.hit_count+=Number(item.hit_count||0);merged.set(term,row)}
      const rows=[...merged.values()].sort((a,b)=>b.document_count-a.document_count||b.hit_count-a.hit_count).slice(0,10);
      host.innerHTML=rows.length?rows.map((r,i)=>`<div class="ranking-row"><b>#${i+1}</b><strong>${esc(r.term)}</strong><span>${r.document_count} 篇／件</span><span>${r.hit_count} 次</span></div>`).join(''):'<div class="empty">目前沒有可排名資料。</div>';
    }catch(err){host.innerHTML='<div class="empty">關鍵字排行榜暫時無法載入：'+esc(err.message)+'</div>'}
    loadScript('js/loc3-style-ranking.js','loc3-style-ranking');
    loadScript('js/rune-frequency-ranking.js','rune-frequency-ranking');
  }

  function loadScript(src,key){if(document.querySelector(`script[data-static-module="${key}"]`))return;const s=document.createElement('script');s.src=src;s.dataset.staticModule=key;document.body.appendChild(s)}

  async function loadSources(){
    if(loaded.has('sources'))return;loaded.add('sources');
    const host=$('#sourceList');
    try{const d=await fetchJson('data/json/generated/search/SEARCH_SOURCE_STATS.json');const rows=[...(d.text_sources||[]),...(d.media_sources||[])];const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('zh-TW'):'—';host.innerHTML=rows.map(r=>`<article class="source-card"><strong>${esc(r.source||'未命名來源')}</strong><small>${esc(r.start_date||'—')} ～ ${esc(r.end_date||'—')}</small><div>${fmt(r.char_count)} 字 · ${fmt(r.records??r.searchable_records??r.public_url_records)} 筆</div></article>`).join('')||'<div class="empty">尚無來源資料。</div>';$('#sourceUpdated').textContent=d.generated_at?'更新：'+d.generated_at:'讀取靜態來源統計';}catch(err){host.innerHTML='<div class="empty">資料來源載入失敗：'+esc(err.message)+'</div>'}
  }

  async function loadEra(){
    if(loaded.has('era'))return;loaded.add('era');
    const host=$('#eraList');
    try{const d=await window.LOCPeriods.load({force:true});const rows=d.eras||[];host.innerHTML=rows.map(e=>`<form class="era-card" data-era-id="${esc(e.era_id||'')}"><label>代號<input name="period" value="${esc(e.period||'')}"></label><label>名稱<input name="name" value="${esc(e.name||'')}"></label><label>開始<input type="date" name="start_date" value="${esc(e.start_date||'')}"></label><label>結束<input type="date" name="end_date" value="${esc(e.end_date||'')}"></label><label>狀態<select name="status"><option value="current" ${e.status==='current'?'selected':''}>Current</option><option value="released" ${e.status==='released'?'selected':''}>Released</option><option value="archived" ${e.status==='archived'?'selected':''}>Archived</option></select></label><label class="full">說明<textarea name="description">${esc(e.description||'')}</textarea></label><button type="submit">儲存</button></form>`).join('');host.querySelectorAll('.era-card').forEach((form,i)=>form.addEventListener('submit',ev=>saveEra(ev,rows[i])))}catch(err){host.innerHTML='<div class="empty">時期資料載入失敗：'+esc(err.message)+'</div>'}
  }
  async function saveEra(ev,current){ev.preventDefault();const form=ev.currentTarget,fd=new FormData(form);const era={...current,period:String(fd.get('period')||''),name:String(fd.get('name')||''),start_date:String(fd.get('start_date')||''),end_date:String(fd.get('end_date')||'')||null,status:String(fd.get('status')||'current'),description:String(fd.get('description')||'')};era.display_label=(era.period&&era.name)?era.period+'｜'+era.name:(era.name||era.period);const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'update_era',era}),redirect:'follow'});const d=await r.json();if(!r.ok||d?.ok===false){alert('時期更新失敗：'+(d?.error||r.status));return}window.LOCPeriods.invalidate();loaded.delete('era');loadEra()}

  function dailyMarkup(){return `<div class="daily-record-grid"><form class="daily-record-form" id="dailyRecordForm"><h3>手動記錄實體牌</h3><div class="daily-form-grid"><label>日期<input id="dailyRecordDate" type="date" required></label><label>類型<select id="dailyRecordKind"><option value="daily_draw">主抽</option><option value="daily_draw_supplement">補抽</option></select></label><label>符文<select id="dailyRecordRune" required><option value="">選擇符文</option></select></label><label>方向<select id="dailyRecordDirection"><option>正位</option><option>半正位</option><option>半逆位</option><option>逆位</option></select></label><label class="full">備註<input id="dailyRecordNote" type="text"></label></div><button type="submit">儲存紀錄</button><div id="dailyRecordStatus">尚未寫入任何資料。</div></form><div class="daily-stats-panel"><h3>每日符文趨勢統計</h3><p id="dailyStatsStatus">載入已記錄資料…</p><div class="daily-metrics"><div><small>紀錄數</small><strong id="dailyMetricCount">—</strong></div><div><small>主抽</small><strong id="dailyMetricPrimary">—</strong></div><div><small>補抽</small><strong id="dailyMetricSupplement">—</strong></div></div><div id="dailyHistoryList"></div><div id="dailyHistoryPagination" hidden><div id="dailyHistoryPageInfo"></div><div id="dailyHistoryPages"></div></div></div></div>`}
  async function loadRuneTrend(){if(loaded.has('rune-trend'))return;loaded.add('rune-trend');$('#runeTrendHost').innerHTML=dailyMarkup();await import('./rune-daily-records.js?v=20260910-statics')}

  async function postEvent(action,event){const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,event}),redirect:'follow'});const d=await r.json();if(!r.ok||d?.ok===false)throw new Error(d?.error||'request failed');return d}
  async function loadTimeline(){if(loaded.has('timeline'))return;loaded.add('timeline');try{await window.LOCPeriods.load({force:true});window.LOCPeriods.fillSelect($('#timelineEventPeriod'),{includeAll:true,allLabel:'未指定'});const u=new URL(API);u.searchParams.set('action','events');u.searchParams.set('user_id','lo3rwang');const r=await fetch(u,{cache:'no-store'});const d=await r.json();events=Array.isArray(d)?d:(d.events||[]);renderEvents();resetEvent()}catch(err){$('#timelineEventList').innerHTML='<div class="empty">事件載入失敗：'+esc(err.message)+'</div>'}}
  function renderEvents(){const host=$('#timelineEventList');const eras=window.LOCPeriods.peek()?.eras||[];host.innerHTML=[...events].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).map(e=>`<article class="event-card"><strong>${esc(e.event_title||e.title||'未命名事件')}</strong><small>${esc(e.date||'')} · ${esc(window.LOCPeriods.label(e.era||e.period,e.date,eras)||'')}</small><p>${esc(e.description||'')}</p><button data-event-edit="${esc(e.id)}">編輯</button><button data-event-delete="${esc(e.id)}">刪除</button></article>`).join('')||'<div class="empty">尚無事件。</div>'}
  function resetEvent(){const f=$('#timelineEventForm');f?.reset();$('#timelineEventId').value='';$('#timelineEventDate').value=new Date().toISOString().slice(0,10)}
  function fillEvent(e){$('#timelineEventId').value=e.id||'';$('#timelineEventDate').value=e.date||'';$('#timelineEventType').value=e.event_type||'transition';$('#timelineEventTitle').value=e.event_title||e.title||'';$('#timelineEventDescription').value=e.description||'';$('#timelineEventBefore').value=e.state_before||'';$('#timelineEventAfter').value=e.state_after||'';$('#timelineEventPeriod').value=window.LOCPeriods.normalizePeriod(e.era||e.period||'');$('#timelineEventStatus').value=e.status||'current'}

  $('#timelineEventForm')?.addEventListener('submit',async ev=>{ev.preventDefault();const id=$('#timelineEventId').value;const e={id:id||('EV-'+Date.now()),user_id:'lo3rwang',date:$('#timelineEventDate').value,event_type:$('#timelineEventType').value,event_title:$('#timelineEventTitle').value,description:$('#timelineEventDescription').value,state_before:$('#timelineEventBefore').value,state_after:$('#timelineEventAfter').value,era:$('#timelineEventPeriod').value,status:$('#timelineEventStatus').value,confidence:'recorded',system_id:'lo3rwang',primary_loc:'LOC8'};try{await postEvent(id?'update_event':'event',e);loaded.delete('timeline');await loadTimeline()}catch(err){alert('事件儲存失敗：'+err.message)}});
  $('#timelineEventList')?.addEventListener('click',async ev=>{const eb=ev.target.closest('[data-event-edit]');if(eb){const e=events.find(x=>String(x.id)===eb.dataset.eventEdit);if(e)fillEvent(e);return}const db=ev.target.closest('[data-event-delete]');if(db&&confirm('刪除這筆事件？')){await postEvent('delete_event',{id:db.dataset.eventDelete,user_id:'lo3rwang'});loaded.delete('timeline');loadTimeline()}});

  async function loadView(name){if(name==='ranking')return loadRanking();if(name==='era')return loadEra();if(name==='sources')return loadSources();if(name==='rune-trend')return loadRuneTrend();if(name==='timeline')return loadTimeline()}
  $$('[data-statics-nav]').forEach(a=>a.addEventListener('click',ev=>{if(a.origin===location.origin&&a.pathname===location.pathname){ev.preventDefault();switchView(a.dataset.staticsNav)}}));
  window.addEventListener('hashchange',()=>switchView(viewName(),false));
  switchView(viewName(),false);
})();