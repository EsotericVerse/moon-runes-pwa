'use client';

import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {FeaturePage} from '../ui';
import {useAsyncResource} from '../../loc/use-async-resource';
import {readNumericIsr,usesNumericIsr} from '../../loc/numeric-isr-client';
import {TRACE_SCOPES,traceKey,readTraceData} from './trace/trace-data';

// Preserve the Trace Hero. Fetch the same public Time-period index as Culture
// and Statistics immediately, independently from the client-only map engine.
const TraceMap=dynamic(()=>import('./trace/TraceMap'),{
  ssr:false,
  loading:()=> <p className="scope-status" role="status">正在載入痕跡地圖…</p>
});
const TracePlaceResults=dynamic(()=>import('./trace/TracePlaceResults'),{
  loading:()=> <p className="scope-status">正在準備地點作品列表…</p>
});

export default function Trace({scopeId='loc'}){
  const [selectedPlace,setSelectedPlace]=useState(null);
  const [selectedResource,setSelectedResource]=useState('');
  const supported=TRACE_SCOPES.includes(scopeId);
  // LOC displays a union of published spatial anchors, but Periods belong to
  // individual Scopes. Never invent a combined LOC timeline.
  const [locPeriodScope,setLocPeriodScope]=useState('lo3rwang');
  const periodScopeId=scopeId==='loc'?locPeriodScope:scopeId;
  const [periodKey,setPeriodKey]=useState('latest');
  const periodsQuery=useAsyncResource({
    queryKey:['culture-time-periods',periodScopeId],
    enabled:supported&&Boolean(periodScopeId),
    queryFn:async()=>{
      if(usesNumericIsr(periodScopeId))return readNumericIsr(periodScopeId,'periods');
      // Keep native/local providers independent of the Cloudflare worker.
      const {selectScopeCultureData}=await import('../../loc/culture-query');
      return (await selectScopeCultureData(periodScopeId)).eras?.eras||[];
    },
    revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const periods=useMemo(()=>(periodsQuery.data||[])
    .filter(row=>row.start_date)
    .sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date))
      ||Number(a.order||0)-Number(b.order||0)),[periodsQuery.data]);
  const selectedPeriod=periodKey==='latest'?periods.at(-1):
    periods.find(period=>String(period.period||period.era_id||period.record_id)===periodKey);
  const traces=useAsyncResource(traceKey(scopeId),()=>usesNumericIsr(scopeId)?readNumericIsr(scopeId,'traces'):readTraceData(scopeId),{
    enabled:supported,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  // Anchors identify places, not visits. Apply the Period only to an on-demand
  // inline single-place Galaxy list; the map itself stays unfiltered by time.
  const spatialData=useMemo(()=>{
    const data=traces.data||null;
    if(!data||scopeId!=='loc')return data;
    return {...data,
      anchors:(data.anchors||[]).filter(anchor=>anchor.source_scope===periodScopeId),
      maps:(data.maps||[]).filter(map=>map.source_scope===periodScopeId)};
  },[traces.data,scopeId,periodScopeId]);
  return <FeaturePage featureId="trace">
    {supported?<div className="scope-stat-controls" role="group" aria-label="軌跡時期">
      {scopeId==='loc'?<label>
        <span>作品範圍</span>
        <select className="scope-select" value={locPeriodScope}
          onChange={event=>{setLocPeriodScope(event.target.value);setPeriodKey('latest');setSelectedPlace(null);setSelectedResource('');}}>
          <option value="lo3rwang">作者作品</option>
          <option value="lrunes">月之符文</option>
        </select>
      </label>:null}
      <label>
        <span>時期</span>
        <select className="scope-select" value={periodKey}
          onChange={event=>setPeriodKey(event.target.value)}>
          <option value="latest">{periods.length?'最新時期':'未設定時期（不限日期）'}</option>
          <option value="all">全部時期</option>
          {periods.map(period=><option key={period.record_id||period.period}
            value={String(period.period||period.era_id||period.record_id)}>
            {period.title||period.name||period.period}
          </option>)}
        </select>
      </label>
      {periodsQuery.isPending?<span className="scope-status" role="status">正在載入時期…</span>:null}
      {!periodsQuery.isPending&&!periodsQuery.error&&!periods.length?<span className="scope-status">尚未建立時期；可直接使用地圖及地點搜尋。</span>:null}
      {periodsQuery.error?<span className="scope-status scope-error" role="alert">
        時期讀取失敗：{String(periodsQuery.error.message||periodsQuery.error)}
      </span>:null}
      <p className="scope-status">時期只篩選下方所選定錨點或痕跡圖的文章；空間定錨點不等於該時期曾造訪。</p>
    </div>:null}
    <TraceMap spatialData={spatialData} onAnchorSelect={anchor=>{
      if(String(anchor?.uid||'').trim()){
        setSelectedPlace(anchor);
        setSelectedResource('anchor:'+anchor.uid);
      }
    }}/>
    <div className="scope-stat-controls" role="group" aria-label="地圖下方報表選擇">
      <label><span>空間定錨點／痕跡圖</span>
        <select className="scope-select" value={selectedResource}
          onChange={event=>{
            const value=event.target.value;
            setSelectedResource(value);
            const [type,uid]=value.split(':');
            setSelectedPlace((type==='map'?spatialData?.maps:spatialData?.anchors)
              ?.find(item=>item.uid===uid)||null);
          }}>
          <option value="">從地圖選定錨點，或選擇痕跡圖</option>
          {(spatialData?.maps||[]).length?<optgroup label="痕跡圖">
            {spatialData.maps.map(item=><option key={'map:'+item.uid} value={'map:'+item.uid}>
              {item.title}（{item.anchor_uids?.length||0} 站）</option>)}
          </optgroup>:null}
          <optgroup label="空間定錨點">
            {(spatialData?.anchors||[]).map(item=><option key={'anchor:'+item.uid}
              value={'anchor:'+item.uid}>{item.title}</option>)}
          </optgroup>
        </select>
      </label>
    </div>
    <TracePlaceResults key={periodScopeId} place={selectedPlace}
      anchors={spatialData?.anchors||[]} scopeId={periodScopeId}
      period={periodKey==='all'?null:selectedPeriod||null}/>
    {supported&&traces.isPending?<p className="scope-status" role="status">正在載入已建立的空間定錨點…</p>:null}
    {supported&&traces.error?<p className="scope-status scope-error" role="alert">空間定錨點讀取失敗：{String(traces.error.message||traces.error)}</p>:null}
  </FeaturePage>;
}
