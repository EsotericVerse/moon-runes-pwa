'use client';

import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {FeaturePage} from '../ui';
import {useAsyncResource} from '../../loc/use-async-resource';
import {readNumericIsr,usesNumericIsr} from '../../loc/numeric-isr-client';
import {
  TRACE_SCOPES,traceMapIndexKey,traceCurrentKey,traceAllAnchorsKey,
  readTraceMapIndex,readCurrentTraceAnchors,readAllTraceAnchors
} from './trace/trace-data';

// A trace map is the spatial counterpart of a Time period. Only the selected
// Current trace's anchors are loaded; "all" is an explicit, costly choice.
const TraceMap=dynamic(()=>import('./trace/TraceMap'),{
  ssr:false,
  loading:()=> <p className="scope-status" role="status">正在載入痕跡地圖…</p>
});
const TracePlaceResults=dynamic(()=>import('./trace/TracePlaceResults'),{
  loading:()=> <p className="scope-status">正在準備地點作品列表…</p>
});

export default function Trace({scopeId='loc'}){
  const supported=TRACE_SCOPES.includes(scopeId);
  const [selectedPlace,setSelectedPlace]=useState(null);
  const [mapOnly,setMapOnly]=useState(false);
  const [locPeriodScope,setLocPeriodScope]=useState('lo3rwang');
  const periodScopeId=scopeId==='loc'?locPeriodScope:scopeId;
  const [periodKey,setPeriodKey]=useState('latest');
  const [currentTraceChoice,setCurrentTraceChoice]=useState('auto');

  // Current is a small per-Scope browser preference, not another database
  // table. If the choice was deleted, the first saved route becomes default.
  useEffect(()=>{
    let choice='auto';
    try{choice=window.localStorage.getItem('loc-current-trace:'+periodScopeId)||'auto';}
    catch{/* Current still works when persistent storage is unavailable. */}
    setCurrentTraceChoice(choice);
    setSelectedPlace(null);
  },[periodScopeId]);
  const chooseCurrentTrace=value=>{
    setCurrentTraceChoice(value);
    setSelectedPlace(null);
    try{window.localStorage.setItem('loc-current-trace:'+periodScopeId,value);}
    catch{/* Keep the in-memory selection. */}
  };

  const periodsQuery=useAsyncResource({
    queryKey:['culture-time-periods',periodScopeId],
    enabled:supported&&Boolean(periodScopeId),
    queryFn:async()=>{
      if(usesNumericIsr(periodScopeId))return readNumericIsr(periodScopeId,'periods');
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

  // Phase 1: load the light index, never all historical check-ins at startup.
  const traceIndex=useAsyncResource({
    queryKey:traceMapIndexKey(periodScopeId),
    enabled:supported,
    queryFn:()=>readTraceMapIndex(periodScopeId),
    revalidateIfStale:false,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const maps=traceIndex.data||[];
  const currentMap=useMemo(()=>{
    if(currentTraceChoice==='all')return null;
    return maps.find(map=>map.uid===currentTraceChoice)||maps[0]||null;
  },[traceIndex.data,currentTraceChoice]);
  const showingAll=currentTraceChoice==='all';

  // Phase 2: cache the current route's 2–80 sites by its membership revision.
  // Repeated visits have their own timestamps; a multi-day trip does not imply
  // that any one stop was occupied for its entire duration.
  const anchorsQuery=useAsyncResource({
    queryKey:currentMap
      ?traceCurrentKey(periodScopeId,currentMap)
      :traceAllAnchorsKey(periodScopeId),
    enabled:supported&&traceIndex.data!==undefined&&(Boolean(currentMap)||showingAll),
    queryFn:()=>currentMap
      ?readCurrentTraceAnchors(periodScopeId,currentMap.anchor_uids)
      :readAllTraceAnchors(periodScopeId),
    revalidateIfStale:false,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const spatialData=useMemo(()=>{
    if(traceIndex.data===undefined)return null;
    if(!showingAll&&!currentMap)return {anchors:[],maps:[]};
    if(anchorsQuery.data===undefined)return null;
    return {anchors:anchorsQuery.data,
      maps:showingAll?traceIndex.data:[currentMap]};
  },[traceIndex.data,anchorsQuery.data,currentMap,showingAll]);

  const selectedAvailable=selectedPlace&&(selectedPlace.trace_type==='map'
    ?spatialData?.maps.some(row=>row.uid===selectedPlace.uid&&row.source_scope===selectedPlace.source_scope)
    :spatialData?.anchors.some(row=>row.uid===selectedPlace.uid&&row.source_scope===selectedPlace.source_scope));
  const reportPlace=selectedAvailable?selectedPlace:currentMap;
  const selectedResource=reportPlace?(reportPlace.trace_type+':'+reportPlace.uid):'';

  return <FeaturePage featureId="trace">
    <div className="scope-stat-controls" role="group" aria-label="痕跡選擇與展示模式">
      <button type="button" className="loc-button" aria-pressed={mapOnly}
        onClick={()=>setMapOnly(value=>!value)}>
        {mapOnly?'返回完整痕跡操作':'純地圖展示（收合其他區域）'}
      </button>
      {supported&&scopeId==='loc'?<label>
        <span>作品範圍</span>
        <select className="scope-select" value={locPeriodScope}
          onChange={event=>{setLocPeriodScope(event.target.value);setPeriodKey('latest');setSelectedPlace(null);}}>
          <option value="lo3rwang">作者作品</option>
          <option value="lrunes">月之符文</option>
        </select>
      </label>:null}
      {supported?<label>
        <span>Current 痕跡（空間時期）</span>
        <select className="scope-select"
          value={showingAll?'all':currentMap?.uid||''}
          onChange={event=>chooseCurrentTrace(event.target.value)}
          disabled={traceIndex.isPending||Boolean(traceIndex.error)}>
          {!maps.length?<option value="">尚未建立痕跡圖</option>:null}
          {maps.map(map=><option key={map.uid} value={map.uid}>
            {map.title}（{map.anchor_uids?.length||0} 站）
          </option>)}
          <option value="all">全部定錨點（手動載入）</option>
        </select>
      </label>:null}
    </div>
    {supported&&traceIndex.isPending?<p className="scope-status" role="status">正在載入痕跡列表…</p>:null}
    {supported&&traceIndex.error?<p className="scope-status scope-error" role="alert">
      痕跡列表讀取失敗：{String(traceIndex.error.message||traceIndex.error)}
    </p>:null}
    {supported&&anchorsQuery.isPending?<p className="scope-status" role="status">正在載入 Current 痕跡的空間定錨點…</p>:null}
    {supported&&anchorsQuery.error?<p className="scope-status scope-error" role="alert">
      痕跡錨點讀取失敗：{String(anchorsQuery.error.message||anchorsQuery.error)}
    </p>:null}
    {supported&&!traceIndex.isPending&&!maps.length?<p className="scope-status">
      尚未建立痕跡圖。請在管理頁建立一組站點路線，或手動選擇「全部定錨點」。
    </p>:null}

    {!mapOnly&&supported?<div className="scope-stat-controls" role="group" aria-label="時間時期">
      <label>
        <span>時間時期</span>
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
      {!periodsQuery.isPending&&!periodsQuery.error&&!periods.length?<span className="scope-status">尚未建立時間時期；可直接使用痕跡。</span>:null}
      {periodsQuery.error?<span className="scope-status scope-error" role="alert">
        時期讀取失敗：{String(periodsQuery.error.message||periodsQuery.error)}
      </span>:null}
      <p className="scope-status">痕跡控制地點與路線；時間時期篩選文章。各地點的造訪時間獨立記錄，不能以旅程起訖推定停留期間。</p>
    </div>:null}

    <TraceMap mapOnly={mapOnly} spatialData={spatialData} hideRoutePicker
      selectedRouteUid={currentMap?.uid||''}
      onAnchorSelect={anchor=>{if(anchor?.uid)setSelectedPlace(anchor);}}/>

    {!mapOnly?<><div className="scope-stat-controls" role="group" aria-label="地圖下方報表選擇">
      <label><span>Current 痕跡內的站點／痕跡圖</span>
        <select className="scope-select" value={selectedResource}
          onChange={event=>{
            const [type,uid]=event.target.value.split(':');
            const resource=(type==='map'?spatialData?.maps:spatialData?.anchors)
              ?.find(item=>item.uid===uid)||null;
            setSelectedPlace(resource);
          }}>
          <option value="">從地圖選擇地點</option>
          {(spatialData?.maps||[]).length?<optgroup label="痕跡圖">
            {spatialData.maps.map(map=><option key={'map:'+map.uid} value={'map:'+map.uid}>
              {map.title}（{map.anchor_uids?.length||0} 站）</option>)}
          </optgroup>:null}
          <optgroup label="空間定錨點">
            {(spatialData?.anchors||[]).map(anchor=><option key={'anchor:'+anchor.uid}
              value={'anchor:'+anchor.uid}>{anchor.title}</option>)}
          </optgroup>
        </select>
      </label>
    </div>
    <TracePlaceResults key={periodScopeId} place={reportPlace}
      anchors={spatialData?.anchors||[]} scopeId={periodScopeId}
      period={periodKey==='all'?null:selectedPeriod||null}/>
    </>:null}
  </FeaturePage>;
}
