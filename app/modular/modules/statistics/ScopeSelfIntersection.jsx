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
import {OWN_STAT_DIMENSIONS,ownScopeCategoryCatalog} from '../../../loc/statistics-source-intersection.mjs';

const DAY_MS=86400000;
const DIMENSIONS=[{kind:'group',label:'群組來源分類'},
  {kind:'others_subgroup',label:'Others 自定義小分類'},...OWN_STAT_DIMENSIONS,
  {kind:'keyword_group',label:'關鍵詞組'},
  {kind:'keyword_item',label:'關鍵詞項目'}];
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
    return [...groups,...basic,...others,...keywordGroups,...keywordItems]
      .filter(item=>kindFilter==='all'||item.kind===kindFilter);
  },[rows,kindFilter,catalog.data,keywords.data,othersConfig.data]);
  const maximumLanes=Math.min(8,categoryList.length);
  const lanes=Math.min(numberOfLanes,Math.max(2,maximumLanes));
  const chosen=Array.from({length:lanes},(_,i)=>{
    const id=selected[i];
    if(id&&categoryList.some(c=>c.id===id)&&!selected.slice(0,i).includes(id))return id;
    return categoryList.find(c=>!selected.slice(0,i).includes(c.id)&&!selected.slice(0,i).includes(c.id)&&!selected.slice(i+1,lanes).includes(c.id))?.id||categoryList[i]?.id||'';
  });
  // When a category disappears after filtering, re-base to distinct available sources.
  const used=new Set();
  const selection=chosen.map((id,i)=>{
    let output=id;
    if(used.has(output))output=categoryList.find(c=>!used.has(c.id))?.id||'';
    if(output)used.add(output);
    return output;
  });
  const categories=selection.map(id=>categoryList.find(c=>c.id===id)).filter(Boolean);
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
          <label><span>{l.comparisonDimensions}</span>
            <select className="scope-select" value={kindFilter} onChange={e=>{setKindFilter(e.target.value);setSelected([])}}>
              <option value="all">{l.allCategories}</option>
              {DIMENSIONS.map(item=><option key={item.kind} value={item.kind}>{translateUiField(locale,item.label)}</option>)}
            </select>
          </label>
        </div>
        <div className="scope-stat-controls">
          {Array.from({length:lanes},(_,index)=><label key={index}>
            <span>{l.comparisonItem} {index+1}</span>
            <select className="scope-select" value={selection[index]||''} onChange={e=>{
              setSelected(prev=>{
                const next=Array.from({length:lanes},(_,i)=>selection[i]||'');
                next[index]=e.target.value;
                return next;
              });
            }}>
              {!selection[index]?<option value="">{l.noSelectableSource}</option>:null}
              {DIMENSIONS.map(dimension=>{
                const options=categoryList.filter(category=>category.kind===dimension.kind&&
                  !selection.some((chosen,i)=>i!==index&&chosen===category.id));
                return options.length?<optgroup key={dimension.kind} label={translateUiField(locale,dimension.label)}>
                  {options.map(category=><option key={category.id} value={category.id}>
                    {category.name}（{category.total.toLocaleString()}）
                  </option>)}
                </optgroup>:null;
              })}
            </select>
          </label>)}
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
