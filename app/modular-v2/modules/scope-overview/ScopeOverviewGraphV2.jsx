'use client';

import {useState} from 'react';

const POSITIONS=Object.freeze([
  {x:600,y:125},
  {x:855,y:360},
  {x:600,y:595},
  {x:345,y:360}
]);

export default function ScopeOverviewGraphV2({centerTitle='',centerSummary='',nodes=[]}){
  const visible=(Array.isArray(nodes)?nodes:[]).slice(0,4);
  const [selectedNode,setSelectedNode]=useState(null);
  const activeNode=visible.find(node=>node.id===selectedNode);

  return <div className="scope-overview-graph-wrap">
    <svg viewBox="0 0 1200 720" className="scope-overview-graph" role="group" aria-label="首頁 Graph 總覽">
      {visible.map((node,index)=>{
        const p=POSITIONS[index];
        return <line key={'edge-'+node.id} x1="600" y1="360" x2={p.x} y2={p.y} stroke="currentColor" strokeOpacity=".28" strokeWidth="2"/>;
      })}

      <g aria-hidden="true">
        <circle cx="600" cy="360" r="72" fill="var(--loc-panel-2)" stroke="currentColor" strokeWidth="2"/>
        <text x="600" y="352" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="700" textLength="132" lengthAdjust="spacingAndGlyphs">{centerTitle}</text>
        <text x="600" y="375" textAnchor="middle" fill="currentColor" fontSize="11" textLength="132" lengthAdjust="spacingAndGlyphs">{centerSummary}</text>
      </g>

      {visible.map((node,index)=>{
        const p=POSITIONS[index];
        const selected=node.id===selectedNode;
        const titleParts=String(node.title||'').split('｜');
        const firstLineY=p.y-((titleParts.length-1)*9);
        return <g key={node.id} role="button" tabIndex={0} aria-pressed={selected}
          aria-label={node.title+'。點擊顯示說明。'}
          onClick={()=>setSelectedNode(selected?null:node.id)}
          onKeyDown={event=>{
            if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedNode(selected?null:node.id);}
            if(event.key==='Escape')setSelectedNode(null);
          }}
          style={{cursor:'pointer'}}>
          <circle cx={p.x} cy={p.y} r="74" fill="var(--loc-accent)" fillOpacity=".16" stroke="currentColor" strokeWidth={selected?4:2}/>
          <text x={p.x} y={firstLineY} textAnchor="middle" fill="currentColor" pointerEvents="none">
            {titleParts.map((part,line)=><tspan key={line} x={p.x} dy={line===0?0:18} fontSize="15" fontWeight="700">{part}</tspan>)}
          </text>
        </g>;
      })}
    </svg>
    <div role="region" aria-live="polite" aria-label={activeNode?activeNode.title+'說明':'Graph 節點說明'}
      style={{margin:'0 auto',maxWidth:'48rem',minHeight:'3.25rem',padding:'1rem 1.25rem',border:'1px solid currentColor',borderRadius:'1rem',background:'var(--loc-panel-2)'}}>
      {activeNode
        ? <><strong>{activeNode.title}</strong><p style={{margin:'0.5rem 0 0'}}>{activeNode.summary}</p></>
        : <p style={{margin:0}}>點選圓形節點，顯示文字。</p>}
    </div>
  </div>;
}
