'use client';
import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {useQuery} from '@tanstack/react-query';
import {UI_COPY} from '../../../i18n/ui-copy';
import {useUiCopy} from '../../../i18n/ui-locale';
import UiText,{useUiText} from '../../../i18n/UiText';
import {canParticipateInCrossStatistics,sharedScopeDensity} from '../../../loc/statistics-group-sharing.mjs';
import {selectFirstDailyRuneDate} from '../../../loc/daily-runes';
import {featureNavigationHref} from '../../feature-navigation';
import {featureDataErrorMessage} from '../../feature-data-state';
import {availableStatisticChartTypes,statisticsZoomWindow} from './statistics-time-zoom.mjs';
import StatisticsChartFrame from './StatisticsChartFrame';
import StatisticsDetails from './StatisticsDetails';

const StatisticsMultiChart=dynamic(()=>import('./StatisticsMultiChart'),{loading:()=>null});
const LocMemberIntersection=dynamic(()=>import('./LocMemberIntersection'),{loading:()=>null});

export default function ScopeGroupStatistics({selectPublicStatisticsMembers,taipeiDateKey,trendBucket,loadGalaxyStatistics}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const [aggregateType,setAggregateType]=useState('total');
  const [chartType,setChartType]=useState('line');
  const [zoomLevel,setZoomLevel]=useState(0);
  // Persist intersection selections while the range-specific query remounts.
  const [memberLaneCount,setMemberLaneCount]=useState(2);
  const [memberChoices,setMemberChoices]=useState([]);
  const [memberGraph,setMemberGraph]=useState('line');
  const scopesQuery=useQuery({
    queryKey:['managed-scopes'],
    queryFn:selectPublicStatisticsMembers,
    staleTime:5*60_000
  });
  const policy=useQuery({
    queryKey:['cross-statistics-sharing'],
    queryFn:async()=>{
      const {selectCrossScopeSharing}=await import('../../../loc/statistics-group-sharing-query.mjs');
      return selectCrossScopeSharing();
    },
    staleTime:0,refetchOnMount:'always',refetchOnWindowFocus:true
  });
  const scopes=useMemo(()=>(scopesQuery.data||[]).filter(scope=>
    canParticipateInCrossStatistics(scope.id,policy.data?.permissions,policy.data?.categories)
  ),[scopesQuery.data,policy.data]);
  const scopeIds=useMemo(()=>scopes.map(scope=>String(scope.id||'').trim()).filter(Boolean),[scopes]);
  const endDate=useMemo(()=>taipeiDateKey(),[]);
  const earliest=useQuery({
    queryKey:['statistics-history-start','loc',scopesQuery.data?.map(row=>row.id).join('|')],
    enabled:scopesQuery.isSuccess,
    queryFn:async()=>{
      const {selectFirstScopeStatisticsDate}=await loadGalaxyStatistics();
      const starts=await Promise.all([
        ...(scopesQuery.data||[]).map(selectFirstScopeStatisticsDate),
        selectFirstDailyRuneDate()
      ]);
      return starts.filter(Boolean).sort()[0]||'';
    },
    staleTime:5*60_000
  });
  const zoomRange=useMemo(()=>statisticsZoomWindow(zoomLevel,endDate,earliest.data||''),
    [zoomLevel,endDate,earliest.data]);
  const {startDate,endDate:rangeEndDate,bucket}=zoomRange;
  const densityQuery=useQuery({
    queryKey:['scope-density','loc',zoomLevel,startDate,rangeEndDate,scopeIds.join('|'),JSON.stringify(policy.data?.permissions||[])],
    queryFn:async()=>{
      const {selectScopeSourceBreakdownRows}=await loadGalaxyStatistics();
      return Promise.all(scopes.map(async scope=>{
        const rows=await selectScopeSourceBreakdownRows(scope,{startDate,endDate:rangeEndDate});
        return {scopeId:scope.id,rows,density:sharedScopeDensity(rows,scope.id,policy.data)};
      }));
    },
    enabled:Boolean(policy.data&&scopes.length&&startDate&&rangeEndDate),
    staleTime:5*60_000
  });
  const densityRows=useMemo(()=>(densityQuery.data||[]).flatMap(entry=>entry.density),[densityQuery.data]);
  const preloadedSources=useMemo(()=>densityQuery.data
    ?new Map(densityQuery.data.map(entry=>[entry.scopeId,entry.rows]))
    :null,[densityQuery.data]);
  const overallTotal=useMemo(
    ()=>densityRows.reduce((sum,row)=>sum+(Number(row.item_count)||0),0),
    [densityRows]
  );
  const totals=useMemo(()=>{
    const map=new Map(scopeIds.map(id=>[id,0]));
    for(const row of densityRows){
      const id=String(row.scope_id||'').trim();
      if(!map.has(id))continue;
      map.set(id,(map.get(id)||0)+(Number(row.item_count)||0));
    }
    return scopeIds.map(id=>{
      const total=map.get(id)||0;
      return {scope_id:id,total,ratio:overallTotal>0?(total/overallTotal)*100:0};
    });
  },[densityRows,scopeIds,overallTotal]);
  const trendData=useMemo(()=>{
    if(!startDate||!rangeEndDate)return [];
    const bucketUnit=bucket;
    const buckets=new Map();
    for(let cursor=new Date(startDate+'T00:00:00Z'),end=new Date(rangeEndDate+'T00:00:00Z');cursor<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){
      const day=cursor.toISOString().slice(0,10);
      const bucket=trendBucket(day,bucketUnit);
      if(!bucket||buckets.has(bucket.key))continue;
      const row={period:bucket.label,_sort:bucket.key,total:0};
      for(const id of scopeIds)row[id]=0;
      buckets.set(bucket.key,row);
    }
    for(const sourceRow of densityRows){
      const bucket=trendBucket(sourceRow.day,bucketUnit);
      if(!bucket)continue;
      const row=buckets.get(bucket.key)||{period:bucket.label,_sort:bucket.key,total:0};
      for(const id of scopeIds)if(row[id]===undefined)row[id]=0;
      const id=String(sourceRow.scope_id||'').trim();
      const count=Number(sourceRow.item_count)||0;
      if(scopeIds.includes(id))row[id]=(Number(row[id])||0)+count;
      row.total=(Number(row.total)||0)+count;
      buckets.set(bucket.key,row);
    }
    return [...buckets.values()].sort((a,b)=>a._sort.localeCompare(b._sort));
  },[densityRows,startDate,rangeEndDate,scopeIds,bucket]);
  const distributionData=totals.map(row=>({term:row.scope_id,value:row.total}));
  // Even when displaying a combined total, its composition is the real
  // set of child Scopes. A single 100% "LOC total" pie is not analytics.
  const locSeries=scopeIds.map(id=>({key:id,label:id}));
  const locDistribution=distributionData.map(row=>({name:row.term,value:row.value}));
  const locAllowed=availableStatisticChartTypes({
    rows:trendData,series:locSeries,distribution:locDistribution,totalKey:aggregateType==='total'?'total':''
  });
  const locChartType=locAllowed.some(([value])=>value===chartType)?chartType:(locAllowed[0]?.[0]||'line');

  return <section className="scope-stat-section">
    <header className="scope-stat-domain-heading">
      <div>
        <h2>{UI_COPY.statistics.result}</h2>
      </div>
    </header>
    <div className="scope-stat-controls">
      <label>
        <span>{UI_COPY.statistics.item}</span>
        <select className="scope-select" value={aggregateType} onChange={event=>setAggregateType(event.target.value)}>
          <option value="total"><UiText id="uiExtra.statisticsView.memberCount"/></option>
          <option value="scope"><UiText id="uiExtra.statisticsView.memberDistribution"/></option>
        </select>
      </label>
      <label>
        <span>{UI_COPY.statistics.chart}</span>
        <select className="scope-select" value={locChartType} onChange={event=>setChartType(event.target.value)}>
          {locAllowed.length?locAllowed.map(([value,label])=><option key={value} value={value}>{t(label)}</option>):<option value="line"><UiText id="uiExtra.statisticsView.noVisual"/></option>}
        </select>
      </label>
    </div>

    <p className="scope-status">{startDate&&rangeEndDate?startDate+' ～ '+rangeEndDate:''}</p>
    <p className="scope-status"><UiText id="uiExtra.statisticsView.groupAggregateHelp"/></p>
    <StatisticsChartFrame level={zoomLevel} onChange={setZoomLevel} range={zoomRange} idPrefix="loc-stat">
      {!densityQuery.isPending&&!densityQuery.error&&trendData.length?<StatisticsMultiChart
        type={locChartType} rows={trendData} series={locSeries}
        distribution={locDistribution} totalKey={aggregateType==='total'?'total':''} height={420}
      />:<p className="scope-status">{densityQuery.isPending?t('uiExtra.statisticsUI.loading'):t('uiExtra.statisticsUI.noChart')}</p>}
    </StatisticsChartFrame>
    <StatisticsDetails>{()=><>
    <div className="scope-ranking">
      <div>
        <strong><UiText id="uiExtra.statisticsView.memberCount"/></strong>
        <span>{t('uiExtra.statisticsView.totalWithCount',{count:overallTotal.toLocaleString()})}</span>
      </div>
    </div>

    <div className="scope-result-links">
      {scopeIds.map(id=><a key={id} href={featureNavigationHref(id,'statics')}>{id} · {t('uiExtra.statisticsView.viewMemberStat')}</a>)}
    </div>

    </>}</StatisticsDetails>
    <StatisticsDetails className="scope-stat-details" summary={<UiText id="uiExtra.statisticsView.memberCrossTitle"/>}>
      {()=> <LocMemberIntersection key={startDate+'|'+rangeEndDate}
        scopes={scopesQuery.data||[]} startDate={startDate} endDate={rangeEndDate}
        unit={bucket} sharing={policy.data||{}} preloadedSources={preloadedSources}
        laneCount={memberLaneCount} onLaneCountChange={setMemberLaneCount}
        choices={memberChoices} onChoicesChange={setMemberChoices}
        graph={memberGraph} onGraphChange={setMemberGraph}
        zoomLevel={zoomLevel} onZoomLevelChange={setZoomLevel} zoomRange={zoomRange}/>}
    </StatisticsDetails>
    {scopesQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(scopesQuery.error,UI_COPY)}</p>:null}
    {policy.error?<p className="scope-status scope-error">{featureDataErrorMessage(policy.error,UI_COPY)}</p>:null}
    {earliest.error?<p className="scope-status scope-error">{featureDataErrorMessage(earliest.error,UI_COPY)}</p>:null}
    {densityQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(densityQuery.error,UI_COPY)}</p>:null}
  </section>;
}

