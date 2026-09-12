(()=>{
  'use strict';

  const RUNES_URL='data/json/core/runes.json';
  const DERIVED_URL='data/json/registries/LUNARUNE_DERIVED_LEXICON.json';
  const GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
  const DEFAULT_GROUP='特殊';
  const GROUP_SET=new Set(GROUPS);
  const PAGE_SIZE=10;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const splitTerms=value=>String(value||'').split(/[、,，;；/]/).map(x=>x.trim()).filter(Boolean);
  const nodeId=(type,label)=>`${type}:${label}`;

  const NODE_LABELS={
    group:'群組 Group',rune:'符文 Rune',term:'關鍵詞 Keyword',derived:'衍生詞 Derived',
    lexical_class:'詞類 Lexical Class',relation_type:'關係類型 Relation',status:'狀態 Status'
  };
  const EDGE_LABELS={
    belongs_to_group:'歸屬群組',keyword_of:'關鍵詞',reverse_keyword_of:'反向關鍵詞',ownership:'語意歸屬',
    has_lexical_class:'詞類',uses_relation:'使用關係',has_status:'狀態',surface_component_of:'表面組成',
    surface_group:'表面群組',cross_group_composition:'跨群組組成',resolved_group:'判定群組',
    resolved_to:'判定符文',ambiguous_with:'歧義候選',remains_special:'維持特殊'
  };
  const nodeTypeLabel=type=>NODE_LABELS[type]||type;
  const edgeTypeLabel=type=>EDGE_LABELS[type]||type;

  function addNode(map,node){
    if(!node?.id)return;
    const prev=map.get(node.id)||{};
    map.set(node.id,{...prev,...node});
  }
  function addEdge(map,edge){
    if(!edge?.source||!edge?.target||!edge?.type)return;
    const key=[edge.source,edge.type,edge.target].join('|');
    if(!map.has(key))map.set(key,edge);
  }

  function parseOwnershipRules(raw,runeNames){
    const out=[];
    const chunks=String(raw||'').split(/[、,，;；]/).map(x=>x.trim()).filter(Boolean);
    for(const chunk of chunks){
      const m=chunk.match(/^(.+?)(屬|歸)(.+?)$/);
      if(!m)continue;
      const source=m[1].trim(),verb=m[2],target=m[3].trim();
      if(!source||!target)continue;
      const targetRune=runeNames.has(target)?target:null;
      out.push({source,target,targetRune,verb,raw:chunk});
    }
    return out;
  }

  function buildGraph(runes,derivedLexicon={}){
    const nodes=new Map(),edges=new Map();
    const runeNames=new Set((runes||[]).map(r=>String(r?.符文名稱||'').trim()).filter(Boolean));
    const runeGroup=new Map();

    for(const group of GROUPS)addNode(nodes,{id:nodeId('group',group),label:group,type:'group',group});

    for(const rune of runes||[]){
      const name=String(rune?.符文名稱||'').trim();
      if(!name)continue;
      const num=Number(rune?.編號);
      const rawGroup=String(rune?.所屬分組||'').trim();
      const group=GROUP_SET.has(rawGroup)?rawGroup:DEFAULT_GROUP;
      runeGroup.set(name,group);
      const rid=nodeId('rune',name);
      addNode(nodes,{
        id:rid,label:name,type:'rune',group,
        number:Number.isFinite(num)?num:null,
        english:String(rune?.英文||''),definition:String(rune?.符文說明||''),
        archetype:String(rune?.人格原型||''),polarity:String(rune?.卡片屬性||''),
        moon_phase:String(rune?.月相||''),source:RUNES_URL
      });
      addEdge(edges,{source:rid,target:nodeId('group',group),type:'belongs_to_group',source_field:'所屬分組',evidence:group});

      for(const term of splitTerms(rune?.正向關鍵詞)){
        const tid=nodeId('term',term);
        addNode(nodes,{id:tid,label:term,type:'term',group:DEFAULT_GROUP,term_status:'canonical'});
        addEdge(edges,{source:tid,target:rid,type:'keyword_of',source_field:'正向關鍵詞',evidence:term});
      }
      for(const term of splitTerms(rune?.反向關鍵詞)){
        const tid=nodeId('term',term);
        addNode(nodes,{id:tid,label:term,type:'term',group:DEFAULT_GROUP,term_status:'canonical'});
        addEdge(edges,{source:tid,target:rid,type:'reverse_keyword_of',source_field:'反向關鍵詞',evidence:term});
      }

      for(const rule of parseOwnershipRules(rune?.額外規則,runeNames)){
        const sid=nodeId('term',rule.source);
        if(!nodes.has(sid))addNode(nodes,{id:sid,label:rule.source,type:'term',group:DEFAULT_GROUP,term_status:'rule'});
        const targetId=rule.targetRune?nodeId('rune',rule.targetRune):nodeId('term',rule.target);
        if(!nodes.has(targetId))addNode(nodes,{id:targetId,label:rule.target,type:rule.targetRune?'rune':'term',group:rule.targetRune?(runeGroup.get(rule.targetRune)||DEFAULT_GROUP):DEFAULT_GROUP});
        addEdge(edges,{source:sid,target:targetId,type:'ownership',source_field:'額外規則',evidence:rule.raw});
      }
    }

    const derivedEntries=Array.isArray(derivedLexicon?.entries)?derivedLexicon.entries:[];
    for(const entry of derivedEntries){
      const term=String(entry?.term||'').trim();
      if(!term)continue;
      const canonicalTid=nodeId('term',term);
      const tid=nodes.has(canonicalTid)?canonicalTid:nodeId('derived',term);
      const owner=String(entry?.resolved_rune||'').trim();
      const ownerGroup=owner?runeGroup.get(owner):null;
      const currentType=nodes.get(tid)?.type||'derived';
      addNode(nodes,{
        id:tid,label:term,type:currentType,group:ownerGroup||DEFAULT_GROUP,
        term_status:String(entry?.status||'special'),relation:String(entry?.relation||'derived'),
        lexical_class:String(entry?.lexical_class||''),resolved_rune:owner,
        definition:String(entry?.note||entry?.evidence||''),evidence:String(entry?.evidence||''),
        source:String(entry?.source||DERIVED_URL)
      });

      const lexicalClass=String(entry?.lexical_class||'').trim();
      if(lexicalClass){
        const classId=nodeId('lexical_class',lexicalClass);
        addNode(nodes,{id:classId,label:lexicalClass,type:'lexical_class',group:DEFAULT_GROUP});
        addEdge(edges,{source:tid,target:classId,type:'has_lexical_class',source_field:'lexical_class',evidence:lexicalClass});
      }

      const relationType=String(entry?.relation||'derived').trim()||'derived';
      const relationId=nodeId('relation_type',relationType);
      addNode(nodes,{id:relationId,label:relationType,type:'relation_type',group:DEFAULT_GROUP});
      addEdge(edges,{source:tid,target:relationId,type:'uses_relation',source_field:'relation',evidence:relationType});

      const statusValue=String(entry?.status||'special').trim()||'special';
      const statusId=nodeId('status',statusValue);
      addNode(nodes,{id:statusId,label:statusValue,type:'status',group:DEFAULT_GROUP});
      addEdge(edges,{source:tid,target:statusId,type:'has_status',source_field:'status',evidence:statusValue});

      const surfaceGroups=new Set();
      for(const part of entry?.surface_runes||[]){
        const name=String(part||'').trim();
        if(!runeNames.has(name))continue;
        addEdge(edges,{source:nodeId('rune',name),target:tid,type:'surface_component_of',source_field:'surface_runes',evidence:`${name} ∈ ${term}`});
        const sg=runeGroup.get(name);if(sg)surfaceGroups.add(sg);
      }
      for(const sg of surfaceGroups)addEdge(edges,{source:tid,target:nodeId('group',sg),type:'surface_group',source_field:'surface_runes',evidence:`${term} 表面涉及 ${sg}組`});
      if(surfaceGroups.size>1)addEdge(edges,{source:tid,target:relationId,type:'cross_group_composition',source_field:'surface_runes',evidence:[...surfaceGroups].join(' × ')});
      if(ownerGroup)addEdge(edges,{source:tid,target:nodeId('group',ownerGroup),type:'resolved_group',source_field:'semantic_owner',evidence:`${term} → ${ownerGroup}組`});

      if(owner&&runeNames.has(owner)){
        addEdge(edges,{source:tid,target:nodeId('rune',owner),type:'resolved_to',source_field:'semantic_owner',evidence:String(entry?.evidence||entry?.note||owner)});
      }else if(entry?.status==='ambiguous'){
        for(const part of entry?.surface_runes||[]){
          const name=String(part||'').trim();if(!runeNames.has(name))continue;
          addEdge(edges,{source:tid,target:nodeId('rune',name),type:'ambiguous_with',source_field:'最高級衝突規則',evidence:String(entry?.evidence||'多候選並存')});
        }
      }else{
        addEdge(edges,{source:tid,target:nodeId('group',DEFAULT_GROUP),type:'remains_special',source_field:'治理',evidence:String(entry?.evidence||'尚無穩定唯一歸屬')});
      }
    }

    return {
      version:'runes-json-derived-v4',api_used:false,default_group:DEFAULT_GROUP,groups:GROUPS,
      governance:{
        group_unique:true,
        classification_order:['詞類／句內語意角色','群組主體性','唯一群組','個別符文','正反面／衝突校準'],
        candidate_priority:['明確語意歸屬規則','直接關鍵詞','反向關鍵詞'],direct_over_reverse:true,
        direct_over_reverse_rule:'直接表達該語意方向的符文，優先於透過相反符文的反面間接表達。',
        highest_conflict_rule:'同一優先層仍有兩個以上有效符文候選時才啟動衝突裁決',special_is_default:true,
        canonical_source:RUNES_URL,derived_source:DERIVED_URL,derived_does_not_modify_canon:true,
        graph_projection:'small_primitives_expand_via_relations'
      },
      derived_count:derivedEntries.length,nodes:[...nodes.values()],edges:[...edges.values()]
    };
  }

  function adjacent(graph,id){
    const edgeRows=graph.edges.filter(e=>e.source===id||e.target===id);
    const ids=new Set([id]);edgeRows.forEach(e=>{ids.add(e.source);ids.add(e.target)});
    return {nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:edgeRows};
  }

  function searchGraph(graph,query){
    const q=String(query||'').trim().toLowerCase();
    if(!q)return graph;
    const matched=graph.nodes.filter(n=>[n.label,n.english,n.definition,n.archetype,n.group,n.polarity,n.lexical_class,n.relation,n.term_status,n.resolved_rune,n.evidence].filter(Boolean).join(' ').toLowerCase().includes(q));
    const ids=new Set(),edges=[];
    for(const n of matched){const a=adjacent(graph,n.id);a.nodes.forEach(x=>ids.add(x.id));a.edges.forEach(e=>edges.push(e));}
    const edgeMap=new Map(edges.map(e=>[[e.source,e.type,e.target].join('|'),e]));
    return {nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:[...edgeMap.values()]};
  }

  function uniqueRuneNames(edges){return [...new Set((edges||[]).map(e=>e.target).filter(x=>x.startsWith('rune:')).map(x=>x.slice(5)))];}

  function resolveCanonicalTargets(graph,exact){
    const outgoing=adjacent(graph,exact.id).edges.filter(e=>e.source===exact.id);
    const ownership=outgoing.filter(e=>e.type==='ownership'&&e.target.startsWith('rune:'));
    const direct=outgoing.filter(e=>e.type==='keyword_of'&&e.target.startsWith('rune:'));
    const reverse=outgoing.filter(e=>e.type==='reverse_keyword_of'&&e.target.startsWith('rune:'));
    const tiers=[{name:'明確語意歸屬規則',relation:'ownership',edges:ownership},{name:'直接關鍵詞',relation:'keyword_of',edges:direct},{name:'反向關鍵詞',relation:'reverse_keyword_of',edges:reverse}];
    const chosen=tiers.find(t=>t.edges.length)||null;if(!chosen)return null;
    const runes=uniqueRuneNames(chosen.edges);return {chosen,runes,ignored:tiers.filter(t=>t!==chosen&&t.edges.length)};
  }

  function resolveTerm(graph,query){
    const term=String(query||'').trim();if(!term)return null;
    const derived=graph.nodes.find(n=>(n.type==='derived'||n.type==='term')&&n.label===term&&n.relation);
    if(derived){
      const resolvedRune=derived.resolved_rune||null;
      return {term,status:derived.term_status||'special',relation:derived.relation||'derived',lexical_class:derived.lexical_class||'',resolved_rune:resolvedRune,group:resolvedRune?(derived.group||DEFAULT_GROUP):DEFAULT_GROUP,evidence:derived.evidence||derived.definition||'',decision_trace:[derived.lexical_class?`詞類／句內語意角色：${derived.lexical_class}`:'詞類／句內語意角色：未指定',`群組主體性：${resolvedRune?'依整體詞義判定':'不足以判定'}`,`唯一群組：${resolvedRune?(derived.group||DEFAULT_GROUP):DEFAULT_GROUP}`,`個別符文：${resolvedRune||'未決'}`,`正反面／衝突校準：${derived.term_status||'special'}`]};
    }
    const exact=graph.nodes.find(n=>n.type==='term'&&n.label===term);
    if(exact){
      const resolution=resolveCanonicalTargets(graph,exact);
      if(!resolution)return {term,status:'unresolved',relation:'canonical_without_owner',resolved_rune:null,group:DEFAULT_GROUP,evidence:'已有詞節點，但尚無可用符文歸屬。',decision_trace:['詞類／句內語意角色：未指定','群組主體性：不足以判定',`唯一群組：${DEFAULT_GROUP}`,'個別符文：未決','正反面／衝突校準：無候選']};
      const {chosen,runes,ignored}=resolution,resolvedRune=runes.length===1?runes[0]:null;
      const group=resolvedRune?(graph.nodes.find(n=>n.id===`rune:${resolvedRune}`)?.group||DEFAULT_GROUP):DEFAULT_GROUP;
      const ignoredText=ignored.length?`；較低優先層已忽略：${ignored.map(x=>x.name).join('、')}`:'';
      return {term,status:runes.length>1?'ambiguous':'confirmed',relation:chosen.relation,resolved_rune:resolvedRune,group,evidence:chosen.edges.map(e=>e.evidence).filter(Boolean).join('；')+ignoredText,decision_trace:['詞類／句內語意角色：Canon 關鍵詞／規則',`群組主體性：採 ${chosen.name}`,`唯一群組：${group}`,`個別符文：${resolvedRune||runes.join('、')||'未決'}`,`正反面／衝突校準：${ignored.length?'已依直接語意優先規則排除較低層候選':(runes.length>1?'同優先層多候選，保留歧義':'無衝突')}`]};
    }
    const runeChars=[...term].filter(ch=>graph.nodes.some(n=>n.type==='rune'&&n.label===ch));
    return runeChars.length>1?{term,status:'unresolved',relation:'surface_only',resolved_rune:null,group:DEFAULT_GROUP,evidence:`表面符文：${[...new Set(runeChars)].join('、')}；尚無衍生詞規則，不強迫判定。`,decision_trace:['詞類／句內語意角色：未知','群組主體性：未知',`唯一群組：${DEFAULT_GROUP}`,'個別符文：未決','正反面／衝突校準：不啟動；僅有表面字形候選']}:null;
  }

  function renderList(el,rows,empty){if(el)el.innerHTML=rows.length?rows.join(''):`<div class="context-empty">${esc(empty)}</div>`;}

  function pageNumbers(current,total){
    const out=[],start=Math.max(1,Math.min(current-2,Math.max(1,total-4))),end=Math.min(total,Math.max(5,current+2));
    for(let i=start;i<=end;i++)out.push(i);return out;
  }

  function pagerHtml(kind,page,total){
    if(total<=PAGE_SIZE)return '';
    const pages=Math.max(1,Math.ceil(total/PAGE_SIZE)),safe=Math.min(Math.max(1,page),pages),from=(safe-1)*PAGE_SIZE+1,to=Math.min(total,safe*PAGE_SIZE),nums=pageNumbers(safe,pages);
    let buttons=`<button class="context-page-btn" type="button" data-rune-page-kind="${kind}" data-rune-page="${safe-1}" ${safe===1?'disabled':''}>上一頁</button>`;
    if(nums[0]>1){buttons+=`<button class="context-page-btn" type="button" data-rune-page-kind="${kind}" data-rune-page="1">1</button>`;if(nums[0]>2)buttons+='<span class="context-page-info">…</span>';}
    buttons+=nums.map(n=>`<button class="context-page-btn ${n===safe?'active':''}" type="button" data-rune-page-kind="${kind}" data-rune-page="${n}">${n}</button>`).join('');
    if(nums[nums.length-1]<pages){if(nums[nums.length-1]<pages-1)buttons+='<span class="context-page-info">…</span>';buttons+=`<button class="context-page-btn" type="button" data-rune-page-kind="${kind}" data-rune-page="${pages}">${pages}</button>`;}
    buttons+=`<button class="context-page-btn" type="button" data-rune-page-kind="${kind}" data-rune-page="${safe+1}" ${safe===pages?'disabled':''}>下一頁</button>`;
    return `<div class="context-pagination"><div class="context-page-info">第 ${from}–${to} 筆，共 ${total} 筆 · 第 ${safe} / ${pages} 頁</div><div class="context-page-buttons">${buttons}</div></div>`;
  }

  function mount(graph){
    const root=document.querySelector('#runeSemanticGraph');if(!root)return;
    const input=root.querySelector('#runeGraphQuery'),status=root.querySelector('#runeGraphStatus'),nodesEl=root.querySelector('#runeGraphNodes'),edgesEl=root.querySelector('#runeGraphEdges'),reset=root.querySelector('#runeGraphReset'),groupSel=root.querySelector('#runeGraphGroup'),edgeSel=root.querySelector('#runeGraphEdgeType');
    let nodePage=1,edgePage=1,currentView={nodes:[],edges:[]};

    const panels=root.querySelectorAll('.context-graph-panel');
    if(panels[0]?.querySelector('h3'))panels[0].querySelector('h3').textContent='節點 Node';
    if(panels[1]?.querySelector('h3'))panels[1].querySelector('h3').textContent='關聯 Edge';
    const nodePager=document.createElement('div'),edgePager=document.createElement('div');
    nodePager.className='rune-graph-pager';edgePager.className='rune-graph-pager';
    nodesEl.after(nodePager);edgesEl.after(edgePager);

    groupSel.innerHTML='<option value="">全部群組</option>'+GROUPS.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('');
    const edgeTypes=[...new Set(graph.edges.map(e=>e.type))].sort();
    edgeSel.innerHTML='<option value="">全部關係</option>'+edgeTypes.map(t=>`<option value="${esc(t)}">${esc(edgeTypeLabel(t))}</option>`).join('');

    function render(){
      const nodePages=Math.max(1,Math.ceil(currentView.nodes.length/PAGE_SIZE)),edgePages=Math.max(1,Math.ceil(currentView.edges.length/PAGE_SIZE));
      nodePage=Math.min(Math.max(1,nodePage),nodePages);edgePage=Math.min(Math.max(1,edgePage),edgePages);
      const shownNodes=currentView.nodes.slice((nodePage-1)*PAGE_SIZE,nodePage*PAGE_SIZE),shownEdges=currentView.edges.slice((edgePage-1)*PAGE_SIZE,edgePage*PAGE_SIZE);
      renderList(nodesEl,shownNodes.map(n=>`<button type="button" class="context-graph-node rune-graph-node" data-rune-graph-node="${esc(n.id)}"><small>${esc(nodeTypeLabel(n.type))} · ${esc(n.group||DEFAULT_GROUP)}${n.term_status?` · ${esc(n.term_status)}`:''}</small><strong>${esc(n.label)}</strong><small>${esc(n.definition||n.english||n.id)}</small></button>`),'沒有符合的節點。');
      renderList(edgesEl,shownEdges.map(e=>`<article class="context-graph-edge"><div class="context-graph-edge-path"><span>${esc(e.source.replace(/^[^:]+:/,''))}</span><span class="context-graph-edge-type">→ ${esc(edgeTypeLabel(e.type))} →</span><span>${esc(e.target.replace(/^[^:]+:/,''))}</span></div><small>${esc(e.source_field||'衍生資料')} · ${esc(e.evidence||'')}</small></article>`),'沒有符合的關聯。');
      nodePager.innerHTML=pagerHtml('node',nodePage,currentView.nodes.length);edgePager.innerHTML=pagerHtml('edge',edgePage,currentView.edges.length);
    }

    function apply(){
      const q=input.value.trim();let view=searchGraph(graph,q);const group=groupSel.value,edgeType=edgeSel.value;
      if(group){
        const allowed=new Set(view.nodes.filter(n=>n.group===group||n.label===group).map(n=>n.id));
        for(const e of view.edges)if(allowed.has(e.source)||allowed.has(e.target)){allowed.add(e.source);allowed.add(e.target);}
        view={nodes:view.nodes.filter(n=>allowed.has(n.id)),edges:view.edges.filter(e=>allowed.has(e.source)&&allowed.has(e.target))};
      }
      if(edgeType)view={nodes:view.nodes,edges:view.edges.filter(e=>e.type===edgeType)};
      currentView=view;nodePage=1;edgePage=1;render();
      const resolved=q?resolveTerm(graph,q):null,trace=resolved?.decision_trace?.length?` · ${resolved.decision_trace.join(' → ')}`:'',resolution=resolved?` · 判定 ${resolved.status}${resolved.resolved_rune?` → ${resolved.resolved_rune}`:''} · 群組 ${resolved.group||DEFAULT_GROUP}${trace}`:'';
      status.textContent=`No API · ${view.nodes.length} 個節點 / ${view.edges.length} 個關聯 · 衍生詞 ${graph.derived_count||0}${resolution}`;
    }

    root.addEventListener('click',ev=>{
      const pageBtn=ev.target.closest('[data-rune-page]');
      if(pageBtn&&!pageBtn.disabled){const next=Number(pageBtn.dataset.runePage||1);if(pageBtn.dataset.runePageKind==='node')nodePage=next;else edgePage=next;render();return;}
      const btn=ev.target.closest('[data-rune-graph-node]');if(!btn)return;
      const node=graph.nodes.find(n=>n.id===btn.dataset.runeGraphNode);if(!node)return;input.value=node.label;apply();
    });
    root.querySelector('form')?.addEventListener('submit',ev=>{ev.preventDefault();apply();});
    [groupSel,edgeSel].forEach(el=>el?.addEventListener('change',apply));
    reset?.addEventListener('click',()=>{input.value='';groupSel.value='';edgeSel.value='';apply();});
    apply();
  }

  async function optionalJson(url,fallback){try{const r=await fetch(url);return r.ok?await r.json():fallback}catch{return fallback}}
  async function init(){
    const root=document.querySelector('#runeSemanticGraph');if(!root)return;
    try{
      const [res,derived]=await Promise.all([fetch(RUNES_URL),optionalJson(DERIVED_URL,{entries:[]})]);
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const graph=buildGraph(await res.json(),derived);window.LunaRuneSemanticGraph=graph;mount(graph);
    }catch(err){const status=document.querySelector('#runeGraphStatus');if(status)status.textContent='符文 Graph 載入失敗：'+err.message;}
  }

  window.LunaRuneGraph={buildGraph,searchGraph,resolveTerm,init};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();