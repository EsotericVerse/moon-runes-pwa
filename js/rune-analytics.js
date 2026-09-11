(()=>{
  'use strict';
  if(window.__LOC_RUNE_ANALYTICS__) return;
  window.__LOC_RUNE_ANALYTICS__=true;

  const RUNES_URL='data/json/core/runes.json';
  const GROUP_ORDER=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const split=v=>String(v||'').split(/[、,，;；/]/).map(s=>s.trim()).filter(Boolean);
  const parseOwnership=v=>String(v||'').split(/[、,，;；]/).map(s=>s.trim()).filter(Boolean).filter(s=>/^.+?屬.+?$/.test(s));
  const byNumber=(a,b)=>Number(a?.編號||0)-Number(b?.編號||0);

  async function load(){
    if(window.__LOC_RUNE_ANALYTICS_DATA__) return window.__LOC_RUNE_ANALYTICS_DATA__;
    const r=await fetch(RUNES_URL,{cache:'no-store'});
    if(!r.ok) throw new Error(`runes.json HTTP ${r.status}`);
    const runes=await r.json();
    const rows=[...(Array.isArray(runes)?runes:[])].sort(byNumber);
    const groups=new Map(GROUP_ORDER.map(g=>[g,[]]));
    const keywords=[];
    const ownership=[];
    for(const rune of rows){
      const name=String(rune?.符文名稱||'').trim();
      const group=String(rune?.所屬分組||'').trim()||'特殊';
      if(!groups.has(group)) groups.set(group,[]);
      groups.get(group).push(rune);
      for(const term of split(rune?.正向關鍵詞)) keywords.push({term,rune:name,group,polarity:'正向'});
      for(const term of split(rune?.反向關鍵詞)) keywords.push({term,rune:name,group,polarity:'反向'});
      for(const rule of parseOwnership(rune?.額外規則)) ownership.push({rule,rune:name,group});
    }
    const keywordFreq=new Map();
    for(const row of keywords){
      const cur=keywordFreq.get(row.term)||{term:row.term,count:0,positive:0,negative:0,runes:new Set(),groups:new Set()};
      cur.count++; if(row.polarity==='正向')cur.positive++; else cur.negative++;
      cur.runes.add(row.rune);cur.groups.add(row.group);keywordFreq.set(row.term,cur);
    }
    const ranking=[...keywordFreq.values()].map(x=>({...x,runes:[...x.runes],groups:[...x.groups]})).sort((a,b)=>b.count-a.count||b.runes.length-a.runes.length||a.term.localeCompare(b.term,'zh-Hant'));
    const data={rows,groups,keywords,ownership,ranking};
    window.__LOC_RUNE_ANALYTICS_DATA__=data;
    return data;
  }

  function metric(title,value,note=''){return `<div class="stats-metric"><small>${esc(title)}</small><strong>${esc(value)}</strong>${note?`<span>${esc(note)}</span>`:''}</div>`;}

  async function renderOverview(host){
    if(!host)return;
    const d=await load();
    const pos=d.keywords.filter(x=>x.polarity==='正向').length,neg=d.keywords.length-pos;
    host.innerHTML=`<div class="stats-metrics">${metric('符文數',d.rows.length)}${metric('唯一群組',d.groups.size)}${metric('正向關鍵詞',pos)}${metric('反向關鍵詞',neg)}${metric('Ownership 規則',d.ownership.length)}</div><p class="source-note">No API · 直接讀取 runes.json；不重掃文章、不產生新關鍵詞。</p>`;
  }

  async function renderTimeline(host){
    if(!host)return;
    const d=await load();
    host.innerHTML=[...d.groups.entries()].filter(([,rows])=>rows.length).map(([group,rows])=>`<article class="event-card"><div class="event-head"><div><strong>${esc(group)}組</strong><small>${esc(rows.map(r=>r.編號).join('–'))}</small></div><small>${rows.length} 枚</small></div><p>${rows.map(r=>`<span class="chip">${esc(r.符文名稱)}</span>`).join(' ')}</p></article>`).join('');
  }

  async function renderTrend(host){
    if(!host)return;
    const d=await load();
    host.innerHTML=[...d.groups.entries()].filter(([,rows])=>rows.length).map(([group,rows])=>{
      const names=new Set(rows.map(r=>r.符文名稱));
      const kw=d.keywords.filter(k=>names.has(k.rune));
      const pos=kw.filter(k=>k.polarity==='正向').length,neg=kw.length-pos;
      const top=[...new Set(kw.map(k=>k.term))].slice(0,12);
      return `<article class="card"><h3>${esc(group)}組</h3><p>${rows.length} 枚符文 · ${kw.length} 個關鍵詞 · 正向 ${pos} / 反向 ${neg}</p><div class="chips">${top.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></article>`;
    }).join('');
  }

  async function renderTrajectory(host){
    if(!host)return;
    const d=await load();
    const active=[...d.groups.entries()].filter(([,rows])=>rows.length);
    const out=[];
    for(let i=0;i<active.length-1;i++){
      const [from,fr]=active[i],[to,tr]=active[i+1];
      out.push(`<article class="trajectory-card"><div class="trajectory-head"><strong>${esc(from)} → ${esc(to)}</strong><small>${esc(fr.at(-1)?.符文名稱||'')} → ${esc(tr[0]?.符文名稱||'')}</small></div><div class="trajectory-delta"><div class="trajectory-box"><b>${esc(from)}末端</b><div class="chips">${fr.slice(-3).map(r=>`<span class="chip">${esc(r.符文名稱)}</span>`).join('')}</div></div><div class="trajectory-box"><b>${esc(to)}起點</b><div class="chips">${tr.slice(0,3).map(r=>`<span class="chip">${esc(r.符文名稱)}</span>`).join('')}</div></div></div><div class="trajectory-note">No API · 依現有符文編號與唯一群組顯示結構歷程，不把編號序列誤稱為真實日期。</div></article>`);
    }
    host.innerHTML=out.join('')||'<div class="empty">尚無可形成的符文結構軌跡。</div>';
  }

  async function renderKeywordRanking(host,limit=50){
    if(!host)return;
    const d=await load();
    const rows=d.ranking.slice(0,limit);
    host.innerHTML=`<div class="ranking-list">${rows.map((row,i)=>`<div class="ranking-row"><span>${i+1}</span><strong>${esc(row.term)}</strong><em>${row.count} 關聯 · ${esc(row.runes.join('／'))}</em></div>`).join('')}</div><p class="source-note">No API · 排名只統計現有正向／反向關鍵詞在 runes.json 中的關聯次數；不重掃文章。</p>`;
  }

  async function start(){
    const jobs=[
      ['runeEvolutionOverview',renderOverview],['runeEvolutionTimeline',renderTimeline],['runeTrendGrid',renderTrend],['runeTrajectoryList',renderTrajectory],['runeKeywordRanking',renderKeywordRanking]
    ];
    for(const [id,fn] of jobs){const el=document.getElementById(id);if(el)try{await fn(el)}catch(e){el.innerHTML=`<div class="empty">符文資料載入失敗：${esc(e.message)}</div>`;}}
  }

  window.LOCRuneAnalytics={load,renderOverview,renderTimeline,renderTrend,renderTrajectory,renderKeywordRanking,start};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
