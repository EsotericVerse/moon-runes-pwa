(()=>{
  'use strict';
  if(window.__LOC_RUNE_ANALYTICS__) return;
  window.__LOC_RUNE_ANALYTICS__=true;

  const EVOLUTION_JS='data/js/lunarune-evolution-data.js';
  const GROUP_ORDER=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
  const KEYWORD_PAGE_SIZE=8;
  let keywordPage=1;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const split=v=>String(v||'').split(/[、,，;；/]/).map(s=>s.trim()).filter(Boolean);
  const parseOwnership=v=>String(v||'').split(/[、,，;；]/).map(s=>s.trim()).filter(Boolean).filter(s=>/^.+?(屬|歸).+?$/.test(s));
  const byNumber=(a,b)=>Number(a?.編號||0)-Number(b?.編號||0);

  function loadScript(src,globalName){
    if(window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-loc-runtime="${src}"]`);
      if(existing){
        existing.addEventListener('load',()=>resolve(window[globalName]),{once:true});
        existing.addEventListener('error',()=>reject(new Error(`runtime JS load failed: ${src}`)),{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=src;s.defer=true;s.dataset.locRuntime=src;
      s.onload=()=>window[globalName]?resolve(window[globalName]):reject(new Error(`runtime global missing: ${globalName}`));
      s.onerror=()=>reject(new Error(`runtime JS load failed: ${src}`));
      document.head.appendChild(s);
    });
  }

  function derivedFromEvolution(history){
    return (history?.semantic_history_cases||[]).filter(x=>x?.title&&x.title!=='混沌三兄弟').map(x=>{
      const parts=String(x.title).split('→').map(v=>v.trim());
      const target=parts.length>1?parts[parts.length-1]:'';
      const resolvedRune=/^[靈魂彩憶界域鏡核向斷封鍊啟分悟誤生老病死心愛語韻樹花葉草根種實枝金玉晶地石鑽礦塵光暗水火風土雷氣日月星辰明時空因福禍無夢幻緣虛果玄命]$/.test(target)?target:null;
      const relation=x.kind||'derived';
      const status=relation==='balanced_ambiguity'?'ambiguous':relation.includes('out_of_domain')?'special':'confirmed';
      return {term:parts[0]||x.title,relation,resolved_rune:resolvedRune,status,note:x.note||'',source:'LUNARUNE_EVOLUTION_HISTORY'};
    });
  }

  async function loadEvolution(){
    const payload=await loadScript(EVOLUTION_JS,'LUNARUNE_EVOLUTION_DATA');
    const history=payload?.history||{system_stages:[],governance_evolution:[],semantic_history_cases:[]};
    return {...history,...(payload?.analysis?{analysis:payload.analysis}:{}),__source:'static-js'};
  }

  async function load(){
    if(window.__LOC_RUNE_ANALYTICS_DATA__) return window.__LOC_RUNE_ANALYTICS_DATA__;
    const [runeModule,evolution]=await Promise.all([
      import('./runes.js'),
      loadEvolution()
    ]);
    const rows=[...(Array.isArray(runeModule?.rune)?runeModule.rune.filter(Boolean):[])].sort(byNumber);
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
    const derivedEntries=derivedFromEvolution(evolution);
    const shifts=derivedEntries.filter(x=>['ownership_shift','semantic_ownership_shift','semantic_override','lexicalized_shift'].includes(x?.relation));
    const ambiguous=derivedEntries.filter(x=>x?.status==='ambiguous');
    const data={rows,groups,keywords,ownership,ranking,derivedEntries,shifts,ambiguous,evolution};
    window.__LOC_RUNE_ANALYTICS_DATA__=data;
    return data;
  }

  function metric(title,value,note=''){return `<div class="stats-metric"><small>${esc(title)}</small><strong>${esc(value)}</strong>${note?`<span>${esc(note)}</span>`:''}</div>`;}

  async function renderOverview(host){
    if(!host)return;
    const d=await load();
    const pos=d.keywords.filter(x=>x.polarity==='正向').length,neg=d.keywords.length-pos;
    const stages=Array.isArray(d.evolution?.system_stages)?d.evolution.system_stages:[];
    const stageLine=stages.map(x=>x.label).join(' → ');
    const a=d.evolution?.analysis||{};
    const scale=a?.scale_analysis||{};
    const semantic=a?.semantic_resolution_analysis||{};
    const governance=a?.governance_analysis||{};
    const analysisMetrics=(scale.absolute_growth!==undefined||semantic.case_count!==undefined||governance.governance_step_count!==undefined)
      ?`<div class="stats-metrics">${metric('Base14→66',`+${scale.absolute_growth??''}`,'符文淨增量')}${metric('整體擴張',scale.growth_multiple?`${Number(scale.growth_multiple).toFixed(2)}×`:'')}${metric('語意演化案例',semantic.case_count??'')}${metric('治理演化',governance.governance_step_count??'')}</div>`:'';
    const dominant=semantic.dominant_signal?`<p><strong>演化主訊號：</strong>${esc(semantic.dominant_signal)}</p>`:'';
    host.innerHTML=`<div class="stats-metrics">${metric('符文數',d.rows.length)}${metric('唯一群組',[...d.groups.values()].filter(x=>x.length).length)}${metric('正向關鍵詞',pos)}${metric('反向關鍵詞',neg)}${metric('Ownership 規則',d.ownership.length)}${metric('高價值衍生詞',d.derivedEntries.length)}${metric('主體性轉移',d.shifts.length)}${metric('對等歧義',d.ambiguous.length)}</div>${analysisMetrics}${stageLine?`<p><strong>系統演化：</strong>${esc(stageLine)}</p>`:''}${dominant}<p class="source-note">No API · runtime 只讀 generated static JS；JSON 僅作正式資料來源。</p>`;
  }

  async function renderTimeline(host){
    if(!host)return;
    const d=await load();
    const stages=[...(d.evolution?.system_stages||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    const cases=[...(d.evolution?.semantic_history_cases||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    const stageHtml=stages.map((s,i)=>`<article class="event-card"><div class="event-head"><div><strong>Base ${esc(s.label)}</strong><small>符文系統演化階段 ${i+1}/${stages.length}</small></div><small>${esc(s.rune_count)} 枚</small></div><p>${esc(s.note||'')}</p></article>`).join('');
    const caseHtml=cases.map(c=>`<article class="event-card"><div class="event-head"><div><strong>${esc(c.title)}</strong><small>${esc(c.kind||'semantic_evolution')}</small></div><small>語意治理</small></div><p><strong>Before：</strong>${esc(c.before||'')}</p><p><strong>After：</strong>${esc(c.after||'')}</p>${c.note?`<p>${esc(c.note)}</p>`:''}</article>`).join('');
    host.innerHTML=(stageHtml+caseHtml)||'<div class="empty">尚無符文演化紀錄。</div>';
  }

  async function renderTrend(host){
    if(!host)return;
    const d=await load();
    const stages=[...(d.evolution?.system_stages||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    const governance=[...(d.evolution?.governance_evolution||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    const a=d.evolution?.analysis||{};
    const scale=stages.map((s,i)=>{const prev=i?Number(stages[i-1]?.rune_count||0):0;const delta=Number(s.rune_count||0)-prev;return `<article class="card"><h3>Base ${esc(s.label)}</h3><p>${esc(s.rune_count)} 枚${i?` · +${esc(delta)}`:' · 起點'}</p><div class="chips"><span class="chip">${esc(s.note||'')}</span></div></article>`}).join('');
    const governanceHtml=governance.map(g=>`<article class="card"><h3>${esc(g.title)}</h3><p>${esc(g.after||'')}</p><div class="chips"><span class="chip">${esc(g.effect||'')}</span></div></article>`).join('');
    const relationCounts=new Map();
    for(const e of d.derivedEntries){const k=e?.relation||'derived';relationCounts.set(k,(relationCounts.get(k)||0)+1)}
    const relationHtml=[...relationCounts.entries()].map(([k,v])=>`<span class="chip">${esc(k)} ${esc(v)}</span>`).join('');
    const macro=(a?.semantic_resolution_analysis?.macro_distribution||[]).map(x=>`<span class="chip">${esc(x.label)} ${esc(x.count)}</span>`).join('');
    const signals=(a?.evolution_signals||[]).map(x=>`<article class="card"><h3>${esc(x.label)}</h3><p>${esc(x.evidence||'')}</p></article>`).join('');
    host.innerHTML=`${scale}${governanceHtml}${macro?`<article class="card"><h3>語意演化型態</h3><div class="chips">${macro}</div><p>${esc(a?.semantic_resolution_analysis?.dominant_signal||'')}</p></article>`:''}${relationHtml?`<article class="card"><h3>目前衍生關係分布</h3><div class="chips">${relationHtml}</div></article>`:''}${signals}`;
  }

  async function renderTrajectory(host){
    if(!host)return;
    const d=await load();
    const stages=[...(d.evolution?.system_stages||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    const governance=[...(d.evolution?.governance_evolution||[])].sort((a,b)=>Number(a.order||0)-Number(b.order||0));
    const a=d.evolution?.analysis||{};
    const out=[];
    for(let i=0;i<stages.length-1;i++){
      const from=stages[i],to=stages[i+1],delta=Number(to.rune_count||0)-Number(from.rune_count||0);
      out.push(`<article class="trajectory-card"><div class="trajectory-head"><strong>${esc(from.label)} → ${esc(to.label)}</strong><small>+${esc(delta)} 枚</small></div><div class="trajectory-delta"><div class="trajectory-box"><b>Before</b><div class="chips"><span class="chip">${esc(from.rune_count)} 枚</span></div></div><div class="trajectory-box"><b>After</b><div class="chips"><span class="chip">${esc(to.rune_count)} 枚</span></div></div></div><div class="trajectory-note">${esc(to.note||'')}</div></article>`);
    }
    for(let i=0;i<governance.length;i++){
      const g=governance[i];
      out.push(`<article class="trajectory-card"><div class="trajectory-head"><strong>治理演化 ${i+1} · ${esc(g.title)}</strong><small>rule evolution</small></div><div class="trajectory-delta"><div class="trajectory-box"><b>Before</b><p>${esc(g.before||'')}</p></div><div class="trajectory-box"><b>After</b><p>${esc(g.after||'')}</p></div></div><div class="trajectory-note">${esc(g.effect||'')}</div></article>`);
    }
    const readiness=a?.projection_readiness;
    if(readiness){
      const allowed=(readiness.allowed_projection_dimensions||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join('');
      const blocked=(readiness.blocked_projection_dimensions||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join('');
      out.push(`<article class="trajectory-card"><div class="trajectory-head"><strong>推演準備度</strong><small>${esc(readiness.rule_based_projection||'')}</small></div><p>${esc(readiness.reason||'')}</p><div class="trajectory-delta"><div class="trajectory-box"><b>可推演</b><div class="chips">${allowed}</div></div><div class="trajectory-box"><b>目前不推</b><div class="chips">${blocked}</div></div></div></article>`);
    }
    host.innerHTML=out.join('')||'<div class="empty">尚無可形成的符文演化軌跡。</div>';
  }

  function pageButtons(current,total){
    if(total<=1)return '';
    const buttons=[];
    for(let i=1;i<=total;i++) buttons.push(`<button class="daily-page-btn ${i===current?'active':''}" type="button" data-rune-keyword-page="${i}" ${i===current?'aria-current="true"':''}>${i}</button>`);
    return `<div><button class="daily-page-btn" type="button" data-rune-keyword-page="${Math.max(1,current-1)}" ${current===1?'disabled':''}>上一頁</button>${buttons.join('')}<button class="daily-page-btn" type="button" data-rune-keyword-page="${Math.min(total,current+1)}" ${current===total?'disabled':''}>下一頁</button></div>`;
  }

  async function renderKeywordRanking(host,limit=50,page=keywordPage){
    if(!host)return;
    const d=await load();
    const ranked=d.ranking.slice(0,limit).map((row,i)=>({kind:'rank',row,rank:i+1}));
    const derived=d.derivedEntries.map(row=>({kind:'derived',row}));
    const items=[...ranked,...derived];
    const totalPages=Math.max(1,Math.ceil(items.length/KEYWORD_PAGE_SIZE));
    keywordPage=Math.min(Math.max(1,Number(page)||1),totalPages);
    const start=(keywordPage-1)*KEYWORD_PAGE_SIZE;
    const pageItems=items.slice(start,start+KEYWORD_PAGE_SIZE);
    const rows=pageItems.map(item=>{
      if(item.kind==='rank'){
        const row=item.row;
        return `<div class="ranking-row"><span>${item.rank}</span><strong>${esc(row.term)}</strong><em>${row.count} 關聯 · ${esc(row.runes.join('／'))}</em></div>`;
      }
      const x=item.row;
      const target=x.resolved_rune?` → ${x.resolved_rune}`:x.status==='ambiguous'?' → 歧義':' → 特殊';
      return `<div class="ranking-row"><span>↳</span><strong>${esc(x.term)}</strong><em>${esc(x.relation||'derived')}${esc(target)}</em></div>`;
    }).join('');
    const to=Math.min(items.length,start+KEYWORD_PAGE_SIZE);
    host.innerHTML=`<div class="ranking-list">${rows||'<div class="empty">尚無符文統計資料。</div>'}</div><div class="daily-history-pagination"><div class="daily-history-page-info">第 ${items.length?start+1:0}–${to} 筆，共 ${items.length} 筆 · 第 ${keywordPage} / ${totalPages} 頁</div>${pageButtons(keywordPage,totalPages)}</div><p class="source-note">No API · 正式關鍵詞排名與高價值衍生詞分開呈現；衍生詞不回寫 Canon 關鍵詞。</p>`;
  }

  function bindKeywordPagination(){
    if(window.__LOC_RUNE_KEYWORD_PAGING_BOUND__)return;
    window.__LOC_RUNE_KEYWORD_PAGING_BOUND__=true;
    document.addEventListener('click',event=>{
      const btn=event.target.closest('[data-rune-keyword-page]');
      if(!btn||btn.disabled)return;
      const next=Number(btn.dataset.runeKeywordPage||1);
      if(!Number.isFinite(next)||next<1)return;
      keywordPage=next;
      const host=document.getElementById('runeKeywordRanking');
      if(host)renderKeywordRanking(host,50,keywordPage);
    });
  }

  async function start(){
    const jobs=[
      ['runeEvolutionOverview',renderOverview],['runeEvolutionTimeline',renderTimeline],['runeTrendGrid',renderTrend],['runeTrajectoryList',renderTrajectory],['runeKeywordRanking',renderKeywordRanking]
    ];
    for(const [id,fn] of jobs){const el=document.getElementById(id);if(el)try{await fn(el)}catch(e){el.innerHTML=`<div class="empty">符文資料載入失敗：${esc(e.message)}</div>`;}}
    bindKeywordPagination();
  }

  window.LOCRuneAnalytics={load,renderOverview,renderTimeline,renderTrend,renderTrajectory,renderKeywordRanking,start};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();