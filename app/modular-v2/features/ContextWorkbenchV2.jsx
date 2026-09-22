'use client';

import {useEffect,useMemo,useState} from 'react';
import {selectNeonRows} from '../../loc/neon-repository';

const PAGE_SIZE=24;
const GRAPH_SEED=[
  {kind:'node',id:'scope:loc',title:'LOC／月典',node_type:'scope'},
  {kind:'node',id:'scope:runes',title:'月之符文／LunaRunes',node_type:'language'},
  {kind:'node',id:'scope:lo3rwang',title:'lo3rwang／作者',node_type:'author'},
  {kind:'edge',id:'scope:loc-runes',source_id:'scope:loc',target_id:'scope:runes',source_label:'LOC／月典',target_label:'月之符文／LunaRunes',relation_type:'coordinates'},
  {kind:'edge',id:'scope:loc-author',source_id:'scope:loc',target_id:'scope:lo3rwang',source_label:'LOC／月典',target_label:'lo3rwang／作者',relation_type:'authored_by'},
  {kind:'edge',id:'scope:runes-author',source_id:'scope:runes',target_id:'scope:lo3rwang',source_label:'月之符文／LunaRunes',target_label:'lo3rwang／作者',relation_type:'expressed_by'}
];

const text=value=>String(value??'');

function graphOf(rows){
  const nodes=new Map();
  const edges=[];
  const put=(id,patch={})=>{
    if(!id)return;
    const current=nodes.get(id)||{id,label:id,type:'node'};
    nodes.set(id,{...current,...patch});
  };
  for(const raw of rows){
    const payload=raw?.payload&&typeof raw.payload==='object'?raw.payload:{};
    const value={...raw,...payload};
    const kind=value.kind||raw?.context_type||'node';
    const id=value.id||raw?.context_key;
    if(kind==='node'||kind==='period'||kind==='semantic_history'){
      const nodeId=id||((raw?.scope_id||'loc')+':'+(value.title||'node'));
      put(nodeId,{
        label:value.title||value.name||nodeId,
        type:value.node_type||raw?.context_type||value.type||'node',
        note:value.description||raw?.summary||'',
        record:{...value,kind:'node',id:nodeId}
      });
    }
    if(kind==='edge'){
      const source=value.source_id;
      const target=value.target_id;
      if(!source||!target)continue;
      put(source,{label:value.source_label||source,type:value.source_type||'node'});
      put(target,{label:value.target_label||target,type:value.target_type||'node'});
      edges.push({
        id:id||('edge:'+edges.length),
        source,
        target,
        type:value.relation_type||'related',
        label:value.title||raw?.summary||'',
        record:{...value,kind:'edge',id:id||('edge:'+edges.length)}
      });
    }
  }
  return {nodes:[...nodes.values()],edges};
}

function pointFor(index,total){
  const angle=(index/Math.max(total,1))*Math.PI*2-Math.PI/2;
  const radius=Math.min(300,150+Math.sqrt(total)*5);
  return {x:600+Math.cos(angle)*radius,y:370+Math.sin(angle)*radius};
}

function Pager({page,total,onChange}){
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  if(pages<=1)return null;
  return <div className="scope-v2-pagination"><span>第 {page} / {pages} 頁 · 共 {total} 筆</span><div><button type="button" disabled={page<=1} onClick={()=>onChange(page-1)}>上一頁</button><button type="button" disabled={page>=pages} onClick={()=>onChange(page+1)}>下一頁</button></div></div>;
}

export default function ContextWorkbenchV2({view='loc_context_entries'}){
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState('');
  const [query,setQuery]=useState('');
  const [submitted,setSubmitted]=useState('');
  const [nodeType,setNodeType]=useState('');
  const [edgeType,setEdgeType]=useState('');
  const [page,setPage]=useState(1);
  const [depth,setDepth]=useState(2);
  const [labels,setLabels]=useState(true);

  useEffect(()=>{
    let live=true;
    setLoading(true);
    const table=view.includes('.')?view:`api.${view}`;
    selectNeonRows(table,{columns:'*',limit:5000}).then(({rows})=>{
      if(!live)return;
      setRows(rows);
      setNotice('已直接讀取 Neon。');
    }).catch(error=>{
      if(!live)return;
      setRows([]);
      setNotice(`Neon 讀取失敗：${error?.message||String(error)}`);
    }).finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view]);

  const graph=useMemo(()=>graphOf([...GRAPH_SEED,...rows]),[rows]);
  const nodeTypes=useMemo(()=>[...new Set(graph.nodes.map(node=>node.type).filter(Boolean))].sort(),[graph.nodes]);
  const edgeTypes=useMemo(()=>[...new Set(graph.edges.map(edge=>edge.type).filter(Boolean))].sort(),[graph.edges]);

  const filtered=useMemo(()=>{
    const q=submitted.trim().toLowerCase();
    const matching=new Set(graph.nodes.filter(node=>{
      const haystack=[node.id,node.label,node.type,node.note].map(text).join(' ').toLowerCase();
      return (!q||haystack.includes(q))&&(!nodeType||node.type===nodeType);
    }).map(node=>node.id));
    if(!q&&!nodeType)return graph.nodes;
    const connected=new Set(matching);
    for(const edge of graph.edges){
      if(matching.has(edge.source)||matching.has(edge.target)){connected.add(edge.source);connected.add(edge.target);}
    }
    return graph.nodes.filter(node=>connected.has(node.id));
  },[graph.nodes,graph.edges,submitted,nodeType]);

  const visibleNodes=useMemo(()=>filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE),[filtered,page]);
  const visibleIds=useMemo(()=>new Set(visibleNodes.map(node=>node.id)),[visibleNodes]);
  const visibleEdges=useMemo(()=>graph.edges.filter(edge=>visibleIds.has(edge.source)&&visibleIds.has(edge.target)&&(!edgeType||edge.type===edgeType)).slice(0,Math.max(120,PAGE_SIZE*depth*4)),[graph.edges,visibleIds,edgeType,depth]);
  const points=useMemo(()=>new Map(visibleNodes.map((node,index)=>[node.id,pointFor(index,visibleNodes.length)])),[visibleNodes]);

  return <section className="context-workbench">
    <div className="context-tool-card">
      <div className="context-item-head"><div><p className="scope-v2-eyebrow">GRAPH WORKBENCH</p><h2>關係圖探索器</h2></div><span className="context-graph-status">公開唯讀</span></div>
      <p>Node、Edge、Event 由既有脈絡資料展開；LOC、月之符文與作者作品的關係在同一張圖上展示。</p>
      <form className="context-graph-toolbar" onSubmit={event=>{event.preventDefault();setSubmitted(query);setPage(1);}}>
        <label>關係圖搜尋<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜尋節點、作品、符文、關係"/></label>
        <label>Depth<select value={String(depth)} onChange={event=>setDepth(Number(event.target.value))}><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
        <button type="submit" className="context-btn primary">搜尋 Graph</button>
      </form>
      <div className="context-graph-filter"><select value={nodeType} onChange={event=>{setNodeType(event.target.value);setPage(1)}}><option value="">全部節點類型</option>{nodeTypes.map(type=><option key={type}>{type}</option>)}</select><select value={edgeType} onChange={event=>setEdgeType(event.target.value)}><option value="">全部關係類型</option>{edgeTypes.map(type=><option key={type}>{type}</option>)}</select><label><input type="checkbox" checked={labels} onChange={event=>setLabels(event.target.checked)}/> 顯示文字</label><button type="button" className="context-btn ghost" onClick={()=>{setQuery('');setSubmitted('');setNodeType('');setEdgeType('');setPage(1)}}>清除</button></div>
      {loading?<p className="scope-v2-status">載入 Graph 唯讀資料…</p>:null}
      <div className="context-graph-summary"><strong>Graph · {graph.nodes.length} nodes / {graph.edges.length} edges</strong><span>{notice}</span>{submitted?<span>搜尋：{submitted}</span>:null}</div>
      <svg viewBox="0 0 1200 740" role="img" aria-label="LOC 關係圖唯讀展示" className="context-workbench-svg">
        <defs><marker id="context-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="currentColor"/></marker></defs>
        {visibleEdges.map(edge=>{const source=points.get(edge.source);const target=points.get(edge.target);if(!source||!target)return null;return <g key={edge.id} className="context-workbench-interactive"><line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="currentColor" strokeOpacity=".42" strokeWidth="1.5" markerEnd="url(#context-arrow)"/>{labels?<text x={(source.x+target.x)/2} y={(source.y+target.y)/2-5} textAnchor="middle" fontSize="10" fill="currentColor">{edge.type}</text>:null}</g>})}
        {visibleNodes.map(node=>{const point=points.get(node.id);if(!point)return null;return <g key={node.id}><circle cx={point.x} cy={point.y} r="22" fill="var(--loc-panel-2)" stroke="currentColor" strokeWidth="2"/><text x={point.x} y={point.y+5} textAnchor="middle" fontSize="16" fill="currentColor">○</text>{labels?<text x={point.x} y={point.y+40} textAnchor="middle" fontSize="11" fill="currentColor">{text(node.label).slice(0,18)}</text>:null}</g>})}
      </svg>
      <Pager page={page} total={filtered.length} onChange={setPage}/>
    </div>
  </section>;
}
