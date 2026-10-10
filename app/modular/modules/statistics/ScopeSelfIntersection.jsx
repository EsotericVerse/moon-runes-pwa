'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectScopeSourceBreakdownRows} from '../../../loc/galaxy-query';
import StatisticsMultiChart,{STAT_VISUAL_TYPES} from './StatisticsMultiChart';

const DAY_MS=86400000;
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
function ownSourceBucket(label=''){
  const text=String(label||'').toLowerCase();
  if(text.includes('facebook')||text==='fb')return 'Facebook';
  if(text.includes('threads'))return 'Threads';
  if(text.includes('instagram')||text.includes('reels')||text==='ig')return 'IG';
  return 'Others';
}
function availableCategories(rows=[],onlyOther=false){
  const count=new Map();
  for(const row of rows){
    if(onlyOther&&ownSourceBucket(row.category)!=='Others')continue;
    const id=String(row.kind)+'\u0000'+String(row.category||'');
    count.set(id,(count.get(id)||0)+(Number(row.item_count)||0));
  }
  return [...count.entries()].map(([id,total])=>{
    const [kind,raw]=id.split('\u0000');
    const name=raw||'未指定來源';
    return {id,name:(kind==='media'?'媒體':'文字')+' · '+name,kind,raw,total};
  }).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
}

export default function ScopeSelfIntersection({scope,range}){
  const [numberOfLanes,setNumberOfLanes]=useState(2);
  const [selected,setSelected]=useState([]);
  const [onlyOthers,setOnlyOthers]=useState(false);
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
  const categoryList=useMemo(()=>availableCategories(rows,onlyOthers),[rows,onlyOthers]);
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
      const id=String(row.kind)+'\u0000'+String(row.category||'');
      if(!day||day<start||day>end||!categories.some(category=>category.id===id))continue;
      const bucket=canonicalBucket(day,unit);
      if(!bucket)continue;
      const key=bucket.key;
      const item=counts.get(key)||{period:key,start_date:bucket.from,end_date:bucket.to};
      item[id]=(Number(item[id])||0)+(Number(row.item_count)||0);
      counts.set(key,item);
      const daily=activeDays.get(day)||new Set();
      if(Number(row.item_count)>0)daily.add(id);
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
  },[rows,categories.map(c=>c.id).join('\u0000'),start,end,unit,valid]);
  const series=categories.map(c=>({key:c.id,label:c.name}));
  const enough=categories.length===numberOfLanes;

  return <section className="scope-stat-section scope-self-intersection" aria-label="本 Scope 作品自交互統計">
    <h3>作品自交互統計</h3>
      {query.isPending?<p className="scope-status">讀取本 Scope 的原始來源分類…</p>:null}
      {query.error?<p className="scope-status scope-error">來源分類讀取失敗：{String(query.error.message||query.error)}</p>:null}
      {!query.isPending&&!query.error?<div className="scope-self-intersection-content">
        <div className="scope-stat-controls">
          <label><span>交互組數</span>
            <select className="scope-select" value={numberOfLanes} onChange={e=>{setNumberOfLanes(Number(e.target.value));setSelected([])}}>
              {[2,3,4].map(n=><option key={n} value={n}>{n} 組</option>)}
            </select>
          </label>
          <label><span>來源範圍</span>
            <select className="scope-select" value={onlyOthers?'others':'all'} onChange={e=>{setOnlyOthers(e.target.value==='others');setSelected([])}}>
              <option value="all">所有來源細項</option>
              <option value="others">Others 原始來源細項</option>
            </select>
          </label>
          <label><span>圖表</span>
            <select className="scope-select" value={chartType} onChange={e=>setChartType(e.target.value)}>
              {STAT_VISUAL_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="scope-setting-toggle"><input type="checkbox" checked={foldBlank} onChange={e=>setFoldBlank(e.target.checked)}/> 折疊空白時間區間</label>
        </div>
        <div className="scope-stat-controls">
          {Array.from({length:numberOfLanes},(_,index)=><label key={index}>
            <span>來源 {index+1}</span>
            <select className="scope-select" value={selection[index]||''} onChange={e=>{
              setSelected(prev=>{
                const next=Array.from({length:numberOfLanes},(_,i)=>selection[i]||'');
                next[index]=e.target.value;
                return next;
              });
            }}>
              {!selection[index]?<option value="">沒有可選的來源</option>:null}
              {categoryList.map(category=><option key={category.id} value={category.id} disabled={selection.some((s,i)=>s===category.id&&i!==index)}>
                {category.name}（{category.total.toLocaleString()}）
              </option>)}
            </select>
          </label>)}
        </div>
        {enough?<div>
          <div className="scope-ranking">
            <div><strong>{numberOfLanes} 組來源同日活躍</strong><span>{calculated.days.toLocaleString()} 天</span></div>
            {calculated.totals.map(item=><div key={item.name}><strong>{item.name}</strong><span>{item.value.toLocaleString()} 筆</span></div>)}
          </div>
          <StatisticsMultiChart type={chartType} rows={calculated.chart} series={series} distribution={calculated.totals} foldBlank={foldBlank} height={410}/>
        </div>:<p className="scope-status">目前細分來源不足 {numberOfLanes} 組；請更換範圍或減少組數。</p>}
      </div>:null}
  </section>;
}
