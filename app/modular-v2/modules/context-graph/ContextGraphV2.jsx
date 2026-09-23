'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

export default function ContextGraphV2({nodes=[],edges=[],focusIdentity=''}){
  const containerRef=useRef(null);
  const [error,setError]=useState('');
  const normalized=useMemo(()=>{
    const focus=String(focusIdentity||'');
    const safeNodes=(Array.isArray(nodes)?nodes:[]).map(node=>{
      const id=String(node.node_id||'');
      const focused=Boolean(focus&&(id===focus||String(node.label||'')===focus));
      return {
        ...node,
        id,
        label:node.label||id,
        title:node.description||node.node_type||'',
        group:node.scope_id||node.node_type||'context',
        ...(focused?{color:{background:'var(--loc-accent)',border:'var(--loc-accent)',highlight:{background:'var(--loc-accent)',border:'var(--loc-accent)'}}}: {})
      };
    });
    const validIds=new Set(safeNodes.map(node=>node.id));
    const safeEdges=(Array.isArray(edges)?edges:[]).flatMap(edge=>{
      const from=edge.source_node_id,to=edge.target_node_id;
      if(!validIds.has(from)||!validIds.has(to))return [];
      return [{
        ...edge,
        id:edge.edge_id,
        from,
        to,
        label:edge.relation_label||edge.relation_type,
        title:edge.description||edge.evidence||''
      }];
    });
    return {nodes:safeNodes,edges:safeEdges};
  },[nodes,edges,focusIdentity]);

  useEffect(()=>{
    let cancelled=false;
    let network=null;
    setError('');
    if(!containerRef.current||!normalized.nodes.length||!normalized.edges.length)return undefined;
    import('vis-network/standalone').then(({Network})=>{
      if(cancelled||!containerRef.current)return;
      network=new Network(containerRef.current,normalized,{
        autoResize:true,
        interaction:{hover:true,navigationButtons:true,keyboard:true},
        nodes:{shape:'box',borderWidth:1,margin:{top:10,right:14,bottom:10,left:14},font:{size:14,align:'center'}},
        edges:{arrows:{to:{enabled:true,scaleFactor:0.55}},font:{align:'middle',size:11},smooth:{type:'dynamic'}},
        physics:{stabilization:{enabled:true,iterations:120},barnesHut:{gravitationalConstant:-5000,springLength:145}},
      });
    }).catch(reason=>{if(!cancelled)setError(reason?.message||'關係圖套件載入失敗');});
    return()=>{cancelled=true;network?.destroy();};
  },[normalized]);

  if(!normalized.nodes.length||!normalized.edges.length)return null;
  return <div className='scope-context-graph-shell'>
    {error?<p className='scope-v2-status scope-v2-error'>{error}</p>:null}
    <div ref={containerRef} className='scope-context-graph' role='img' aria-label={'脈絡關係圖，'+normalized.nodes.length+' 個節點、'+normalized.edges.length+' 條關係'} />
    <p className='scope-v2-status'>{normalized.nodes.length} 個節點 · {normalized.edges.length} 條關係</p>
  </div>;
}
