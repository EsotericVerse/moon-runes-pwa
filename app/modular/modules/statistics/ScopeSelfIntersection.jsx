'use client';
import FieldText from '../../../i18n/FieldText';
import {useUiLocale,useUiSection} from '../../../i18n/ui-locale';
import {useUiText} from '../../../i18n/UiText';
import {translateUiField,registerDefaultSection} from '../../../i18n/ui-copy';
import selfIntersectionZh from '../../../i18n/sections/uiExtra.selfIntersection.zh_tw.js';
registerDefaultSection('uiExtra.selfIntersection',selfIntersectionZh);

import {useMemo,useState} from 'react';
import {useAsyncResource} from '../../../loc/use-async-resource';
import {selectScopeSourceBreakdownRows} from '../../../loc/galaxy-query';
import {assignedSource} from '../../../loc/member-intersection-model.mjs';
import {parseGroupLists} from '../../../loc/group-lists.mjs';
import {availableStatisticChartTypes,chartTypeGroups} from './statistics-time-zoom.mjs';
import StatisticsMultiChart from './StatisticsMultiChart';
import StatisticsChartFrame from './StatisticsChartFrame';
import StatisticsDetails from './StatisticsDetails';
import {ownScopeCategoryCatalog} from '../../../loc/statistics-source-intersection.mjs';

const DAY_MS=86400000;
export const DIMENSION_FILTERS=[
  {value:'all',label:'全部'}, {value:'source',label:'作品來源'},
  {value:'media',label:'多媒體'}, {value:'keyword',label:'關鍵詞'}
];
export const DIMENSIONS=[
  {kind:'source',label:'原始作品來源'},
  {kind:'group',label:'系統分組來源'},
  {kind:'others_subgroup',label:'個人分組來源'},
  {kind:'total',label:'作品總量'},
  {kind:'media_category',label:'音樂／圖片／影片'},
  {kind:'media',label:'多媒體原始類型'},
  {kind:'keyword_group',label:'關鍵詞分組'},
  {kind:'keyword_item',label:'關鍵詞項目'}
];
export const LANE_FAMILIES=[
  {id:'source',label:'原始作品來源',kinds:['source','group','others_subgroup','total']},
  {id:'media',label:'多媒體來源',kinds:['media_category','media']},
  {id:'keyword_group',label:'關鍵詞分組',kinds:['keyword_group']},
  {id:'keyword_item',label:'關鍵詞項目',kinds:['keyword_item']}
];
const kindsForDimension=value=>value==='source'?LANE_FAMILIES[0].kinds
  :value==='media'?LANE_FAMILIES[1].kinds
  :value==='keyword'?[...LANE_FAMILIES[2].kinds,...LANE_FAMILIES[3].kinds]
  :DIMENSIONS.map(item=>item.kind);
const familyForKind=kind=>LANE_FAMILIES.find(item=>item.kinds.includes(kind))?.id||'source';
export function mediaTypeFamily(raw){
  const value=String(raw||'').trim().toLowerCase();
  if(/(?:music|audio|sound|song|suno|mp3|wav|m4a|flac|音樂|歌曲|聲音)/.test(value))return 'music';
  if(/(?:image|photo|picture|pic|jpg|jpeg|png|webp|gif|圖片|相片|照片|影像)/.test(value))return 'image';
  if(/(?:video|movie|film|reel|youtube|mp4|影片|視頻|影視)/.test(value))return 'video';
  return '';
}
const MEDIA_GROUP_NAMES={music:'音樂',image:'圖片',video:'影片'};
const dateOnly=v=>String(v||'').slice(0,10);
function canonicalBucket(day,unit){
  const date=new Date(day+'T00:00:00Z');
  if(Number.isNaN(date.getTime()))return null;
  if(unit==='month'){
    const a=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1));
    const b=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0));
    return {key:a.toISOString().slice(0,7),from:a.toISOString().slice(0,10),to:b.toISOString().slice(0,10)};
  }
  if(unit==='week'){
    const start=new Date(date);
    start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
    const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);
    return {key:start.toISOString().slice(0,10),from:start.toISOString().slice(0,10),to:end.toISOString().slice(0,10)};
  }
  return {key:day,from:day,to:day};
}
export default function ScopeSelfIntersection({scope,range,zoomLevel=0,onZoomLevelChange,sharedCatalog=null}){
  useUiSection('uiExtra.selfIntersection');
  const {locale,copy}=useUiLocale();
  const t=useUiText();
  const l=copy.uiExtra.selfIntersection;
  const [numberOfLanes,setNumberOfLanes]=useState(2);
  const [selected,setSelected]=useState([]);
  const [kindFilter,setKindFilter]=useState('all');
  const [laneFamilies,setLaneFamilies]=useState([]);
  const [chartType,setChartType]=useState('line');
  const [foldBlank,setFoldBlank]=useState(true);
  const start=dateOnly(range?.startDate),end=dateOnly(range?.endDate);
  const valid=Boolean(scope?.id&&scope.galaxy&&scope.galaxyMedia&&start&&end&&start<=end);
  const query=useAsyncResource(valid?['own-scope-source-intersection',scope?.id,start,end]:null,
    ()=>selectScopeSourceBreakdownRows(scope,{startDate:start,endDate:end}));
  const rows=query.data||[];
  const localCatalog=useAsyncResource(valid&&!sharedCatalog?['own-scope-source-catalog',scope?.id]:null,async()=>{
      const {selectRows}=await import('../../../loc/db-query.mjs');
      const [c,a]=await Promise.all([
        selectRows('silver.statistics_source_categories',{columns:'category_code,display_name,enabled',limit:250}),
        selectRows('silver.statistics_source_aliases',{columns:'source_key,category_code',limit:250})
      ]);
      return {categories:c.rows,aliases:a.rows};
  });
  const catalog=sharedCatalog||localCatalog;
  const othersConfig=useAsyncResource({
    queryKey:['scope-others-source-summary',scope?.id],
    enabled:valid,
    queryFn:async()=>{
      const {selectRows}=await import('../../../loc/db-query.mjs');
      const [groups,aliases]=await Promise.all([
        selectRows('silver.statistics_scope_others_groups',{
          columns:'group_code,display_name,enabled,sort_order',
          filters:[{column:'scope_id',operator:'eq',value:scope.id}],
          orders:[{column:'sort_order',ascending:true}],limit:500,source:'primary'
        }),
        selectRows('silver.statistics_scope_others_aliases',{
          columns:'source_key,group_code',
          filters:[{column:'scope_id',operator:'eq',value:scope.id}],
          limit:500,source:'primary'
        })
      ]);
      return {groups:groups.rows||[],aliases:aliases.rows||[]};
    }
  });
  const othersActive=useMemo(()=>new Map((othersConfig.data?.groups||[])
    .filter(row=>row.enabled!==false).map(row=>[row.group_code,row.display_name])),[othersConfig.data]);
  const othersAliases=useMemo(()=>new Map((othersConfig.data?.aliases||[])
    .map(row=>[String(row.source_key||'').trim().toLowerCase(),row.group_code])),[othersConfig.data]);
  const resolveOthers=(source)=>{
    if(assignedSource(source,catalog.data?.aliases||[],catalog.data?.categories||[])!=='others')return '';
    const group=othersAliases.get(String(source||'').trim().toLowerCase())||'';
    return group&&othersActive.has(group)?group:'unclassified';
  };
  // Read the already-stored keyword summary only when this panel is expanded.
  const keywords=useAsyncResource({
    queryKey:['own-scope-keyword-summary',scope?.id,start,end],
    enabled:valid,
    queryFn:async()=>{
      const {selectKeywordAnalysisSummary}=await import('../../../loc/keyword-analysis');
      return selectKeywordAnalysisSummary({scopeId:scope.id,startDate:start,endDate:end});
    }
  });
  const categoryList=useMemo(()=>{
    const known=catalog.data?.categories||[],aliases=catalog.data?.aliases||[];
    // The raw source names (including everything inside Others) are counted
    // live from the data; Admin's groups sit on top of them.
    const basic=ownScopeCategoryCatalog(rows);
    const grouped=new Map();
    for(const row of rows){
      if(row.kind!=='source')continue;
      const id=assignedSource(row.category,aliases,known);
      grouped.set(id,(grouped.get(id)||0)+(Number(row.item_count)||0));
    }
    const groups=[...grouped].filter(([,total])=>total>0).map(([id,total])=>({
      id:'group\u0000'+id,kind:'group',name:known.find(x=>x.category_code===id)?.display_name||id,total
    }));
    const analysis=keywords.data?.statisticsEnabled?keywords.data:null;
    const keywordGroups=(analysis?.groupTotals||[])
      .filter(row=>Number(row.document_count||0)>0)
      .map(row=>({id:'keyword_group'+String.fromCharCode(0)+row.class_id,kind:'keyword_group',
        name:String(row.group||'')+' 群組',total:Number(row.document_count)||0}));
    const keywordItems=(analysis?.runeTotals||[])
      .filter(row=>Number(row.document_count||0)>0)
      .map(row=>({id:'keyword_item'+String.fromCharCode(0)+row.rune_id,kind:'keyword_item',
        name:String(row.label||'')+' · '+row.rune_id,total:Number(row.document_count)||0}));
    const othersCounts=new Map();
    for(const row of rows){
      if(row.kind!=='source')continue;
      const group=resolveOthers(row.category);
      if(group)othersCounts.set(group,(othersCounts.get(group)||0)+(Number(row.item_count)||0));
    }
    const others=[...othersCounts].filter(([,count])=>count>0).map(([id,total])=>({
      id:'others_subgroup'+String.fromCharCode(0)+id,kind:'others_subgroup',
      name:id==='unclassified'?'Others · 未細分':'Others · '+othersActive.get(id),total
    }));
    const mediaTotals=new Map();
    for(const row of rows){
      if(row.kind!=='media')continue;
      const family=mediaTypeFamily(row.category);
      if(family)mediaTotals.set(family,(mediaTotals.get(family)||0)+(Number(row.item_count)||0));
    }
    const mediaGroups=[...mediaTotals].filter(([,total])=>total>0)
      .map(([id,total])=>({id:'media_category'+String.fromCharCode(0)+id,
        kind:'media_category',name:MEDIA_GROUP_NAMES[id],total}));
    const allowed=new Set(kindsForDimension(kindFilter));
    return [...groups,...basic,...others,...mediaGroups,...keywordGroups,...keywordItems]
      .filter(item=>allowed.has(item.kind));
  },[rows,kindFilter,catalog.data,keywords.data,othersConfig.data]);
  const maximumLanes=Math.min(8,categoryList.length);
  const lanes=Math.min(numberOfLanes,Math.max(2,maximumLanes));
  const availableFamilies=LANE_FAMILIES.filter(family=>
    categoryList.some(item=>family.kinds.includes(item.kind)));
  const candidatesForLane=index=>{
    const family=laneFamilies[index];
    if(!family)return categoryList;
    const kinds=LANE_FAMILIES.find(item=>item.id===family)?.kinds||[];
    return categoryList.filter(item=>kinds.includes(item.kind));
  };
  const chosen=Array.from({length:lanes},(_,index)=>{
    const candidates=candidatesForLane(index);
    const id=selected[index];
    if(id&&candidates.some(item=>item.id===id)&&!selected.slice(0,index).includes(id))return id;
    const reserved=new Set(selected.filter((_,position)=>position!==index));
    return candidates.find(item=>!reserved.has(item.id))?.id||'';
  });
  // Do not silently select an unrelated category when a chosen family runs
  // out of available values; the visitor can change that lane's first select.
  const used=new Set();
  const selection=chosen.map((id,index)=>{
    const options=candidatesForLane(index);
    const output=id&&!used.has(id)?id:options.find(item=>!used.has(item.id))?.id||'';
    if(output)used.add(output);
    return output;
  });
  const categories=selection.map(id=>categoryList.find(c=>c.id===id)).filter(Boolean);
  const shownFamilies=selection.map((id,index)=>{
    const explicit=laneFamilies[index];
    return availableFamilies.some(family=>family.id===explicit)
      ?explicit:familyForKind(categoryList.find(item=>item.id===id)?.kind);
  });
  const selectedKeywordItems=categories.some(c=>c.kind==='keyword_item');
  // Item-by-day data are not in the summary RPC. Load saved attributes only
  // when an item is actually selected, without reading or analyzing article bodies.
  const keywordItems=useAsyncResource({
    queryKey:['own-scope-keyword-item-days',scope?.id,start,end],
    enabled:valid&&selectedKeywordItems,
    queryFn:async()=>{
      const {selectAllRows}=await import('../../../loc/db-query.mjs');
      return (await selectAllRows(scope.galaxy,{
        columns:'createtime,group_lists',
        filters:[
          {column:'searchable',operator:'eq',value:true},
          {column:'statistics_able',operator:'eq',value:true},
          {column:'createtime',operator:'gte',value:start+'T00:00:00+08:00'},
          {column:'createtime',operator:'lte',value:end+'T23:59:59.999+08:00'}
        ]
      })).rows;
    }
  });
  const unit=['month','week','day'].includes(range?.bucket)?range.bucket:(Date.parse(end)-Date.parse(start))/DAY_MS>180?'month':(Date.parse(end)-Date.parse(start))/DAY_MS>60?'week':'day';
  const calculated=useMemo(()=>{
    if(!valid||!categories.length)return {chart:[],days:[],totals:[]};
    const counts=new Map(), activeDays=new Map();
    const selectedIds=new Set(categories.map(category=>category.id));
    const add=(day,id,value)=>{
      if(!selectedIds.has(id)||!day||day<start||day>end||value<=0)return;
      const bucket=canonicalBucket(day,unit);
      if(!bucket)return;
      const item=counts.get(bucket.key)||{period:bucket.key,start_date:bucket.from,end_date:bucket.to};
      item[id]=(Number(item[id])||0)+value;
      counts.set(bucket.key,item);
      const active=activeDays.get(day)||new Set();
      active.add(id);
      activeDays.set(day,active);
    };
    for(const row of rows){
      const day=dateOnly(row.day);
      const rawId=String(row.kind)+'\u0000'+String(row.category||'');
      const ids=[rawId];
      if(row.kind==='source'){
        ids.push('group\u0000'+assignedSource(row.category,catalog.data?.aliases||[],catalog.data?.categories||[]));
        const subgroup=resolveOthers(row.category);
        if(subgroup)ids.push('others_subgroup'+String.fromCharCode(0)+subgroup);
      }else if(row.kind==='media'){
        const family=mediaTypeFamily(row.category);
        if(family)ids.push('media_category'+String.fromCharCode(0)+family);
      }
      for(const id of ids)add(day,id,Number(row.item_count)||0);
    }
    // One Class per article. The existing summary already aggregates by day.
    for(const row of keywords.data?.classifications||[]){
      add(dateOnly(row.date),'keyword_group'+String.fromCharCode(0)+row.class_id,Number(row.count)||0);
    }
    if(selectedKeywordItems){
      for(const row of keywordItems.data||[]){
        const items=parseGroupLists(row.group_lists);
        if(!items||typeof items!=='object')continue;
        for(const [id,hits] of Object.entries(items)){
          if(Number(hits)>0)add(dateOnly(row.createtime),'keyword_item'+String.fromCharCode(0)+id,1);
        }
      }
    }
    const chart=[];
    for(let date=new Date(start+'T00:00:00Z'),limit=new Date(end+'T00:00:00Z');date<=limit;){
      const day=date.toISOString().slice(0,10);
      const bucket=canonicalBucket(day,unit);
      const previous=chart.at(-1);
      if(previous?.period!==bucket.key)chart.push({
        period:bucket.key,start_date:bucket.from,end_date:bucket.to,
        ...Object.fromEntries(categories.map(category=>[category.id,Number(counts.get(bucket.key)?.[category.id])||0]))
      });
      date=new Date(bucket.to+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+1);
    }
    return {
      chart,
      days:[...activeDays.values()].filter(day=>categories.every(category=>day.has(category.id))).length,
      totals:categories.map(category=>({
        name:category.name,
        value:chart.reduce((n,bucket)=>n+Number(bucket[category.id]||0),0)
      }))
    };
  },[rows,categories.map(c=>c.id).join(String.fromCharCode(0)),start,end,unit,valid,catalog.data,othersConfig.data,keywords.data,keywordItems.data,selectedKeywordItems]);
  const series=categories.map(c=>({key:c.id,label:c.name}));
  const enough=maximumLanes>=2&&categories.length===lanes;
  const availableCharts=availableStatisticChartTypes({rows:calculated.chart,series,distribution:calculated.totals});
  const shownChartType=availableCharts.some(([id])=>id===chartType)?chartType:(availableCharts[0]?.[0]||'line');
  const chartGroups=chartTypeGroups(availableCharts,['line','stacked','scatter']);

  return <section className="scope-stat-section scope-self-intersection" aria-label={translateUiField(locale,'作品自交互統計')}>
    <h3><FieldText text="作品自交互統計"/></h3>
      {query.isPending||keywords.isPending||othersConfig.isPending?<p className="scope-status">{l.readingSources}</p>:null}
      {query.error||catalog.error?<p className="scope-status scope-error">{String(query.error?.message||catalog.error?.message||l.readFailed)}</p>:null}
      {keywords.error?<p className="scope-status scope-error">關鍵詞分佈載入失敗：{String(keywords.error?.message||keywords.error)}</p>:null}
      {othersConfig.error?<p className="scope-status scope-error">Others 自定義小分類載入失敗：{String(othersConfig.error?.message||othersConfig.error)}</p>:null}
      {!query.isPending&&!catalog.isPending&&!query.error&&!catalog.error?<div className="scope-self-intersection-content">
        <div className="scope-stat-controls">
          <label><span><FieldText text="交互組數"/></span>
            <select className="scope-select" value={lanes} onChange={e=>{setNumberOfLanes(Number(e.target.value));setSelected([])}}>
              {Array.from({length:Math.max(0,maximumLanes-1)},(_,i)=>i+2).map(n=><option key={n} value={n}>{n}{l.groupUnit}</option>)}
              {maximumLanes<2?<option value={2}>可比較項目不足</option>:null}
            </select>
          </label>
          <label><span>比較維度</span>
            <select className="scope-select" aria-label="比較維度" value={kindFilter}
              onChange={e=>{setKindFilter(e.target.value);setSelected([]);setLaneFamilies([])}}>
              {DIMENSION_FILTERS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <div className="scope-self-intersection-comparisons">
          {Array.from({length:lanes},(_,index)=>{
            const family=shownFamilies[index];
            const candidateGroups=DIMENSIONS.filter(dimension=>
              LANE_FAMILIES.find(entry=>entry.id===family)?.kinds.includes(dimension.kind));
            return <div className="scope-self-intersection-lane" key={index}>
              <strong>{l.comparisonItem} {index+1}</strong>
              <div className="scope-self-intersection-lane-selectors">
                <label><span>來源類型</span>
                  <select className="scope-select" aria-label={l.comparisonItem+' '+(index+1)+' 來源類型'}
                    value={family} onChange={event=>{
                      const nextFamily=event.target.value;
                      setLaneFamilies(previous=>{
                        const next=[...previous];next[index]=nextFamily;return next;
                      });
                      const used=new Set(selection.filter((_,position)=>position!==index));
                      const available=categoryList.filter(item=>
                        LANE_FAMILIES.find(entry=>entry.id===nextFamily)?.kinds.includes(item.kind));
                      setSelected(previous=>{
                        const next=[...selection];
                        next[index]=available.find(item=>!used.has(item.id))?.id||'';
                        return next;
                      });
                    }}>
                    {availableFamilies.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </label>
                <label><span>比較內容</span>
                  <select className="scope-select" aria-label={l.comparisonItem+' '+(index+1)+' 比較內容'}
                    value={selection[index]||''} onChange={event=>{
                      setSelected(previous=>{
                        const next=[...selection];next[index]=event.target.value;return next;
                      });
                    }}>
                    {!selection[index]?<option value="">請選擇比較內容</option>:null}
                    {candidateGroups.map(dimension=>{
                      const options=categoryList.filter(item=>item.kind===dimension.kind&&
                        !selection.some((chosen,position)=>position!==index&&chosen===item.id));
                      return options.length?<optgroup key={dimension.kind} label={dimension.label}>
                        {options.map(item=><option key={item.id} value={item.id}>
                          {item.name}（{item.total.toLocaleString()}）
                        </option>)}
                      </optgroup>:null;
                    })}
                  </select>
                </label>
              </div>
            </div>;
          })}
        </div>
        <div className="scope-stat-controls">
          <label><span><FieldText text="圖表"/></span>
            <select className="scope-select" value={chartType} onChange={e=>setChartType(e.target.value)}>
              {chartGroups.primary.length?<optgroup label={t('uiExtra.statisticsView.chartPrimary')}>
  {chartGroups.primary.map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}
</optgroup>:null}
{chartGroups.advanced.length?<optgroup label={t('uiExtra.statisticsView.chartAdvanced')}>
  {chartGroups.advanced.map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}
</optgroup>:null}{!availableCharts.length?<option value="line"><FieldText text="尚無可用圖形"/></option>:null}
            </select>
          </label>
          <label className="scope-setting-toggle"><input type="checkbox" checked={foldBlank} onChange={e=>setFoldBlank(e.target.checked)}/> {l.foldEmptyTime}</label>
        </div>
        {selectedKeywordItems&&keywordItems.isPending?<p className="scope-status" role="status">正在讀取關鍵詞項目的每日統計…</p>:null}
        {selectedKeywordItems&&keywordItems.error?<p role="alert" className="scope-status scope-error">{String(keywordItems.error?.message||keywordItems.error)}</p>:null}
        {enough&&(!selectedKeywordItems||keywordItems.isSuccess)?<div>
          <StatisticsChartFrame level={zoomLevel} onChange={onZoomLevelChange} range={range} idPrefix="scope-self-stat">
            <StatisticsMultiChart type={shownChartType} rows={calculated.chart} series={series}
              distribution={calculated.totals} foldBlank={foldBlank} height={410}/>
          </StatisticsChartFrame>
          <p className="scope-status">交互以「同日活躍」計算；關鍵詞群組與項目統一使用作品篇數，同日出現不代表同篇文章同時命中。</p>
          <StatisticsDetails>{()=><>
          <div className="scope-ranking">
            <div><strong>{l.activeDays}</strong><span>{calculated.days.toLocaleString(locale)}{l.dayUnit}</span></div>
            {calculated.totals.map(item=><div key={item.name}><strong>{item.name}</strong><span>{item.value.toLocaleString(locale)}{l.recordUnit}</span></div>)}
          </div>
          </>}</StatisticsDetails>
        </div>:!enough?<p className="scope-status">{l.notEnoughSources.replace('{count}',lanes)}</p>:null}
      </div>:null}
  </section>;
}
