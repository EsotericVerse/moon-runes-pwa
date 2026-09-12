'use client';

import { useEffect, useState } from 'react';
import { fetchLocJson } from '../data';

export default function ContextView(){
  const [graph,setGraph]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;fetchLocJson('/data/json/registries/LOC_GRAPH_SCHEMA.json').then(data=>live&&setGraph(data)).catch(e=>live&&setError(e.message));return()=>{live=false};},[]);
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LOC2 · Context</p><h1>脈絡</h1><p>關係、事件、情境與 Graph 的共同入口。Graph schema 只在進入此 View 時載入；大型 corpus 不會跟著 LOC 首頁初始化。</p></header>
    {error&&<div className="loc-status error">{error}</div>}
    {!graph?<div className="loc-loading">載入 Graph schema…</div>:<div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">Graph Contract</p><h2>節點類型</h2><div className="loc-chip-list">{graph.node_types?.map(x=><span key={x}>{x}</span>)}</div></section>
      <section className="loc-card"><p className="loc-eyebrow">Relations</p><h2>關係類型</h2><div className="loc-chip-list">{graph.edge_types?.map(x=><span key={x}>{x}</span>)}</div></section>
      <section className="loc-card"><p className="loc-eyebrow">Traversal</p><h2>Graph RAG</h2><p>預設 traversal depth：{graph.search_synthesis?.traversal_depth_default}；最大：{graph.search_synthesis?.traversal_depth_max}。</p><p>{graph.quality_policy?.model}</p><div className="loc-metrics"><div><small>最小 traversal score</small><strong>{graph.quality_policy?.min_traversal_score}</strong></div><div><small>Hop decay</small><strong>{graph.quality_policy?.hop_decay}</strong></div><div><small>Authority</small><strong>{graph.authority}</strong></div></div></section>
      <section className="loc-card"><p className="loc-eyebrow">Governance</p><h2>Graph 原則</h2><ol className="loc-rule-list">{graph.rules?.slice(0,8).map(rule=><li key={rule}>{rule}</li>)}</ol></section>
    </div>}
  </section>;
}
