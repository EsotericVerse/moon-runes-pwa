'use client';

import {useEffect,useState} from 'react';
import {neonClient} from '../../loc/neon-client';
import {fetchLocJson,fetchLocJsonBatch,LOC_DATA} from '../../loc/data';
import FeaturePageV2 from '../FeaturePageV2';
import {ScopeCardV2} from '../PageShellV2';
import {scopeDataViewV2} from '../scope-registry.v2';
import {useScopeRuntimeV2} from '../use-scope-runtime.v2';

const PAGE_SIZE=20;

const CONTEXT_COPY=Object.freeze({
  eyebrow:'Context',
  title:'關係圖探索器',
  paragraphs:[
    '把關係基準點與關係連結起來，查看局部脈絡跟分析趨勢。',
    '從一個概念、作品、事件或符文出發，查看它周圍的節點與關係。',
    '脈絡整理語彙、事件、關係與時間之間的連結，讓分散的內容可以被搜尋、比較、理解與追蹤。',
    '本頁以 Graph、Event 與 Trend 為主要功能：Graph 呈現節點與關係，Event 記錄發生的事件，Trend 以年月等時間單位觀察脈絡的變化。Scenario 與互動實作則是脈絡系統的延伸。'
  ]
});

function contextTitle(row,index){
  const value=row?.title||row?.display_title||row?.label||row?.name||row?.subject||row?.context_name||row?.context_key;
  if(value)return String(value);
  if(row?.source||row?.source_name)return String(row.source||row.source_name);
  return `脈絡項目 ${index+1}`;
}

const LEGACY_SECTIONS=Object.freeze({
  graph:{eyebrow:'Graph Overview',title:'總覽',text:'把節點與關係組合起來，查看局部脈絡。Graph 只負責搜尋、展開與閱讀；節點與關係式分別在各自功能中管理。'},
  node:{eyebrow:'Context / Node',title:'節點',text:'管理 Graph 中可以被連結的基本單位。節點代表概念、時期、人物、作品、符文、事件或狀態；它本身不是關係式。'},
  edge:{eyebrow:'Context / Relation',title:'關聯',text:'描述兩個節點之間的連結。Relation 負責 source → relation → target，以及日期、方向、摘要、證據與可信度。'},
  scenarios:{eyebrow:'Context / Scenario',title:'情境',text:'把節點與關係放回具體情境，觀察同一組資料在不同條件下如何成立、轉化或產生不同結果。'},
  trend:{eyebrow:'Context / Trend',title:'趨勢',text:'以年月等時間單位觀察脈絡變化，整理重複出現、關係改變與長期方向；趨勢不是絕對預測。'},
  dailtrunes:{eyebrow:'Context / Daily Runes',title:'每日符文統計分析',text:'每日符文紀錄放回時間中，觀察重複、方向與長期變化；線上抽牌與實體牌紀錄分開處理。'}
});

export default function ContextV2({section=null}){
  const {scopeId,scope}=useScopeRuntimeV2();
  const view=scopeDataViewV2(scopeId,'context');
  const [rows,setRows]=useState([]);
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    let live=true;
    setRows([]);setPage(1);setError('');
    if(!view)return()=>{live=false};
    setLoading(true);
    neonClient.from(view).select('*').order('updated_at',{ascending:false}).limit(1000)
      .then(({data,error})=>{
        if(error)throw new Error(error.message||'Context read failed');
        if(!Array.isArray(data)||!data.length)throw new Error('Context projection is empty');
        if(live)setRows(data);
      })
      .catch(async error=>{
        try{
          const paths=scopeId==='loc'
            ?[LOC_DATA.LOC8_EVENT_SNAPSHOT]
            :[LOC_DATA.LOC_CROSS_RELATIONSHIP_REGISTRY];
          const values=await fetchLocJsonBatch(paths,{concurrency:2});
          const eventValue=values[0];
          const events=Array.isArray(eventValue?.events)?eventValue.events:[];
          const relations=scopeId==='loc'?[]:(Array.isArray(eventValue)?eventValue:(eventValue?.relations||eventValue?.relationships||eventValue?.edges||[]));
          const rows=[
            ...events.map((row,index)=>({...row,context_key:row.id||`event-${index}`,context_type:'事件',title:row.title||row.name||'事件',summary:row.description||row.summary||''})),
            ...relations
          ];
          if(live){setRows(rows);setError('');}
        }catch{
          if(live)setError(String(error?.message||error));
        }
      })
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view]);

  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const shown=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const legacy=LEGACY_SECTIONS[section]||LEGACY_SECTIONS.graph;
  return <FeaturePageV2 featureId="context" subtitle="人事物的分析關聯表達">
    {section?<ScopeCardV2 eyebrow={legacy.eyebrow} title={legacy.title}><p>{legacy.text}</p></ScopeCardV2>:null}
    <ScopeCardV2 eyebrow={CONTEXT_COPY.eyebrow} title={CONTEXT_COPY.title}>
      {CONTEXT_COPY.paragraphs.map(text=><p key={text}>{text}</p>)}
    </ScopeCardV2>
    {!view?<p className="scope-v2-status">此 Scope 尚未啟用脈絡 projection。</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入中…</p>:null}
    <div className="scope-v2-grid-two">
      <ScopeCardV2 eyebrow="Graph" title="關係圖探索">
        <p>從概念、作品、事件或符文出發，查看周圍節點與關係。Graph 只負責搜尋、展開與閱讀。</p>
        <p className="scope-v2-status">目前頁面先呈現既有脈絡 projection；節點與關係分開管理。</p>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="Node" title="節點">
        <p>節點代表概念、時期、人物、作品、符文、事件或狀態；節點本身不是關係式。</p>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="Relation" title="關聯">
        <p>Relation 描述 source → relation → target，以及日期、方向、摘要、證據與可信度。</p>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="Scenario · Event" title="情境與事件">
        <p>事件放回具體情境與時間，觀察狀態如何成立、轉化或產生不同結果；Scenario 是展示與分析單位，不是固定符文配對。</p>
      </ScopeCardV2>
      <ScopeCardV2 eyebrow="Trend" title="趨勢">
        <p>以年、月等時間單位觀察脈絡變化。預設分析可使用符文分類，但使用者日後可以自訂自己的關鍵字與分類。</p>
      </ScopeCardV2>
    </div>
    <div className="scope-v2-list">
      {shown.map((row,index)=><ScopeCardV2 key={row.context_key||row.id||JSON.stringify(row)} title={contextTitle(row,(page-1)*PAGE_SIZE+index)}>
        <div className="scope-v2-meta">{row.context_type?<span>{row.context_type}</span>:null}</div>
        {row.summary?<p>{row.summary}</p>:null}
      </ScopeCardV2>)}
    </div>
    {rows.length?<div className="scope-v2-pagination">
      <span>第 {page} / {pages} 頁 · 共 {rows.length} 筆</span>
      <div>
        <button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button>
        <button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button>
      </div>
    </div>:null}
  </FeaturePageV2>;
}
