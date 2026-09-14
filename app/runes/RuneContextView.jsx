'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../loc/data';
import { useLocalStore } from '../loc/local-store';

const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const split=value=>String(value||'').split(/[、,，]/).map(x=>x.trim()).filter(Boolean);

function buildRuneGraph(runes){
  const nodes=[];const edges=[];const keywordOwners=new Map();
  for(const rune of runes||[]){
    const id=String(rune['編號']??'');
    const name=rune['符文名稱']||rune['名稱']||'';
    if(!name)continue;
    const group=rune['所屬分組']||'特殊';
    const keywords=[...split(rune['正向關鍵詞']),...split(rune['反向關鍵詞'])];
    nodes.push({id,name,group,keywords});
    for(const keyword of keywords){if(!keywordOwners.has(keyword))keywordOwners.set(keyword,[]);keywordOwners.get(keyword).push({id,name});}
  }
  for(const [keyword,owners] of keywordOwners){if(owners.length<2)continue;for(let i=0;i<owners.length;i++)for(let j=i+1;j<owners.length;j++)edges.push({source:owners[i].name,target:owners[j].name,label:keyword});}
  return {nodes,edges};
}

function Pagination({page,total,pageSize,onChange}){
  const pages=Math.max(1,Math.ceil(total/pageSize));
  if(total<=pageSize)return null;
  return <div className="loc-pagination"><span>第 {page} / {pages} 頁 · 共 {total} 筆 · 每頁 {pageSize}</span><div><button className="loc-button" disabled={page<=1} onClick={()=>onChange(page-1)}>上一頁</button><button className="loc-button" disabled={page>=pages} onClick={()=>onChange(page+1)}>下一頁</button></div></div>;
}

export default function RuneContextView(){
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [runes,setRunes]=useState(null);const [error,setError]=useState('');
  const [query,setQuery]=useState('');const [group,setGroup]=useState('');const [nodePage,setNodePage]=useState(1);const [edgePage,setEdgePage]=useState(1);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;
  useEffect(()=>{let live=true;fetchLocJson(LOC_DATA.RUNES).then(data=>live&&setRunes(data)).catch(e=>live&&setError(e.message));return()=>{live=false};},[]);
  const graph=useMemo(()=>buildRuneGraph(runes),[runes]);
  const groups=useMemo(()=>[...new Set(graph.nodes.map(x=>x.group))],[graph.nodes]);
  const nodes=useMemo(()=>{const q=query.trim().toLocaleLowerCase('zh-Hant');return graph.nodes.filter(node=>(!group||node.group===group)&&(!q||[node.name,node.group,...node.keywords].join(' ').toLocaleLowerCase('zh-Hant').includes(q)));},[graph,group,query]);
  const visible=useMemo(()=>new Set(nodes.map(x=>x.name)),[nodes]);
  const edges=useMemo(()=>graph.edges.filter(edge=>visible.has(edge.source)&&visible.has(edge.target)),[graph.edges,visible]);
  useEffect(()=>{setNodePage(1);setEdgePage(1)},[query,group,pageSize]);
  const shownNodes=nodes.slice((nodePage-1)*pageSize,nodePage*pageSize);const shownEdges=edges.slice((edgePage-1)*pageSize,edgePage*pageSize);
  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">LunaRunes Semantic Graph</p><h1>符文語意圖</h1><p>只讀取月之符文核心資料，依群組與正反向關鍵詞建立符文之間的關係。</p></header>
    {error&&<div className="loc-status error">{error}</div>}
    {!runes?<section className="loc-card"><p>載入正式符文資料…</p></section>:<section className="loc-card"><div className="loc-filter-row"><select value={group} onChange={e=>setGroup(e.target.value)}><option value="">全部群組</option>{groups.map(value=><option key={value} value={value}>{value}</option>)}</select><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋符文、群組或關鍵詞"/></div><div className="loc-metrics"><div><small>節點</small><strong>{nodes.length}</strong></div><div><small>關係</small><strong>{edges.length}</strong></div></div><div className="loc-grid two"><div><h2>節點</h2><div className="loc-context-list">{shownNodes.map(node=><article className="loc-context-item compact" key={node.id}><b>{node.name}</b><span>{node.group}</span><small>{node.keywords.join(' · ')}</small></article>)}</div><Pagination page={nodePage} total={nodes.length} pageSize={pageSize} onChange={setNodePage}/></div><div><h2>關係</h2><div className="loc-context-list">{shownEdges.map((edge,index)=><article className="loc-context-item compact" key={`${edge.source}-${edge.target}-${edge.label}-${index}`}><b>{edge.source} ↔ {edge.target}</b><small>{edge.label}</small></article>)}</div><Pagination page={edgePage} total={edges.length} pageSize={pageSize} onChange={setEdgePage}/></div></div></section>}
  </section>;
}
