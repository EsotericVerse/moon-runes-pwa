'use client';
import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {useQuery} from '@tanstack/react-query';
import {UI_COPY} from '../../../i18n/ui-copy';
import {useUiCopy} from '../../../i18n/ui-locale';
import UiText,{useUiText} from '../../../i18n/UiText';
import {defaultScopeData} from '../../../loc/scope-data';
import {featureNavigationHref} from '../../feature-navigation';
import {featureDataErrorMessage} from '../../feature-data-state';
import {availableStatisticChartTypes,statisticsZoomWindow} from './statistics-time-zoom.mjs';
import StatisticsChartFrame from './StatisticsChartFrame';
import StatisticsDetails from './StatisticsDetails';

const StatisticsMultiChart=dynamic(()=>import('./StatisticsMultiChart'),{loading:()=>null});
const LocMemberIntersection=dynamic(()=>import('./LocMemberIntersection'),{loading:()=>null});

export default function ScopeGroupStatistics({taipeiDateKey,trendBucket,loadGalaxyStatistics}){
  const UI_COPY=useUiCopy();
  const t=useUiText();
  const [aggregateType,setAggregateType]=useState('total');
  const [chartType,setChartType]=useState('line');
  const [zoomLevel,setZoomLevel]=useState(0);
  // Persist intersection selections while the range-specific query remounts.
  const [memberLaneCount,setMemberLaneCount]=useState(2);
  const [memberChoices,setMemberChoices]=useState([]);
  const [memberGraph,setMemberGraph]=useState('line');
  // LOC is a set. ONE request returns every Scope's exact daily totals together with
  // the set's earliest date and Scope list; detail comparisons load only when opened.
  const endDate=useMemo(()=>taipeiDateKey(),[]);
  const [knownEarliest,setKnownEarliest]=useState('');
  const zoomRange=useMemo(()=>statisticsZoomWindow(zoomLevel,endDate,knownEarliest),
    [zoomLevel,endDate,knownEarliest]);
  const {startDate,endDate:rangeEndDate,bucket}=zoomRange;
  const locQuery=useQuery({
    queryKey:['loc-statistics',startDate,rangeEndDate],
    enabled:Boolean(startDate&&rangeEndDate),
    queryFn:async()=>{
      const {selectLocStatistics}=await loadGalaxyStatistics();
      return selectLocStatistics({startDate,endDate:rangeEndDate});
    },
    staleTime:5*60_000
  });
  useEffect(()=>{
    const found=locQuery.data?.earliest||'';
    if(found&&found!==knownEarliest)setKnownEarliest(found);
  },[locQuery.data,knownEarliest]);
  const scopes=useMemo(()=>(locQuery.data?.scopes||[]).map(row=>({
    ...defaultScopeData(row.scope_id),label:row.display_name||row.scope_id
  })).filter(row=>row.id&&row.galaxy&&row.galaxyMedia),[locQuery.data]);
  const scopeIds=useMemo(()=>scopes.map(scope=>String(scope.id||'').trim()).filter(Boolean),[scopes]);
  const densityQuery=locQuery;
  const densityRows=useMemo(()=>locQuery.data?.rows||[],[locQuery.data]);
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
        scopes={scopes} startDate={startDate} endDate={rangeEndDate}
        unit={bucket} loadGalaxyStatistics={loadGalaxyStatistics}
        laneCount={memberLaneCount} onLaneCountChange={setMemberLaneCount}
        choices={memberChoices} onChoicesChange={setMemberChoices}
        graph={memberGraph} onGraphChange={setMemberGraph}
        zoomLevel={zoomLevel} onZoomLevelChange={setZoomLevel} zoomRange={zoomRange}/>}
    </StatisticsDetails>
    {densityQuery.error?<p className="scope-status scope-error">{featureDataErrorMessage(densityQuery.error,UI_COPY)}</p>:null}
  </section>;
}

