'use client';
import FieldText from '../../../i18n/FieldText';

import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {selectRows} from '../../../loc/db-query.mjs';
import {defaultScopeData,selectScopeRegistry} from '../../../loc/scope-data';
import {selectScopeSourceBreakdownRows} from '../../../loc/galaxy-query';
import {selectDailyRuneRange} from '../../../loc/daily-runes';
import {normalizeDailyDraws} from '../../../lrunes/daily-analytics-model.mjs';
import {realMoonPhase} from '../../../loc/model/moon-phase';
import {availableMemberMeasures,calculateMemberCross} from '../../../loc/member-intersection-model.mjs';
import StatisticsMultiChart,{availableStatisticChartTypes} from './StatisticsMultiChart';
import StatisticsChartFrame from './StatisticsChartFrame';
import StatisticsDetails from './StatisticsDetails';
import {sharedGroupCodes,sharedSourceBreakdown,canParticipateInCrossStatistics,allowedMemberMetric} from '../../../loc/statistics-group-sharing.mjs';

async function readCatalog(table,columns){
  return (await selectRows(table,{columns,limit:250,offset:0})).rows;
}
const DEFAULT_LANE_COUNT=2;
export default function LocMemberIntersection({
  scopes=[],startDate='',endDate='',unit='month',sharing={},
  laneCount=DEFAULT_LANE_COUNT,choices=[],graph='line',
  onLaneCountChange,onChoicesChange,onGraphChange,
  zoomLevel=0,onZoomLevelChange,zoomRange={}
}){
  // The time range identifies the returned dataset. Choices live in the LOC
  // parent, so remounting one range cannot silently reset selected comparisons.
  const rangeKey=startDate+'|'+endDate;
  const catalog=useQuery({
    queryKey:['loc-source-categories'],
    queryFn:async()=>{
      const [categories,aliases,personal,people]=await Promise.all([
        readCatalog('silver.statistics_source_categories','category_code,display_name,enabled,sort_order'),
        readCatalog('silver.statistics_source_aliases','source_key,category_code'),
        readCatalog('silver.scope_source_subcategories','scope_id,source_key,category_code,display_name,enabled'),
        selectScopeRegistry({scopeKind:'scope'})
      ]);
      return {categories,aliases,scopeSources:personal,people};
    },
    staleTime:5*60_000
  });
  const names=useMemo(()=>new Map((catalog.data?.people||[]).map(row=>[row.scope_id,row.display_name||row.scope_id])),[catalog.data?.people]);
  // Daily Rune is a dedicated test feed, not a registered Galaxy source or a
  // group/personal source classification. It is always a LOC comparison choice.
  const available=[
    ...scopes.filter(scope=>scope.id!=='lrunes'&&
      canParticipateInCrossStatistics(scope.id,sharing.permissions,sharing.categories))
      .map(scope=>({id:scope.id,label:names.get(scope.id)||scope.id,scope})),
    {id:'lrunes',label:names.get('lrunes')||'月之符文',
      scope:scopes.find(scope=>scope.id==='lrunes')||defaultScopeData('lrunes')}
  ];
  const allows=(person,metric)=>metric.startsWith('daily')
    ?person==='lrunes':allowedMemberMetric(person,metric,sharing);
  const lanes=Array.from({length:laneCount},(_,index)=>{
    const candidate=choices[index]||{};
    const fallback=available[index%Math.max(available.length,1)]?.id||'';
    const person=available.some(p=>p.id===candidate.person)?candidate.person:fallback;
    return {person,metric:candidate.metric|| (person==='lrunes'?'daily':'total')};
  });
  const chosenIds=[...new Set(lanes.map(lane=>lane.person).filter(Boolean))];
  const fetched=useQuery({
    queryKey:['loc-member-cross',startDate,endDate,chosenIds.join('|'),lanes.some(x=>x.metric.startsWith('daily')),JSON.stringify(sharing)],
    enabled:Boolean(startDate&&endDate&&chosenIds.length),
    queryFn:async()=>{
      const pairs=await Promise.all(chosenIds.map(async id=>{
        const scope=available.find(item=>item.id===id)?.scope;
        const [rows,daily]=await Promise.all([
          sharedGroupCodes(id,sharing.permissions,sharing.categories).size
            ?selectScopeSourceBreakdownRows(scope,{startDate,endDate}):Promise.resolve([]),
          id==='lrunes'&&lanes.some(lane=>lane.person===id&&lane.metric.startsWith('daily'))
            ?selectDailyRuneRange({startDate,endDate})
            :Promise.resolve([])
        ]);
        const draws=id==='lrunes'
          ?normalizeDailyDraws(daily,date=>realMoonPhase(new Date(date+'T12:00:00+08:00')))
          :[];
        return [id,{rows:sharedSourceBreakdown(rows,id,sharing),daily:draws}];
      }));
      return {rangeKey,datasets:new Map(pairs)};
    },
    staleTime:5*60_000
  });
  const hasCurrentData=fetched.data?.rangeKey===rangeKey;
  const datasets=hasCurrentData?fetched.data.datasets:new Map();
  const shareablePersonal=(sharing.scopeSources||[]).filter(row=>
    sharedGroupCodes(row.scope_id,sharing.permissions,sharing.categories).has(row.category_code));
  const measures=availableMemberMeasures([...datasets.values()].map(item=>item.rows),sharing.categories||[],shareablePersonal);
  const adjusted=lanes.map((lane,index)=>({
    ...lane,
    metric:measures.some(item=>item.id===lane.metric)&&allows(lane.person,lane.metric)
      ?lane.metric:(lane.person==='lrunes'?'daily':'total'),
    label:(names.get(lane.person)||lane.person)+' · '+(measures.find(item=>item.id===lane.metric)?.name||'全部作品')
  }));
  const calculated=useMemo(()=>calculateMemberCross(adjusted,datasets,{
    from:startDate,to:endDate,unit,
    categories:sharing.categories||[],aliases:sharing.aliases||[],scopeSources:sharing.scopeSources||[]
  }),[JSON.stringify(adjusted),datasets,startDate,endDate,unit,sharing]);
  const distribution=calculated.totals.map(item=>({name:item.name,value:item.value}));
  const charts=availableStatisticChartTypes({rows:calculated.rows,series:calculated.series,distribution});
  const chosenChart=charts.some(([kind])=>kind===graph)?graph:(charts[0]?.[0]||'line');
  const update=(i,part)=>onChoicesChange?.(old=>{
    const next=Array.from({length:laneCount},(_,index)=>({...lanes[index]}));
    next[i]={...next[i],...part};
    return next;
  });
  if(!available.length)return null;
  return <section className="scope-stat-section"
    data-stat-cross-range={rangeKey}
    data-stat-cross-resolved-range={hasCurrentData?fetched.data.rangeKey:''}
    aria-busy={fetched.isPending||fetched.isFetching||!hasCurrentData}>
    <h2><FieldText text="所屬人員交互統計"/></h2>
    <div className="scope-stat-controls">
      <label><span><FieldText text="比較組數"/></span>
        <select className="scope-select" value={laneCount} onChange={e=>{onLaneCountChange?.(Number(e.target.value));onChoicesChange?.([]);}}>
          {[2,3,4].map(n=><option key={n} value={n}>{n} 組</option>)}
        </select>
      </label>
      <label><span>圖形</span>
        <select className="scope-select" value={chosenChart} onChange={e=>onGraphChange?.(e.target.value)}>
          {charts.map(([value,label])=><option value={value} key={value}>{label}</option>)}
        </select>
      </label>
    </div>
    <div className="scope-stat-controls">
      {lanes.map((lane,index)=><div className="scope-inline-card" key={index}>
        <label>所屬人員 {index+1}
          <select className="scope-select" value={lane.person} onChange={e=>update(index,{person:e.target.value,metric:e.target.value==='lrunes'?'daily':'total'})}>
            {available.map(member=><option key={member.id} value={member.id}>{member.label}</option>)}
          </select>
        </label>
        <label>比較項目
          <select className="scope-select" value={adjusted[index].metric} onChange={e=>update(index,{metric:e.target.value})}>
            {measures.filter(item=>(!item.id.startsWith('daily')||lane.person==='lrunes')&&
            allows(lane.person,item.id)).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>)}
    </div>
    {fetched.error||catalog.error?<p className="scope-status scope-error">{String(fetched.error?.message||catalog.error?.message||'讀取失敗')}</p>:null}
    {fetched.isPending||fetched.isFetching?<p className="scope-status" role="status">正在更新交會統計…</p>:null}
    {!fetched.isPending&&!fetched.isFetching&&hasCurrentData?<>
      <StatisticsChartFrame level={zoomLevel} onChange={onZoomLevelChange} range={zoomRange} idPrefix="loc-member-stat">
        <StatisticsMultiChart type={chosenChart} rows={calculated.rows} series={calculated.series}
          distribution={distribution} height={420} foldBlank/>
      </StatisticsChartFrame>
      <StatisticsDetails>{()=><>
      <div className="scope-ranking">
        <div><strong>共同活躍日</strong><span>{calculated.commonDays.toLocaleString()} 天</span></div>
        <div><strong>活躍日總數</strong><span>{calculated.unionDays.toLocaleString()} 天</span></div>
        <div><strong>交會比例</strong><span>{calculated.unionDays?(calculated.commonDays/calculated.unionDays*100).toFixed(1):'0'}%</span></div>
        {calculated.totals.map((row,index)=><div key={index}>
          <strong>{row.name}</strong><span>{row.value.toLocaleString()} 筆 · {row.activeDays} 天</span>
        </div>)}
      </div>
      </>}</StatisticsDetails>
    </>:null}
  </section>;
}
