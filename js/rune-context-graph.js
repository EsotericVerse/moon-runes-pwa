(()=>{
  'use strict';

  const GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
  const DEFAULT_GROUP='特殊';
  const GROUP_SET=new Set(GROUPS);
  const PAGE_SIZE=10;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const splitTerms=value=>String(value||'').split(/[、,，;；/]/).map(x=>x.trim()).filter(Boolean);
  const nodeId=(type,label)=>`${type}:${label}`;

  const NODE_LABELS={group:'群組 Group',rune:'符文 Rune',term:'關鍵詞 Keyword',derived:'衍生詞 Derived',relation_type:'關係類型 Relation',status:'狀態 Status'};
  const EDGE_LABELS={belongs_to_group:'歸屬群組',keyword_of:'關鍵詞',reverse_keyword_of:'反向關鍵詞',ownership:'語意歸屬',uses_relation:'使用關係',has_status:'狀態',surface_component_of:'表面組成',resolved_group:'判定群組',resolved_to:'判定符文',ambiguous_with:'歧義候選',remains_special:'維持特殊'};
  const nodeTypeLabel=type=>NODE_LABELS[type]||type;
  const edgeTypeLabel=type=>EDGE_LABELS[type]||type;

  function addNode(map,node){if(!node?.id)return;map.set(node.id,{...(map.get(node.id)||{}),...node});}
  function addEdge(map,edge){if(!edge?.source||!edge?.target||!edge?.type)return;const key=[edge.source,edge.type,edge.target].join('|');if(!map.has(key))map.set(key,edge);}

  function parseOwnershipRules(raw,runeNames){
    const out=[];
    for(const chunk of String(raw||'').split(/[、,，;；]/).map(x=>x.trim()).filter(Boolean)){
      const m=chunk.match(/^(.+?)(屬|歸)(.+?)$/);if(!m)continue;
      const source=m[1].trim(),target=m[3].trim();if(!source||!target)continue;
      out.push({source,target,targetRune:runeNames.has(target)?target:null,raw:chunk});
    }
    return out;
  }

  function buildGraph(runes,derivedEntries=[]){
    const nodes=new Map(),edges=new Map();
    const runeNames=new Set((runes||[]).map(r=>String(r?.符文名稱||'').trim()).filter(Boolean));
    const runeGroup=new Map();
    for(const group of GROUPS)addNode(nodes,{id:nodeId('group',group),label:group,type:'group',group});

    for(const rune of runes||[]){
      const name=String(rune?.符文名稱||'').trim();if(!name)continue;
      const rawGroup=String(rune?.所屬分組||'').trim(),group=GROUP_SET.has(rawGroup)?rawGroup:DEFAULT_GROUP;
      runeGroup.set(name,group);
      const rid=nodeId('rune',name);
      addNode(nodes,{id:rid,label:name,type:'rune',group,number:Number(rune?.編號)||null,english:String(rune?.英文||''),definition:String(rune?.符文說明||''),polarity:String(rune?.卡片屬性||'')});
      addEdge(edges,{source:rid,target:nodeId('group',group),type:'belongs_to_group'});
      for(const term of splitTerms(rune?.正向關鍵詞)){const tid=nodeId('term',term);addNode(nodes,{id:tid,label:term,type:'term',group});addEdge(edges,{source:tid,target:rid,type:'keyword_of'});}
      for(const term of splitTerms(rune?.反向關鍵詞)){const tid=nodeId('term',term);addNode(nodes,{id:tid,label:term,type:'term',group});addEdge(edges,{source:tid,target:rid,type:'reverse_keyword_of'});}
      for(const rule of parseOwnershipRules(rune?.額外規則,runeNames)){
        const sid=nodeId('term',rule.source);addNode(nodes,{id:sid,label:rule.source,type:'term',group:DEFAULT_GROUP});
        const targetId=rule.targetRune?nodeId('rune',rule.targetRune):nodeId('term',rule.target);
        addNode(nodes,{id:targetId,label:rule.target,type:rule.targetRune?'rune':'term',group:rule.targetRune?(runeGroup.get(rule.targetRune)||DEFAULT_GROUP):DEFAULT_GROUP});
        addEdge(edges,{source:sid,target:targetId,type:'ownership',evidence:rule.raw});
      }
    }

    for(const entry of derivedEntries||[]){
      const term=String(entry?.term||'').trim();if(!term)continue;
      const tid=nodeId('derived',term),owner=String(entry?.resolved_rune||'').trim(),ownerGroup=owner?(runeGroup.get(owner)||DEFAULT_GROUP):DEFAULT_GROUP;
      addNode(nodes,{id:tid,label:term,type:'derived',group:ownerGroup,term_status:String(entry?.status||'special'),relation:String(entry?.relation||'derived'),resolved_rune:owner,definition:String(entry?.note||entry?.evidence||'')});
      const relation=String(entry?.relation||'derived'),relationId=nodeId('relation_type',relation);addNode(nodes,{id:relationId,label:relation,type:'relation_type',group:DEFAULT_GROUP});addEdge(edges,{source:tid,target:relationId,type:'uses_relation'});
      const status=String(entry?.status||'special'),statusId=nodeId('status',status);addNode(nodes,{id:statusId,label:status,type:'status',group:DEFAULT_GROUP});addEdge(edges,{source:tid,target:statusId,type:'has_status'});
      for(const part of entry?.surface_runes||[]){const name=String(part||'').trim();if(runeNames.has(name))addEdge(edges,{source:nodeId('rune',name),target:tid,type:'surface_component_of'});}
      if(owner&&runeNames.has(owner)){addEdge(edges,{source:tid,target:nodeId('rune',owner),type:'resolved_to'});addEdge(edges,{source:tid,target:nodeId('group',ownerGroup),type:'resolved_group'});}
      else if(status==='ambiguous')for(const part of entry?.surface_runes||[]){const name=String(part||'').trim();if(runeNames.has(name))addEdge(edges,{source:tid,target:nodeId('rune',name),type:'ambiguous_with'});}
      else addEdge(edges,{source:tid,target:nodeId('group',DEFAULT_GROUP),type:'remains_special'});
    }

    return {version:'shared-static-runtime-v1',api_used:false,default_group:DEFAULT_GROUP,groups:GROUPS,derived_count:(derivedEntries||[]).length,nodes:[...nodes.values()],edges:[...edges.values()]};
  }

  function adjacent(graph,id){const edgeRows=graph.edges.filter(e=>e.source===id||e.target===id),ids=new Set([id]);edgeRows.forEach(e=>{ids.add(e.source);ids.add(e.target)});return {nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:edgeRows};}
  function searchGraph(graph,query){
    const q=String(query||'').trim().toLowerCase();if(!q)return graph;
    const matched=graph.nodes.filter(n=>[n.label,n.english,n.definition,n.group,n.polarity,n.relation,n.term_status,n.resolved_rune].filter(Boolean).join(' ').toLowerCase().includes(q));
    const ids=new Set(),edgeMap=new Map();for(const n of matched){const a=adjacent(graph,n.id);a.nodes.forEach(x=>ids.add(x.id));a.edges.forEach(e=>edgeMap.set([e.source,e.type,e.target].join('|'),e));}
    return {nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:[...edgeMap.values()]};
  }
  function resolveTerm(graph,query){
    const term=String(query||'').trim();if(!term)return null;
    const node=graph.nodes.find(n=>(n.type==='derived'||n.type==='term')&&n.label===term);
    if(!node)return null;
    const edges=graph.edges.filter(e=>e.source===node.id);
    const direct=edges.find(e=>['resolved_to','ownership','keyword_of'].includes(e.type)&&e.target.startsWith('rune:'));
    const reverse=!direct&&edges.find(e=>e.type==='reverse_keyword_of'&&e.target.startsWith('rune:'));
    const chosen=direct||reverse;
    const rune=chosen?chosen.target.slice(5):(node.resolved_rune||null);
    const runeNode=rune?graph.nodes.find(n=>n.id===nodeId('rune',rune)):null;
    return {term,status:node.term_status||'canonical',relation:node.relation||chosen?.type||'canonical',resolved_rune:rune,group:runeNode?.group||node.group||DEFAULT_GROUP};
  }

  function pager(kind,total,page,onPage){
    const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));if(totalPages<=1)return '';
    return `<div class="context-pagination"><div class="context-page-info">第 ${page} / ${totalPages} 頁 · 共 ${total} 筆</div><div class="context-page-buttons"><button class="context-page-btn" data-rune-page-kind="${kind}" data-rune-page="${page-1}" ${page<=1?'disabled':''}>上一頁</button><button class="context-page-btn" data-rune-page-kind="${kind}" data-rune-page="${page+1}" ${page>=totalPages?'disabled':''}>下一頁</button></div></div>`;
  }

  function mount(graph){
    const root=document.querySelector('#runeSemanticGraph');if(!root)return;
    const input=root.querySelector('#runeGraphQuery'),groupSel=root.querySelector('#runeGraphGroup'),edgeSel=root.querySelector('#runeGraphEdgeType'),reset=root.querySelector('#runeGraphReset'),status=root.querySelector('#runeGraphStatus'),nodesHost=root.querySelector('#runeGraphNodes'),edgesHost=root.querySelector('#runeGraphEdges');
    if(!input||!groupSel||!edgeSel||!status||!nodesHost||!edgesHost)return;
    groupSel.innerHTML='<option value="">全部群組</option>'+GROUPS.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('');
    const edgeTypes=[...new Set(graph.edges.map(e=>e.type))].sort();edgeSel.innerHTML='<option value="">全部關係</option>'+edgeTypes.map(t=>`<option value="${esc(t)}">${esc(edgeTypeLabel(t))}</option>`).join('');
    let currentView=graph,nodePage=1,edgePage=1;
    function render(){
      const ns=currentView.nodes.slice((nodePage-1)*PAGE_SIZE,nodePage*PAGE_SIZE),es=currentView.edges.slice((edgePage-1)*PAGE_SIZE,edgePage*PAGE_SIZE);
      nodesHost.innerHTML=ns.length?ns.map(n=>`<button type="button" class="context-graph-node" data-rune-graph-node="${esc(n.id)}"><small>${esc(nodeTypeLabel(n.type))}${n.group?' · '+esc(n.group):''}</small><strong>${esc(n.label)}</strong><small>${esc(n.definition||n.english||n.id)}</small></button>`).join(''):'<div class="context-empty">沒有符合的節點。</div>';
      edgesHost.innerHTML=es.length?es.map(e=>`<article class="context-graph-edge"><div class="context-graph-edge-path"><span>${esc(e.source)}</span><span class="context-graph-edge-type">→ ${esc(edgeTypeLabel(e.type))} →</span><span>${esc(e.target)}</span></div></article>`).join(''):'<div class="context-empty">沒有符合的關係。</div>';
      nodesHost.insertAdjacentHTML('beforeend',pager('node',currentView.nodes.length,nodePage));edgesHost.insertAdjacentHTML('beforeend',pager('edge',currentView.edges.length,edgePage));
    }
    function apply(){
      const q=input.value.trim();let view=searchGraph(graph,q),group=groupSel.value,edgeType=edgeSel.value;
      if(group){const allowed=new Set(view.nodes.filter(n=>n.group===group||n.label===group).map(n=>n.id));for(const e of view.edges)if(allowed.has(e.source)||allowed.has(e.target)){allowed.add(e.source);allowed.add(e.target)}view={nodes:view.nodes.filter(n=>allowed.has(n.id)),edges:view.edges.filter(e=>allowed.has(e.source)&&allowed.has(e.target))};}
      if(edgeType)view={nodes:view.nodes,edges:view.edges.filter(e=>e.type===edgeType)};
      currentView=view;nodePage=1;edgePage=1;render();
      const resolved=q?resolveTerm(graph,q):null;status.textContent=`No API · shared static runtime · ${view.nodes.length} nodes / ${view.edges.length} edges · 衍生詞 ${graph.derived_count||0}${resolved?` · ${resolved.status}${resolved.resolved_rune?' → '+resolved.resolved_rune:''} · ${resolved.group}`:''}`;
    }
    root.addEventListener('click',ev=>{const pageBtn=ev.target.closest('[data-rune-page]');if(pageBtn&&!pageBtn.disabled){const next=Number(pageBtn.dataset.runePage||1);if(pageBtn.dataset.runePageKind==='node')nodePage=next;else edgePage=next;render();return;}const btn=ev.target.closest('[data-rune-graph-node]');if(btn){const node=graph.nodes.find(n=>n.id===btn.dataset.runeGraphNode);if(node){input.value=node.label;apply();}}});
    root.querySelector('form')?.addEventListener('submit',ev=>{ev.preventDefault();apply();});[groupSel,edgeSel].forEach(el=>el.addEventListener('change',apply));reset?.addEventListener('click',()=>{input.value='';groupSel.value='';edgeSel.value='';apply();});apply();
  }

  async function init(){
    const root=document.querySelector('#runeSemanticGraph');if(!root)return;
    try{
      if(!window.LOCRuneAnalytics?.load) await import('./rune-analytics.js');
      if(!window.LOCRuneAnalytics?.load) throw new Error('shared rune analytics runtime unavailable');
      const data=await window.LOCRuneAnalytics.load();
      const graph=buildGraph(data.rows,data.derivedEntries);window.LunaRuneSemanticGraph=graph;mount(graph);
    }catch(err){const status=document.querySelector('#runeGraphStatus');if(status)status.textContent='符文 Graph 載入失敗：'+err.message;}
  }

  window.LunaRuneGraph={buildGraph,searchGraph,resolveTerm,init};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();