'use client';

import {useEffect,useMemo,useState} from 'react';
import {selectScopeContextData} from '../../loc/neon-context-client';

function graphOf(rows){
  const nodes=new Map();
  const edges=[];
  const put=(id,patch={})=>{if(id)nodes.set(id,{id,label:id,type:'node',...(nodes.get(id)||{}),...patch});};
  for(const row of rows||[]){
    const payload=row?.payload&&typeof row.payload==='object'?row.payload:{};
    const value={...row,...payload};
    const kind=value.kind||row?.context_type;
    if(kind==='node'){
      const id=String(value.id||row.context_key||'');
      put(id,{label:value.title||value.name||row.title||id,type:value.node_type||'node'});
    }
    if(kind==='edge'){
      const source=String(value.source_id||'');
      const target=String(value.target_id||'');
      if(!source||!target)continue;
      put(source,{label:value.source_label||source});
      put(target,{label:value.target_label||target});
      edges.push({id:String(value.id||row.context_key||`edge-${edges.length}`),source,target});
    }
  }
  const degree=new Map();
  for(const edge of edges){
    degree.set(edge.source,(degree.get(edge.source)||0)+1);
    degree.set(edge.target,(degree.get(edge.target)||0)+1);
  }
  const visible=[...nodes.values()]
    .sort((a,b)=>(degree.get(b.id)||0)-(degree.get(a.id)||0)||String(a.label).localeCompare(String(b.label)))
    .slice(0,24);
  const visibleIds=new Set(visible.map(node=>node.id));
  return {nodes:visible,edges:edges.filter(edge=>visibleIds.has(edge.source)&&visibleIds.has(edge.target))};
}
function pointFor(index,total){
  const angle=(index/Math.max(total,1))*Math.PI*2-Math.PI/2;
  const radius=Math.min(300,150+Math.sqrt(total)*7);
  return {x:600+Math.cos(angle)*radius,y:370+Math.sin(angle)*radius};
}

export default function ContextWorkbenchV2({scopeId='loc'}){
  const [rows,setRows]=useState([]);
  const [error,setError]=useState('');
  useEffect(()=>{
    let live=true;
    selectScopeContextData(scopeId)
      .then(({rows})=>live&&setRows(rows))
      .catch(error=>live&&setError(error?.message||String(error)));
    return()=>{live=false};
  },[scopeId]);
  const graph=useMemo(()=>graphOf(rows),[rows]);
  const points=useMemo(()=>new Map(graph.nodes.map((node,index)=>[node.id,pointFor(index,graph.nodes.length)])),[graph.nodes]);

  return <section className="loc-view context-workbench">
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    <svg viewBox="0 0 1200 740" role="img" aria-label="Graph" className="context-workbench-svg">
      <defs><marker id="context-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="currentColor"/></marker></defs>
      {graph.edges.map(edge=>{const source=points.get(edge.source),target=points.get(edge.target);if(!source||!target)return null;return <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="currentColor" strokeOpacity=".42" strokeWidth="1.5" markerEnd="url(#context-arrow)"/>;})}
      {graph.nodes.map(node=>{const point=points.get(node.id);const label=String(node.label).slice(0,22);const width=Math.max(96,Math.min(210,label.length*14+28));return <g key={node.id}><rect x={point.x-width/2} y={point.y-20} width={width} height="40" rx="10" fill="var(--loc-panel-2)" stroke="currentColor" strokeWidth="1.5"/><text x={point.x} y={point.y+5} textAnchor="middle" fontSize="13" fill="currentColor">{label}</text></g>;})}
    </svg>
  </section>;
}
