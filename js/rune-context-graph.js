(()=>{
  'use strict';

  const RUNES_URL='data/json/core/runes.json';
  const GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
  const DEFAULT_GROUP='特殊';
  const GROUP_SET=new Set(GROUPS);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const splitTerms=value=>String(value||'').split(/[、,，;；/]/).map(x=>x.trim()).filter(Boolean);
  const nodeId=(type,label)=>`${type}:${label}`;

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
      const m=chunk.match(/^(.+?)屬(.+?)$/);
      if(!m)continue;
      const source=m[1].trim(), target=m[2].trim();
      if(!source||!target)continue;
      const targetRune=runeNames.has(target)?target:null;
      out.push({source,target,targetRune,raw:chunk});
    }
    return out;
  }

  function buildGraph(runes){
    const nodes=new Map(),edges=new Map();
    const runeNames=new Set((runes||[]).map(r=>String(r?.符文名稱||'').trim()).filter(Boolean));

    for(const group of GROUPS){
      addNode(nodes,{id:nodeId('group',group),label:group,type:'group',group});
    }

    for(const rune of runes||[]){
      const name=String(rune?.符文名稱||'').trim();
      if(!name)continue;
      const num=Number(rune?.編號);
      const rawGroup=String(rune?.所屬分組||'').trim();
      const group=GROUP_SET.has(rawGroup)?rawGroup:DEFAULT_GROUP;
      const rid=nodeId('rune',name);
      addNode(nodes,{
        id:rid,label:name,type:'rune',group,
        number:Number.isFinite(num)?num:null,
        english:String(rune?.英文||''),
        definition:String(rune?.符文說明||''),
        archetype:String(rune?.人格原型||''),
        polarity:String(rune?.卡片屬性||''),
        moon_phase:String(rune?.月相||''),
        source:'data/json/core/runes.json'
      });
      addEdge(edges,{
        source:rid,target:nodeId('group',group),type:'belongs_to_group',
        source_field:'所屬分組',evidence:group
      });

      for(const term of splitTerms(rune?.正向關鍵詞)){
        const tid=nodeId('term',term);
        addNode(nodes,{id:tid,label:term,type:'term',group:DEFAULT_GROUP});
        addEdge(edges,{
          source:tid,target:rid,type:'keyword_of',
          source_field:'正向關鍵詞',evidence:term
        });
      }
      for(const term of splitTerms(rune?.反向關鍵詞)){
        const tid=nodeId('term',term);
        addNode(nodes,{id:tid,label:term,type:'term',group:DEFAULT_GROUP});
        addEdge(edges,{
          source:tid,target:rid,type:'reverse_keyword_of',
          source_field:'反向關鍵詞',evidence:term
        });
      }

      for(const rule of parseOwnershipRules(rune?.額外規則,runeNames)){
        const sid=nodeId(rule.targetRune&&rule.source===rule.targetRune?'rune':'term',rule.source);
        if(!nodes.has(sid))addNode(nodes,{id:sid,label:rule.source,type:'term',group:DEFAULT_GROUP});
        const targetId=rule.targetRune?nodeId('rune',rule.targetRune):nodeId('term',rule.target);
        if(!nodes.has(targetId))addNode(nodes,{id:targetId,label:rule.target,type:rule.targetRune?'rune':'term',group:DEFAULT_GROUP});
        addEdge(edges,{
          source:sid,target:targetId,type:'ownership',
          source_field:'額外規則',evidence:rule.raw
        });
      }
    }

    return {
      version:'runes-json-derived-v1',
      api_used:false,
      default_group:DEFAULT_GROUP,
      groups:GROUPS,
      governance:{
        group_unique:true,
        classification_order:['詞類／句內語意角色','群組主體性','符文語意歸屬','正反面／衝突校準'],
        special_is_default:true,
        canonical_source:RUNES_URL
      },
      nodes:[...nodes.values()],
      edges:[...edges.values()]
    };
  }

  function adjacent(graph,id){
    const edgeRows=graph.edges.filter(e=>e.source===id||e.target===id);
    const ids=new Set([id]);
    edgeRows.forEach(e=>{ids.add(e.source);ids.add(e.target)});
    return {nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:edgeRows};
  }

  function searchGraph(graph,query){
    const q=String(query||'').trim().toLowerCase();
    if(!q)return graph;
    const matched=graph.nodes.filter(n=>[
      n.label,n.english,n.definition,n.archetype,n.group,n.polarity
    ].filter(Boolean).join(' ').toLowerCase().includes(q));
    const ids=new Set();
    const edges=[];
    for(const n of matched){
      const a=adjacent(graph,n.id);
      a.nodes.forEach(x=>ids.add(x.id));
      a.edges.forEach(e=>edges.push(e));
    }
    const edgeMap=new Map(edges.map(e=>[[e.source,e.type,e.target].join('|'),e]));
    return {nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:[...edgeMap.values()]};
  }

  function renderList(el,rows,empty){
    if(!el)return;
    el.innerHTML=rows.length?rows.join(''):`<div class="context-empty">${esc(empty)}</div>`;
  }

  function mount(graph){
    const root=document.querySelector('#runeSemanticGraph');
    if(!root)return;
    const input=root.querySelector('#runeGraphQuery');
    const status=root.querySelector('#runeGraphStatus');
    const nodesEl=root.querySelector('#runeGraphNodes');
    const edgesEl=root.querySelector('#runeGraphEdges');
    const reset=root.querySelector('#runeGraphReset');
    const groupSel=root.querySelector('#runeGraphGroup');
    const edgeSel=root.querySelector('#runeGraphEdgeType');
    const PAGE=24;

    groupSel.innerHTML='<option value="">全部群組</option>'+GROUPS.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('');
    const edgeTypes=[...new Set(graph.edges.map(e=>e.type))].sort();
    edgeSel.innerHTML='<option value="">全部關係</option>'+edgeTypes.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');

    function apply(){
      const q=input.value.trim();
      let view=searchGraph(graph,q);
      const group=groupSel.value, edgeType=edgeSel.value;
      if(group){
        const allowed=new Set(view.nodes.filter(n=>n.group===group||n.label===group).map(n=>n.id));
        for(const e of view.edges){
          if(allowed.has(e.source)||allowed.has(e.target)){allowed.add(e.source);allowed.add(e.target)}
        }
        view={nodes:view.nodes.filter(n=>allowed.has(n.id)),edges:view.edges.filter(e=>allowed.has(e.source)&&allowed.has(e.target))};
      }
      if(edgeType)view={nodes:view.nodes,edges:view.edges.filter(e=>e.type===edgeType)};

      const shownNodes=view.nodes.slice(0,PAGE);
      const shownEdges=view.edges.slice(0,PAGE);
      renderList(nodesEl,shownNodes.map(n=>`<button type="button" class="context-graph-node rune-graph-node" data-rune-graph-node="${esc(n.id)}"><small>${esc(n.type)} · ${esc(n.group||DEFAULT_GROUP)}</small><strong>${esc(n.label)}</strong><small>${esc(n.definition||n.english||n.id)}</small></button>`),'沒有符合的節點。');
      renderList(edgesEl,shownEdges.map(e=>`<article class="context-graph-edge"><div class="context-graph-edge-path"><span>${esc(e.source.replace(/^[^:]+:/,''))}</span><span class="context-graph-edge-type">→ ${esc(e.type)} →</span><span>${esc(e.target.replace(/^[^:]+:/,''))}</span></div><small>${esc(e.source_field||'derived')} · ${esc(e.evidence||'')}</small></article>`),'沒有符合的關係。');
      status.textContent=`No API · ${view.nodes.length} nodes / ${view.edges.length} edges`+(view.nodes.length>PAGE||view.edges.length>PAGE?` · 畫面先顯示前 ${PAGE} 筆`:``);
    }

    root.addEventListener('click',ev=>{
      const btn=ev.target.closest('[data-rune-graph-node]');
      if(!btn)return;
      const id=btn.dataset.runeGraphNode;
      const node=graph.nodes.find(n=>n.id===id);
      if(!node)return;
      input.value=node.label;
      apply();
    });
    root.querySelector('form')?.addEventListener('submit',ev=>{ev.preventDefault();apply()});
    [groupSel,edgeSel].forEach(el=>el?.addEventListener('change',apply));
    reset?.addEventListener('click',()=>{input.value='';groupSel.value='';edgeSel.value='';apply()});
    apply();
  }

  async function init(){
    const root=document.querySelector('#runeSemanticGraph');
    if(!root)return;
    try{
      const res=await fetch(RUNES_URL,{cache:'no-store'});
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const runes=await res.json();
      const graph=buildGraph(runes);
      window.LunaRuneSemanticGraph=graph;
      mount(graph);
    }catch(err){
      const status=document.querySelector('#runeGraphStatus');
      if(status)status.textContent='符文 Graph 載入失敗：'+err.message;
    }
  }

  window.LunaRuneGraph={buildGraph,searchGraph,init};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
