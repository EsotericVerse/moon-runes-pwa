'use client';

import {useEffect,useState} from 'react';
import {selectNeonRows} from '../../loc/neon-repository';

import {selectScopeContextRows} from '../../loc/neon-context-client';
import {buildRuneGraph} from '../../../js/rune-graph-core.js';
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
  const value=row?.title||row?.display_title||row?.label||row?.name||row?.subject||row?.period||row?.era_name||row?.context_name||row?.context_key;
  if(value)return String(value);
  if(row?.source||row?.source_name)return String(row.source||row.source_name);
  return `脈絡項目 ${index+1}`;
}

function derivedFromEvolution(history){
  return (history?.semantic_history_cases||[]).filter(item=>item?.title&&item.title!=='混沌三兄弟').map(item=>{
    const parts=String(item.title).split('→').map(value=>value.trim());
    const target=parts.length>1?parts.at(-1):'';
    const resolvedRune=/^[靈魂彩憶界域鏡核向斷封鍊啟分悟誤生老病死心愛語韻樹花葉草根種實枝金玉晶地石鑽礦塵光暗水火風土雷氣日月星辰明時空因福禍無夢幻緣虛果玄命]$/.test(target)?target:null;
    return {term:parts[0]||item.title,relation:item.kind||'derived',resolved_rune:resolvedRune,status:item.kind==='balanced_ambiguity'?'ambiguous':String(item.kind||'').includes('out_of_domain')?'special':'confirmed',note:item.note||''};
  });
}

function runeGraphRows(graph){
  const labels=new Map((graph?.nodes||[]).map(node=>[node.id,node.label||node.id]));
  return (graph?.edges||[]).map((edge,index)=>({
    context_key:`rune-edge-${index}-${edge.source}-${edge.target}`,
    context_type:'符文關聯',
    title:`${labels.get(edge.source)||edge.source} → ${labels.get(edge.target)||edge.target}`,
    summary:`${edge.type}${edge.evidence?`｜${edge.evidence}`:''}`,
    source:labels.get(edge.source)||edge.source,
    target:labels.get(edge.target)||edge.target,
    relation_type:edge.type
  }));
}

function runeEvolutionRows(history){
  const rows=[];
  const versions=history?.rc_version_sequence||[];
  if(versions.length){
    const labels=versions.map(item=>`${item.label||item.version} ${item.rune_count||'—'}`).join(' → ');
    rows.push({context_key:'rune-evolution-overview',context_type:'符文演化總覽',title:labels,summary:'從前置原型到現行 66 張；版本節點與歷史變化如下。',source:versions[0].label||versions[0].version,target:versions.at(-1).version,relation_type:'演化總覽'});
  }
  for(const [index,item] of versions.entries()){
    const version=item.version||`version-${index}`;
    rows.push({context_key:`rune-version-${version}`,context_type:'符文版本',title:`${item.label||version} · ${item.rune_count||'—'} 張`,summary:`${item.milestone||''}${item.title?`｜${item.title}`:''}`,source:'月之符文',target:version,relation_type:item.status==='rc'?'候選版本':item.status==='prototype'?'前置原型':'正式版本',period:item.milestone||''});
  }
  for(const [index,item] of (history?.rc_change_events||[]).entries()){
    rows.push({context_key:`rune-change-${item.order||index}`,context_type:'符文版本變更',title:`${item.from||'前一版本'} → ${item.to||'下一版本'}`,summary:`${item.date||''}｜${item.change||''}${item.meaning?`｜${item.meaning}`:''}`,source:item.from||'符文系統',target:item.to||'符文系統',relation_type:'版本變更',period:item.date||''});
  }
  for(const [index,item] of (history?.historical_transformations||[]).entries()){
    const target=Array.isArray(item.to)?item.to.join('、'):item.to;
    if(!item.from||!target)continue;
    rows.push({context_key:`rune-transformation-${index}-${item.from}`,context_type:'符文歷史變化',title:`${item.from} → ${target}`,summary:`${item.kind||'歷史變化'}｜${item.note||''}`,source:item.from,target,relation_type:item.kind||'歷史變化'});
  }
  for(const [index,item] of (history?.cross_axis_relations||[]).entries()){
    if(!item.source||!item.target)continue;
    rows.push({context_key:`rune-cross-axis-${item.relation_id||index}`,context_type:'作者與符文交會',title:`${item.source} → ${item.target}`,summary:`${item.date||''}｜${item.relation||'交會'}｜${item.evidence||''}`,source:item.source,target:item.target,relation_type:item.relation||'交會',period:item.date||''});
  }
  return rows;
}

function locStructureRows(rows,runeGraph,runeHistory){
  const output=[
    {context_key:'structure-author-loc',context_type:'Scope 關聯',title:'王政德／lo3rwang → 月典',summary:'作者是月典的建立者與治理者。',source:'王政德／lo3rwang',target:'月典',relation_type:'建立與治理'},
    {context_key:'structure-loc-runes',context_type:'Scope 關聯',title:'月典 → 月之符文',summary:'月之符文是月典中的符號式語言。',source:'月典',target:'月之符文',relation_type:'包含語言系統'},
    {context_key:'structure-author-runes',context_type:'Scope 關聯',title:'王政德／lo3rwang → 月之符文',summary:'作者建立並治理月之符文。',source:'王政德／lo3rwang',target:'月之符文',relation_type:'建立與治理'}
  ];
  const seen=new Set(output.map(row=>row.context_key));
  const add=(key,source,target,relation,summary)=>{
    const contextKey=`structure-${key}`;
    if(seen.has(contextKey)||!target)return;
    seen.add(contextKey);
    output.push({context_key:contextKey,context_type:'結構關聯',title:`${source} → ${target}`,summary,source,target,relation_type:relation});
  };
  for(const row of rows||[]){
    const target=row.title||row.context_key;
    if(!target)continue;
    add(`loc-${row.context_key}`,'月典',target,'收錄於月典',`此資料屬於月典的全域脈絡資料。`);
    if(['文字作品','音樂作品','媒體作品'].includes(row.context_type)){
      add(`author-${row.context_key}`,'王政德／lo3rwang',target,'作者作品',`這是作者本人創作或發布的${row.context_type}。`);
    }
    if(row.period) add(`period-${row.context_key}`,target,row.period,'所屬時期',`依目前已定案的時期資料歸入 ${row.period}。`);
    if(row.context_type==='每日符文') add(`daily-${row.context_key}`,'月之符文',target,'每日紀錄',`這是月之符文的每日紀錄。`);
  }
  const runeLabels=new Map((runeGraph?.nodes||[]).map(node=>[node.id,node.label||node.id]));
  for(const edge of runeGraph?.edges||[]){
    const source=runeLabels.get(edge.source)||edge.source;
    if(edge.type==='belongs_to_group'&&String(edge.source||'').startsWith('rune:'))add(`rune-${edge.source}`,'月之符文',source,'符文系統成員','這枚符文屬於月之符文的現行 66 枚符文系統。');
  }
  for(const version of runeHistory?.rc_version_sequence||[]){
    add(`version-${version.version}`,'月之符文',version.version,'版本演進',`${version.version} 是月之符文 RC 演進中的 ${version.rune_count} 張版本節點。`);
  }
  return output;
}

function locContextRows(values,musicSegments){
  const [eras,events,scenarioEvents,writing,media,knowledge,governance,daily,relationships]=values;
  const rows=[];
  const add=(items,mapper)=>{
    for(const [index,item] of (items||[]).entries()){
      const mapped=mapper(item,index);
      const mappedRows=Array.isArray(mapped)?mapped:[mapped];
      for(const row of mappedRows)if(row?.context_key)rows.push(row);
    }
  };
  add(eras?.eras,(item,index)=>({context_key:item.era_id||`era-${index}`,context_type:'時期',title:item.display_label||item.name||item.period,summary:item.description||'',period:item.period}));
  add(events?.events,(item,index)=>({context_key:item.id||`event-${index}`,context_type:'事件',title:item.title||item.name||'事件',summary:item.description||item.summary||'',period:item.era_id||item.era||''}));
  add(scenarioEvents?.records,(item,index)=>({context_key:item.event_id||`scenario-${index}`,context_type:'情境事件',title:item.title||'情境事件',summary:item.description||'',period:item.era_id||item.era||''}));
  add(writing?.works,(item,index)=>({context_key:item.work_id||`writing-${index}`,context_type:'文字作品',title:item.title||item.work_id,summary:item.summary||'',period:item.period_name||item.period||item.era_id||''}));
  add(media?.items,(item,index)=>({context_key:item.media_id||`media-${index}`,context_type:'媒體作品',title:item.title||item.media_id,summary:item.media_type||item.platform||'',period:item.period_name||item.period||item.era_id||''}));
  add(knowledge?.assets,(item,index)=>({context_key:item.asset_id||`knowledge-${index}`,context_type:'知識資產',title:item.title||item.asset_id,summary:item.public_summary||item.notes||'',period:item.era_id||''}));
  add(governance?.fragments,(item,index)=>({context_key:item.fragment_id||`governance-${index}`,context_type:'治理資料',title:item.topic||item.fragment_id,summary:item.interpretation||item.statement||'',period:item.era_id||''}));
  add(daily?.daily_draws,(item,index)=>({context_key:item.id||`daily-${index}`,context_type:'每日符文',title:`${item.date||'未定日期'}｜${item.rune||item.rune_id||'符文'}`,summary:item.interpretation||item.note||'',period:item.era_id||''}));
  const music=(musicSegments||[]).flatMap(segment=>Array.isArray(segment?.data?.works)?segment.data.works:[]);
  add(music,(item,index)=>({context_key:item.work_id||`music-${index}`,context_type:'音樂作品',title:item.title||item.work_id,summary:item.summary||item.style||'',period:item.era_name||item.period||item.era||''}));
  add(relationships?.relationships,(item,index)=>{
    const source=item.source?.title||item.source?.work_ref||'來源';
    return (item.targets||[]).map((target,targetIndex)=>({context_key:`${item.relationship_id||`relation-${index}`}-${targetIndex}`,context_type:'跨資料關聯',title:`${source} → ${target.title||target.work_ref||'目標'}`,summary:item.relation_summary||target.relation_label||'',period:''}));
  });
  const seen=new Set();
  return rows.filter(row=>{if(seen.has(row.context_key))return false;seen.add(row.context_key);return true;});
}

async function basicScopeContextRows(scopeId){
  if(scopeId==='runes'){
    const {rows}=await selectNeonRows('silver.lrunes_runes',{columns:'rune_number,rune_name,canonical_payload',limit:100});
    const runes=rows.map(row=>({編號:Number(row.rune_number),名稱:row.rune_name,...(row.canonical_payload&&typeof row.canonical_payload==='object'?row.canonical_payload:{})}));
    const graph=buildRuneGraph(runes.filter(row=>row.編號>=1&&row.編號<=66),[],{});
    return runeGraphRows(graph);
  }
  if(scopeId==='lo3rwang'){
    const [works,songs]=await Promise.all([
      selectNeonRows('silver.works',{filters:[{column:'scope',operator:'eq',value:'lo3rwang'}],limit:5000}),
      selectNeonRows('silver.song_versions',{limit:5000})
    ]);
    return [
      ...works.rows.map((row,index)=>({context_key:row.work_id||`work-${index}`,context_type:'作品',title:row.title||row.work_id||'作品',summary:row.summary||row.ai_summary||'',period:row.period_code||row.era_code||row.era_name||'',source:row.content_origin||row.scope||'作者作品'})),
      ...songs.rows.map((row,index)=>({context_key:row.song_id||`song-${index}`,context_type:'音樂作品',title:row.title||row.song_id||'歌曲',summary:row.playlist||row.style_prompt||'',period:'',source:'音樂'}))
    ];
  }
  return [];
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
    selectScopeContextRows(scopeId)
      .then(value=>{if(live){setRows(value);setError('');}})
      .catch(error=>live&&setError(String(error?.message||error)))
      .finally(()=>live&&setLoading(false));
    return()=>{live=false};
  },[view,scopeId]);

  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  const shown=rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);

  const legacy=LEGACY_SECTIONS[section]||LEGACY_SECTIONS.graph;
  return <FeaturePageV2 featureId="context" subtitle="人事物的分析關聯表達">
    {section?<ScopeCardV2 eyebrow={legacy.eyebrow} title={legacy.title}><p>{legacy.text}</p></ScopeCardV2>:null}
    <ScopeCardV2 eyebrow={CONTEXT_COPY.eyebrow} title={CONTEXT_COPY.title}>
      {CONTEXT_COPY.paragraphs.map(text=><p key={text}>{text}</p>)}
    </ScopeCardV2>
    {!view?<p className="scope-v2-status">此 Scope 尚未啟用脈絡功能。</p>:null}
    {error?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
    {loading?<p className="scope-v2-status">載入中…</p>:null}
    <div className="scope-v2-list">
      {shown.map((row,index)=><ScopeCardV2 key={row.context_key||row.id||JSON.stringify(row)} title={contextTitle(row,(page-1)*PAGE_SIZE+index)}>
        <div className="scope-v2-meta">{row.context_type?<span>{row.context_type}</span>:null}</div>
        {row.source&&row.target?<p><strong>{row.source}</strong> → <strong>{row.target}</strong></p>:null}
        {row.summary?<p>{row.summary}</p>:null}
      </ScopeCardV2>)}
    </div>
    {rows.length?<div className="scope-v2-pagination">
      <span>第 {page} / {pages} 頁 · 共 {rows.length} 項關聯資料</span>
      <div>
        <button type="button" disabled={page<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>上一頁</button>
        <button type="button" disabled={page>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>下一頁</button>
      </div>
    </div>:null}
  </FeaturePageV2>;
}
