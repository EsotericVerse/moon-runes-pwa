'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectScopeSourceBreakdownRows} from '../../../loc/galaxy-query';
import {selectRows} from '../../../loc/db-query.mjs';
import {assignedSource} from '../../../loc/member-intersection-model.mjs';
import StatisticsMultiChart,{availableStatisticChartTypes} from './StatisticsMultiChart';
import {OWN_STAT_DIMENSIONS,ownScopeCategoryCatalog} from '../../../loc/statistics-source-intersection.mjs';

const DAY_MS=86400000;
const DIMENSIONS=[{kind:'group',label:'總來源'},...OWN_STAT_DIMENSIONS];
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
export default function ScopeSelfIntersection({scope,range}){
  const [numberOfLanes,setNumberOfLanes]=useState(2);
  const [selected,setSelected]=useState([]);
  const [kindFilter,setKindFilter]=useState('all');
  const [chartType,setChartType]=useState('line');
  const [foldBlank,setFoldBlank]=useState(true);
  const start=dateOnly(range?.startDate),end=dateOnly(range?.endDate);
  const valid=Boolean(scope?.id&&scope.galaxy&&scope.galaxyMedia&&start&&end&&start<=end);
  const query=useQuery({
    queryKey:['own-scope-source-intersection',scope?.id,start,end],
    queryFn:()=>selectScopeSourceBreakdownRows(scope,{startDate:start,endDate:end}),
    enabled:valid,
    staleTime:5*60_000
  });
  const rows=query.data||[];
  const catalog=useQuery({
    queryKey:['own-scope-source-catalog',scope?.id],
    enabled:valid,
    queryFn:async()=>{
      const [c,a,o]=await Promise.all([
        selectRows('silver.statistics_source_categories',{columns:'category_code,display_name,enabled',limit:250}),
        selectRows('silver.statistics_source_aliases',{columns:'source_key,category_code',limit:250}),
        selectRows('silver.scope_other_sources',{columns:'scope_id,source_key,display_name,enabled',
          filters:[{column:'scope_id',operator:'eq',value:scope.id}],limit:250})
      ]);
      return {categories:c.rows,aliases:a.rows,others:o.rows};
    },
    staleTime:5*60_000
  });
  const categoryList=useMemo(()=>{
    const known=catalog.data?.categories||[],aliases=catalog.data?.aliases||[];
    const others=new Map((catalog.data?.others||[]).filter(x=>x.enabled).map(x=>[x.source_key,x.display_name]));
    const basic=ownScopeCategoryCatalog(rows).filter(item=>
      item.kind!=='source'||assignedSource(item.raw,aliases,known)!=='others'||others.has(item.raw.toLowerCase())
    ).map(item=>item.kind==='source'&&others.has(item.raw.toLowerCase())
      ?{...item,name:others.get(item.raw.toLowerCase())}:item);
    const grouped=new Map();
    for(const row of rows){
      if(row.kind!=='source')continue;
      const id=assignedSource(row.category,aliases,known);
      grouped.set(id,(grouped.get(id)||0)+(Number(row.item_count)||0));
    }
    const groups=[...grouped].filter(([,total])=>total>0).map(([id,total])=>({
      id:'group\u0000'+id,kind:'group',name:known.find(x=>x.category_code===id)?.display_name||id,total
    }));
    return [...groups,...basic].filter(item=>kindFilter==='all'||item.kind===kindFilter);
  },[rows,kindFilter,catalog.data]);
  const chosen=Array.from({length:numberOfLanes},(_,i)=>{
    const id=selected[i];
    if(id&&categoryList.some(c=>c.id===id)&&!selected.slice(0,i).includes(id))return id;
    return categoryList.find(c=>!selected.slice(0,i).includes(c.id)&&!selected.slice(0,i).includes(c.id)&&!selected.slice(i+1,numberOfLanes).includes(c.id))?.id||categoryList[i]?.id||'';
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
  const unit=(Date.parse(end)-Date.parse(start))/DAY_MS>180?'month':(Date.parse(end)-Date.parse(start))/DAY_MS>60?'week':'day';
  const calculated=useMemo(()=>{
    if(!valid||!categories.length)return {chart:[],days:[],totals:[]};
    const counts=new Map(), activeDays=new Map();
    for(const row of rows){
      const day=dateOnly(row.day);
      const rawId=String(row.kind)+'\u0000'+String(row.category||'');
      const ids=[rawId];
      if(row.kind==='source')ids.push('group\u0000'+assignedSource(row.category,catalog.data?.aliases||[],catalog.data?.categories||[]));
      if(!day||day<start||day>end)continue;
      const bucket=canonicalBucket(day,unit);
      if(!bucket)continue;
      const key=bucket.key;
      const item=counts.get(key)||{period:key,start_date:bucket.from,end_date:bucket.to};
      const daily=activeDays.get(day)||new Set();
      for(const id of ids){
        if(!categories.some(category=>category.id===id))continue;
        item[id]=(Number(item[id])||0)+(Number(row.item_count)||0);
        if(Number(row.item_count)>0)daily.add(id);
      }
      counts.set(key,item);
      activeDays.set(day,daily);
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
  },[rows,categories.map(c=>c.id).join('\u0000'),start,end,unit,valid,catalog.data]);
  const series=categories.map(c=>({key:c.id,label:c.name}));
  const enough=categories.length===numberOfLanes;
  const availableCharts=availableStatisticChartTypes({rows:calculated.chart,series,distribution:calculated.totals});
  const shownChartType=availableCharts.some(([id])=>id===chartType)?chartType:(availableCharts[0]?.[0]||'line');

  return <section className="scope-stat-section scope-self-intersection" aria-label="作品自交互統計">
    <h3>作品自交互統計</h3>
      {query.isPending?<p className="scope-status">讀取來源…</p>:null}
      {query.error||catalog.error?<p className="scope-status scope-error">{String(query.error?.message||catalog.error?.message||'讀取失敗')}</p>:null}
      {!query.isPending&&!catalog.isPending&&!query.error&&!catalog.error?<div className="scope-self-intersection-content">
        <div className="scope-stat-controls">
          <label><span>交互組數</span>
            <select className="scope-select" value={numberOfLanes} onChange={e=>{setNumberOfLanes(Number(e.target.value));setSelected([])}}>
              {[2,3,4].map(n=><option key={n} value={n}>{n} 組</option>)}
            </select>
          </label>
          <label><span>比較維度</span>
            <select className="scope-select" value={kindFilter} onChange={e=>{setKindFilter(e.target.value);setSelected([])}}>
              <option value="all">全部分類</option>
              {DIMENSIONS.map(item=><option key={item.kind} value={item.kind}>{item.label}</option>)}
            </select>
          </label>
          <label><span>圖表</span>
            <select className="scope-select" value={chartType} onChange={e=>setChartType(e.target.value)}>
              {availableCharts.length?availableCharts.map(([value,label])=><option key={value} value={value}>{label}</option>):<option value="line">尚無可用圖形</option>}
            </select>
          </label>
          <label className="scope-setting-toggle"><input type="checkbox" checked={foldBlank} onChange={e=>setFoldBlank(e.target.checked)}/> 折疊空白時間區間</label>
        </div>
        <div className="scope-stat-controls">
          {Array.from({length:numberOfLanes},(_,index)=><label key={index}>
            <span>比較項目 {index+1}</span>
            <select className="scope-select" value={selection[index]||''} onChange={e=>{
              setSelected(prev=>{
                const next=Array.from({length:numberOfLanes},(_,i)=>selection[i]||'');
                next[index]=e.target.value;
                return next;
              });
            }}>
              {!selection[index]?<option value="">沒有可選的來源</option>:null}
              {DIMENSIONS.map(dimension=>{
                const options=categoryList.filter(category=>category.kind===dimension.kind&&
                  !selection.some((chosen,i)=>i!==index&&chosen===category.id));
                return options.length?<optgroup key={dimension.kind} label={dimension.label}>
                  {options.map(category=><option key={category.id} value={category.id}>
                    {category.name}（{category.total.toLocaleString()}）
                  </option>)}
                </optgroup>:null;
              })}
            </select>
          </label>)}
        </div>
        {enough?<div>
          <div className="scope-ranking">
            <div><strong>共同活躍日</strong><span>{calculated.days.toLocaleString()} 天</span></div>
            {calculated.totals.map(item=><div key={item.name}><strong>{item.name}</strong><span>{item.value.toLocaleString()} 筆</span></div>)}
          </div>
          <StatisticsMultiChart type={shownChartType} rows={calculated.chart} series={series} distribution={calculated.totals} foldBlank={foldBlank} height={410}/>
        </div>:<p className="scope-status">目前細分來源不足 {numberOfLanes} 組；請更換範圍或減少組數。</p>}
      </div>:null}
  </section>;
}
