'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

export default function ScopeOverviewNetwork({centerTitle='',centerSummary='',nodes=[]}){
  const containerRef=useRef(null);
  const networkRef=useRef(null);
  const [selectedId,setSelectedId]=useState(nodes[0]?.id||'');
  const [error,setError]=useState('');
  const safeNodes=useMemo(()=>Array.isArray(nodes)?nodes.slice(0,8):[],[nodes]);
  const selected=safeNodes.find(node=>node.id===selectedId)||safeNodes[0]||null;

  useEffect(()=>{
    let cancelled=false;
    let network=null;
    setError('');
    if(!containerRef.current)return undefined;
    const centerId='author-home-center';
    const computed=getComputedStyle(containerRef.current);
    const accent=computed.getPropertyValue('--loc-accent').trim()||'#7c9bbd';
    const panel=computed.getPropertyValue('--loc-panel').trim()||'#fff';
    const panel2=computed.getPropertyValue('--loc-panel-2').trim()||panel;
    const line=computed.getPropertyValue('--loc-line').trim()||'#aab';
    const graphNodes=[
      {id:centerId,label:centerTitle||'作者',title:centerSummary||'',shape:'box',color:{background:panel2,border:accent},font:{size:20,bold:true}},
      ...safeNodes.map(node=>({id:String(node.id),label:String(node.title||node.id),title:String(node.summary||''),
        shape:'box',margin:16,widthConstraint:{maximum:250},color:{background:panel,border:line},font:{size:16,multi:'html'}}))
    ];
    const graphEdges=safeNodes.map(node=>({from:centerId,to:String(node.id),color:{color:line,highlight:accent},width:2,smooth:false}));
    import('vis-network/standalone').then(({Network})=>{
      if(cancelled||!containerRef.current)return;
      network=new Network(containerRef.current,{nodes:graphNodes,edges:graphEdges},{
        autoResize:true,layout:{improvedLayout:true,hierarchical:{
          enabled:true,direction:'UD',sortMethod:'directed',levelSeparation:180,nodeSpacing:240,treeSpacing:280,
          blockShifting:true,edgeMinimization:true,parentCentralization:true
        }},
        interaction:{hover:true,navigationButtons:true,keyboard:true,dragNodes:false,zoomView:true},
        nodes:{borderWidth:2,chosen:{node:(values)=>{values.borderColor='var(--loc-accent)';values.borderWidth=3;}}},
        edges:{selectionWidth:2,hoverWidth:2,smooth:{type:'cubicBezier',forceDirection:'vertical',roundness:0.4}},
        physics:{enabled:false},
      });
      networkRef.current=network;
      network.on('selectNode',event=>{
        const id=event.nodes?.[0];
        if(id&&id!==centerId)setSelectedId(String(id));
      });
      network.fit({animation:{duration:250,easingFunction:'easeInOutQuad'}});
    }).catch(reason=>{if(!cancelled)setError(reason?.message||'vis-network 載入失敗');});
    return()=>{cancelled=true;network?.destroy();networkRef.current=null;};
  },[centerTitle,centerSummary,safeNodes]);

  return <div className="scope-overview-network-wrap">
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    <div ref={containerRef} className="scope-overview-network" role="img" aria-label="作者首頁 vis-network 關係圖"/>
    {selected?<article className="scope-overview-network-detail">
      <h3>{selected.title}</h3>
      <p>{selected.summary}</p>
      {selected.href?<a href={selected.href}>前往{selected.title?.split('｜').at(-1)||'相關頁面'} →</a>:null}
    </article>:null}
  </div>;
}
