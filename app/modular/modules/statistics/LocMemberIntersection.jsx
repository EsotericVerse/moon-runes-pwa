'use client';

import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectRows} from '../../../loc/db-query.mjs';
import {selectScopeRegistry} from '../../../loc/scope-data';
import {selectScopeSourceBreakdownRows} from '../../../loc/galaxy-query';
import {selectDailyRuneRange} from '../../../loc/daily-runes';
import {normalizeDailyDraws} from '../../../lrunes/daily-analytics-model.mjs';
import {realMoonPhase} from '../../../loc/model/moon-phase';
import {availableMemberMeasures,calculateMemberCross} from '../../../loc/member-intersection-model.mjs';
import StatisticsMultiChart,{availableStatisticChartTypes} from './StatisticsMultiChart';

async function readCatalog(table,columns){
  return (await selectRows(table,{columns,limit:250,offset:0})).rows;
}
const DEFAULT_LANE_COUNT=2;
export default function LocMemberIntersection({scopes=[],startDate='',endDate='',timeStandard='1y'}){
  const [laneCount,setLaneCount]=useState(DEFAULT_LANE_COUNT);
  const [choices,setChoices]=useState([]);
  const [graph,setGraph]=useState('line');
  const catalog=useQuery({
    queryKey:['loc-source-categories'],
    queryFn:async()=>{
      const [categories,aliases,people]=await Promise.all([
        readCatalog('silver.statistics_source_categories','category_code,display_name,enabled,sort_order'),
        readCatalog('silver.statistics_source_aliases','source_key,category_code'),
        selectScopeRegistry({scopeKind:'scope'})
      ]);
      return {categories,aliases,people};
    },
    staleTime:5*60_000
  });
  const names=useMemo(()=>new Map((catalog.data?.people||[]).map(row=>[row.scope_id,row.display_name||row.scope_id])),[catalog.data?.people]);
  const available=scopes.map(scope=>({id:scope.id,label:names.get(scope.id)||scope.id,scope}));
  const lanes=Array.from({length:laneCount},(_,index)=>{
    const candidate=choices[index]||{};
    const fallback=available[index%Math.max(available.length,1)]?.id||'';
    return {person:available.some(p=>p.id===candidate.person)?candidate.person:fallback,metric:candidate.metric||'total'};
  });
  const chosenIds=[...new Set(lanes.map(lane=>lane.person).filter(Boolean))];
  const fetched=useQuery({
    queryKey:['loc-member-cross',startDate,endDate,chosenIds.join('|'),lanes.some(x=>x.metric.startsWith('daily'))],
    enabled:Boolean(startDate&&endDate&&chosenIds.length),
    queryFn:async()=>{
      const pairs=await Promise.all(chosenIds.map(async id=>{
        const scope=scopes.find(item=>item.id===id);
        const [rows,daily]=await Promise.all([
          selectScopeSourceBreakdownRows(scope,{startDate,endDate}),
          id==='lrunes'&&lanes.some(lane=>lane.person===id&&lane.metric.startsWith('daily'))
            ?selectDailyRuneRange({startDate,endDate})
            :Promise.resolve([])
        ]);
        const draws=id==='lrunes'
          ?normalizeDailyDraws(daily,date=>realMoonPhase(new Date(date+'T12:00:00+08:00')))
          :[];
        return [id,{rows,daily:draws}];
      }));
      return new Map(pairs);
    },
    staleTime:5*60_000
  });
  const datasets=fetched.data||new Map();
  const measures=availableMemberMeasures([...datasets.values()].map(item=>item.rows),catalog.data?.categories||[]);
  const adjusted=lanes.map((lane,index)=>({
    ...lane,
    metric:measures.some(item=>item.id===lane.metric)&&!(lane.metric.startsWith('daily')&&lane.person!=='lrunes')
      ?lane.metric:'total',
    label:(names.get(lane.person)||lane.person)+' · '+(measures.find(item=>item.id===lane.metric)?.name||'全部作品')
  }));
  const unit=timeStandard==='1y'?'month':timeStandard==='1m'?'week':'day';
  const calculated=useMemo(()=>calculateMemberCross(adjusted,datasets,{
    from:startDate,to:endDate,unit,
    categories:catalog.data?.categories||[],aliases:catalog.data?.aliases||[]
  }),[JSON.stringify(adjusted),datasets,startDate,endDate,unit,catalog.data]);
  const distribution=calculated.totals.map(item=>({name:item.name,value:item.value}));
  const charts=availableStatisticChartTypes({rows:calculated.rows,series:calculated.series,distribution});
  const chosenChart=charts.some(([kind])=>kind===graph)?graph:(charts[0]?.[0]||'line');
  const update=(i,part)=>setChoices(old=>{
    const next=Array.from({length:laneCount},(_,index)=>({...lanes[index]}));
    next[i]={...next[i],...part};
    return next;
  });
  if(!available.length)return null;
  return <section className="scope-stat-section">
    <h2>所屬人員交互統計</h2>
    <div className="scope-stat-controls">
      <label><span>比較組數</span>
        <select className="scope-select" value={laneCount} onChange={e=>{setLaneCount(Number(e.target.value));setChoices([]);}}>
          {[2,3,4].map(n=><option key={n} value={n}>{n} 組</option>)}
        </select>
      </label>
      <label><span>圖形</span>
        <select className="scope-select" value={chosenChart} onChange={e=>setGraph(e.target.value)}>
          {charts.map(([value,label])=><option value={value} key={value}>{label}</option>)}
        </select>
      </label>
    </div>
    <div className="scope-stat-controls">
      {lanes.map((lane,index)=><div className="scope-inline-card" key={index}>
        <label>所屬人員 {index+1}
          <select className="scope-select" value={lane.person} onChange={e=>update(index,{person:e.target.value,metric:'total'})}>
            {available.map(member=><option key={member.id} value={member.id}>{member.label}</option>)}
          </select>
        </label>
        <label>比較項目
          <select className="scope-select" value={adjusted[index].metric} onChange={e=>update(index,{metric:e.target.value})}>
            {measures.filter(item=>!item.id.startsWith('daily')||lane.person==='lrunes').map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>)}
    </div>
    {fetched.error||catalog.error?<p className="scope-status scope-error">{String(fetched.error?.message||catalog.error?.message||'讀取失敗')}</p>:null}
    {!fetched.isPending&&!catalog.isPending?<>
      <div className="scope-ranking">
        <div><strong>共同活躍日</strong><span>{calculated.commonDays.toLocaleString()} 天</span></div>
        <div><strong>活躍日總數</strong><span>{calculated.unionDays.toLocaleString()} 天</span></div>
        <div><strong>交會比例</strong><span>{calculated.unionDays?(calculated.commonDays/calculated.unionDays*100).toFixed(1):'0'}%</span></div>
        {calculated.totals.map((row,index)=><div key={index}>
          <strong>{row.name}</strong><span>{row.value.toLocaleString()} 筆 · {row.activeDays} 天</span>
        </div>)}
      </div>
      <StatisticsMultiChart type={chosenChart} rows={calculated.rows} series={calculated.series}
        distribution={distribution} height={420} foldBlank/>
    </>:null}
  </section>;
}
