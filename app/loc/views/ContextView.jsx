'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJson, LOC_DATA } from '../data';
import { useLocalStore } from '../local-store';

const TABS=[['overview','總覽'],['events','事件'],['relations','關係式'],['scenarios','情境'],['graph','符文語意圖']];
const UI_SETTINGS_KEY='loc-ui-settings-v1';
const DEFAULT_UI_SETTINGS={draw_response:'ritual',list_page_size:10};
const LIST_PAGE_OPTIONS=[5,10,15,20,25,50];
const split=value=>String(value||'').split(/[、,，]/).map(x=>x.trim()).filter(Boolean);

function Pagination({page,total,pageSize,onChange}){
  const pages=Math.max(1,Math.ceil(total/pageSize));
  if(total<=pageSize)return null;
  return <div className="loc-pagination"><span>第 {page} / {pages} 頁 · 共 {total} 筆 · 每頁 {pageSize}</span><div><button className="loc-button" disabled={page<=1} onClick={()=>onChange(page-1)}>上一頁</button><button className="loc-button" disabled={page>=pages} onClick={()=>onChange(page+1)}>下一頁</button></div></div>;
}

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
  for(const [keyword,owners] of keywordOwners){if(owners.length<2)continue;for(let i=0;i<owners.length;i++)for(let j=i+1;j<owners.length;j++)edges.push({source:owners[i].name,target:owners[j].name,type:'shared_keyword',label:keyword});}
  return {nodes,edges};
}

export default function ContextView(){
  const {value:uiSettings}=useLocalStore(UI_SETTINGS_KEY,DEFAULT_UI_SETTINGS);
  const [tab,setTab]=useState('overview');
  const [events,setEvents]=useState(null);const [relations,setRelations]=useState(null);const [scenarios,setScenarios]=useState(null);const [runes,setRunes]=useState(null);
  const [error,setError]=useState('');const [eventPage,setEventPage]=useState(1);const [relationPage,setRelationPage]=useState(1);const [scenarioPage,setScenarioPage]=useState(1);const [scenarioGroup,setScenarioGroup]=useState('');const [scenarioQuery,setScenarioQuery]=useState('');const [graphQuery,setGraphQuery]=useState('');const [graphGroup,setGraphGroup]=useState('');const [graphNodePage,setGraphNodePage]=useState(1);const [graphEdgePage,setGraphEdgePage]=useState(1);
  const pageSize=LIST_PAGE_OPTIONS.includes(Number(uiSettings?.list_page_size))?Number(uiSettings.list_page_size):10;

  useEffect(()=>{let live=true;const load=(path,setter)=>fetchLocJson(path).then(data=>live&&setter(data)).catch(e=>live&&setError(e.message));setError('');
    if(tab==='events'&&!events)load(LOC_DATA.LOC8_EVENT_SNAPSHOT,setEvents);
    if(tab==='relations'&&!relations)load(LOC_DATA.LOC_CROSS_RELATIONSHIP_REGISTRY,setRelations);
    if(tab==='scenarios'&&!scenarios)load(LOC_DATA.LOC2_EVENT_REGISTRY,setScenarios);
    if(tab==='graph'&&!runes)load(LOC_DATA.RUNES,setRunes);
    return()=>{live=false};
  },[tab,events,relations,scenarios,runes]);
  useEffect(()=>{setEventPage(1);setRelationPage(1);setScenarioPage(1);setGraphNodePage(1);setGraphEdgePage(1)},[pageSize]);

  const eventRows=useMemo(()=>[...(events?.events||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))),[events]);
  const relationRows=relations?.relationships||[];
  const scenarioRows=scenarios?.records||[];
  const groups=useMemo(()=>[...new Set(scenarioRows.map(x=>x.event_group).filter(Boolean))],[scenarioRows]);
  const filteredScenarios=useMemo(()=>{const query=scenarioQuery.trim().toLocaleLowerCase('zh-Hant');return scenarioRows.filter(item=>(!scenarioGroup||item.event_group===scenarioGroup)&&(!query||[item.event_id,item.title,item.event_group,item.requirement_signature,item.description].join(' ').toLocaleLowerCase('zh-Hant').includes(query)));},[scenarioRows,scenarioGroup,scenarioQuery]);
  const graph=useMemo(()=>buildRuneGraph(runes),[runes]);
  const filteredNodes=useMemo(()=>{const query=graphQuery.trim().toLocaleLowerCase('zh-Hant');return graph.nodes.filter(node=>(!graphGroup||node.group===graphGroup)&&(!query||[node.name,node.group,...node.keywords].join(' ').toLocaleLowerCase('zh-Hant').includes(query)));},[graph,graphGroup,graphQuery]);
  const visibleNames=useMemo(()=>new Set(filteredNodes.map(x=>x.name)),[filteredNodes]);
  const filteredEdges=useMemo(()=>graph.edges.filter(edge=>visibleNames.has(edge.source)&&visibleNames.has(edge.target)),[graph.edges,visibleNames]);
  const runeGroups=useMemo(()=>[...new Set(graph.nodes.map(x=>x.group))],[graph.nodes]);
  useEffect(()=>{setGraphNodePage(1);setGraphEdgePage(1)},[graphQuery,graphGroup]);

  const shownEvents=eventRows.slice((eventPage-1)*pageSize,eventPage*pageSize);
  const shownRelations=relationRows.slice((relationPage-1)*pageSize,relationPage*pageSize);
  const shownScenarios=filteredScenarios.slice((scenarioPage-1)*pageSize,scenarioPage*pageSize);
  const shownGraphNodes=filteredNodes.slice((graphNodePage-1)*pageSize,graphNodePage*pageSize);
  const shownGraphEdges=filteredEdges.slice((graphEdgePage-1)*pageSize,graphEdgePage*pageSize);

  return <section className="loc-view">
    <header className="loc-hero"><p className="loc-eyebrow">Context</p><h1>脈絡</h1><p className="loc-subtitle">從事件、關係、情境與符文語意，看文字與概念怎麼彼此連起來。</p></header>
    <nav className="loc-tabs" aria-label="脈絡功能">{TABS.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    {error&&<div className="loc-status error">{error}</div>}

    {tab==='overview'&&<div className="loc-grid two">
      <section className="loc-card"><p className="loc-eyebrow">Explore</p><h2>從不同角度看脈絡</h2><p>可以從事件、關係、情境或符文語意圖進入；每一種視角都保留自己的資料來源與關係。</p></section>
      <section className="loc-card"><p className="loc-eyebrow">Authority</p><h2>保留來源與權威</h2><p>不同資料可以互相連結與比較，但不因為被放在同一個脈絡裡，就改變原本的來源與治理權。</p></section>
    </div>}

    {tab==='events'&&<section className="loc-card"><p className="loc-eyebrow">Event</p><h2>事件</h2>{!events?<p>載入事件…</p>:<><div className="loc-context-list">{shownEvents.map(item=><article className="loc-context-item" key={item.id}><div className="loc-result-meta"><time>{item.date}</time><span>{item.event_type||item.status}</span></div><h3>{item.title}</h3><p>{item.description}</p>{item.state_after&&<p><strong>狀態 →</strong> {item.state_after}</p>}</article>)}</div><Pagination page={eventPage} total={eventRows.length} pageSize={pageSize} onChange={setEventPage}/></>}</section>}

    {tab==='relations'&&<section className="loc-card"><p className="loc-eyebrow">Relation</p><h2>關係式</h2>{!relations?<p>載入關係…</p>:<><div className="loc-context-list">{shownRelations.map(item=><article className="loc-context-item" key={item.relationship_id}><div className="loc-result-meta"><span>類型：{item.relation_type}</span><span>證據：{item.evidence_status}</span></div><h3>{item.source?.title||item.canonical_key}</h3><p>{item.relation_summary}</p><div className="loc-chip-list">{item.targets?.map(target=><span key={`${item.relationship_id}-${target.work_ref}`}>→ {target.title||target.work_ref}</span>)}</div></article>)}</div><Pagination page={relationPage} total={relationRows.length} pageSize={pageSize} onChange={setRelationPage}/></>}</section>}

    {tab==='scenarios'&&<section className="loc-card"><p className="loc-eyebrow">Scenario</p><h2>情境</h2>{!scenarios?<p>載入情境…</p>:<><div className="loc-filter-row"><select value={scenarioGroup} onChange={e=>{setScenarioGroup(e.target.value);setScenarioPage(1)}}><option value="">全部群組</option>{groups.map(group=><option key={group} value={group}>{group}</option>)}</select><input value={scenarioQuery} onChange={e=>{setScenarioQuery(e.target.value);setScenarioPage(1)}} placeholder="搜尋情境"/></div><div className="loc-context-list">{shownScenarios.map(item=><article className="loc-context-item" key={item.event_id}><div className="loc-result-meta"><span>群組：{item.event_group}</span><span>需求：{item.requirement_signature}</span></div><h3>{item.event_id} · {item.title}</h3><p>{item.description}</p></article>)}</div><Pagination page={scenarioPage} total={filteredScenarios.length} pageSize={pageSize} onChange={setScenarioPage}/></>}</section>}

    {tab==='graph'&&<section className="loc-card"><p className="loc-eyebrow">Semantic Graph</p><h2>符文語意圖</h2>{!runes?<p>載入符文資料…</p>:<><p className="loc-subtitle">從群組與關鍵詞關係，看不同符文之間如何形成語意連結。</p><div className="loc-filter-row"><select value={graphGroup} onChange={e=>setGraphGroup(e.target.value)}><option value="">全部群組</option>{runeGroups.map(group=><option key={group} value={group}>{group}</option>)}</select><input value={graphQuery} onChange={e=>setGraphQuery(e.target.value)} placeholder="搜尋符文、群組或關鍵詞"/></div><div className="loc-metrics"><div><small>符文</small><strong>{filteredNodes.length}</strong></div><div><small>關係</small><strong>{filteredEdges.length}</strong></div><div><small>每頁</small><strong>{pageSize}</strong></div></div><div className="loc-grid two"><div><h3>符文</h3><div className="loc-context-list">{shownGraphNodes.map(node=><article className="loc-context-item compact" key={node.id}><b>{node.name}</b><span>{node.group}</span><small>{node.keywords.join(' · ')}</small></article>)}</div><Pagination page={graphNodePage} total={filteredNodes.length} pageSize={pageSize} onChange={setGraphNodePage}/></div><div><h3>關係</h3><div className="loc-context-list">{shownGraphEdges.map((edge,index)=><article className="loc-context-item compact" key={`${edge.source}-${edge.target}-${edge.label}-${index}`}><b>{edge.source} ↔ {edge.target}</b><small>{edge.label}</small></article>)}</div><Pagination page={graphEdgePage} total={filteredEdges.length} pageSize={pageSize} onChange={setGraphEdgePage}/></div></div></>}</section>}
  </section>;
}
