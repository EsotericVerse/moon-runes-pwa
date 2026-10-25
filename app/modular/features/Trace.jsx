'use client';

import {useEffect,useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {FeaturePage} from '../ui';
import {useAsyncResource} from '../../loc/use-async-resource';
import {traceWindow} from './trace/trace-panel-filters.mjs';
import {
  readDefaultTraceRoute,setDefaultTraceRoute,chooseDefaultTraceRoute,
  TRACE_DEFAULT_ROUTE_CHANGED
} from './trace/trace-route-preference.mjs';
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
  const [routeListOpen,setRouteListOpen]=useState(false);
  const [currentTraceChoice,setCurrentTraceChoice]=useState('auto');
  const [reportTab,setReportTab]=useState('articles');
  const [reportSettingsOpen,setReportSettingsOpen]=useState(false);
  const [timeWindow,setTimeWindow]=useState('3m');
  const [customStart,setCustomStart]=useState('');
  const [customEnd,setCustomEnd]=useState('');
  const [sourceDraft,setSourceDraft]=useState('');
  const [sourceName,setSourceName]=useState('');
  const [mediaType,setMediaType]=useState('');
  const dateRange=useMemo(()=>traceWindow(timeWindow,new Date(),
    {start:customStart,end:customEnd}),[timeWindow,customStart,customEnd]);
  const choosePlace=anchor=>{
    if(!anchor?.uid)return;
    // Switching pins replaces content without resetting the chosen mode.
    // The first selection still defaults to articles through reportTab state.
    setSelectedPlace(anchor);
  };

  // Reuse the route preference from the existing management editor. "All"
  // is a temporary view, not a persisted default or a second preference key.
  useEffect(()=>{
    const reloadDefault=()=>{
      setCurrentTraceChoice(readDefaultTraceRoute(periodScopeId)||'auto');
      setSelectedPlace(null);
    };
    reloadDefault();
    window.addEventListener(TRACE_DEFAULT_ROUTE_CHANGED,reloadDefault);
    return()=>window.removeEventListener(TRACE_DEFAULT_ROUTE_CHANGED,reloadDefault);
  },[periodScopeId]);
  const chooseCurrentTrace=value=>{
    setSelectedPlace(null);
    if(value==='all'){setCurrentTraceChoice('all');return;}
    if(setDefaultTraceRoute(periodScopeId,value))setCurrentTraceChoice(value);
  };

  // Phase 1: load the light index, never all historical check-ins at startup.
  const traceIndex=useAsyncResource({
    queryKey:traceMapIndexKey(periodScopeId),
    enabled:supported&&routeListOpen,
    queryFn:()=>readTraceMapIndex(periodScopeId),
    revalidateIfStale:false,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const maps=traceIndex.data||[];
  const currentMap=useMemo(()=>{
    if(currentTraceChoice==='all')return null;
    return chooseDefaultTraceRoute(maps,periodScopeId,currentTraceChoice);
  },[traceIndex.data,periodScopeId,currentTraceChoice]);
  const showingAll=currentTraceChoice==='all';

  // Phase 2: cache the current route's 2–80 sites by its membership revision.
  // Repeated visits have their own timestamps; a multi-day trip does not imply
  // that any one stop was occupied for its entire duration.
  const anchorsQuery=useAsyncResource({
    queryKey:currentMap
      ?traceCurrentKey(periodScopeId,currentMap)
      :traceAllAnchorsKey(periodScopeId),
    enabled:supported&&routeListOpen&&traceIndex.data!==undefined&&(Boolean(currentMap)||showingAll),
    queryFn:()=>currentMap
      ?readCurrentTraceAnchors(periodScopeId,currentMap.anchor_uids)
      :readAllTraceAnchors(periodScopeId),
    revalidateIfStale:false,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  const spatialData=useMemo(()=>{
    if(!routeListOpen||traceIndex.data===undefined)return {anchors:[],maps:[]};
    if(!showingAll&&!currentMap)return {anchors:[],maps:[]};
    if(anchorsQuery.data===undefined)return null;
    return {anchors:anchorsQuery.data,
      maps:showingAll?traceIndex.data:[currentMap]};
  },[routeListOpen,traceIndex.data,anchorsQuery.data,currentMap,showingAll]);

  const selectedAvailable=selectedPlace&&(selectedPlace.trace_type==='map'
    ?spatialData?.maps.some(row=>row.uid===selectedPlace.uid&&row.source_scope===selectedPlace.source_scope)
    :spatialData?.anchors.some(row=>row.uid===selectedPlace.uid&&row.source_scope===selectedPlace.source_scope));
  const reportPlace=selectedAvailable?selectedPlace:null;

  return <FeaturePage featureId="trace">
    <div className="scope-stat-controls" role="group" aria-label="痕跡選擇與展示模式">
      <button type="button" className="loc-button" aria-pressed={mapOnly}
        onClick={()=>setMapOnly(value=>!value)}>
        {mapOnly?'返回完整痕跡操作':'純地圖展示（收合其他區域）'}
      </button>
      {supported&&scopeId==='loc'?<label>
        <span>作品範圍</span>
        <select className="scope-select" value={locPeriodScope}
          onChange={event=>{setLocPeriodScope(event.target.value);setSelectedPlace(null);}}>
          <option value="lo3rwang">作者作品</option>
          <option value="lrunes">月之符文</option>
        </select>
      </label>:null}
      {supported&&!routeListOpen?<button type="button" className="loc-button"
        onClick={()=>setRouteListOpen(true)}>載入痕跡圖</button>:null}
      {supported&&routeListOpen?<label>
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
      {currentMap&&routeListOpen?<button type="button" className="loc-button"
        onClick={()=>choosePlace(currentMap)}>查看整張路線內容</button>:null}
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

    {!mapOnly&&reportPlace?<div className="loc-trace-report-toolbar" role="group" aria-label="地點內容框">
      <strong>{reportPlace.title}</strong>
      <div className="scope-stat-controls" role="group" aria-label="地點呈現模式">
        {[{value:'articles',label:'文章列表'},{value:'timeline',label:'文化'},{value:'statistics',label:'統計'}].map(item=>
          <button type="button" key={item.value} className="loc-button"
            aria-pressed={reportTab===item.value}
            onClick={()=>setReportTab(item.value)}>{item.label}</button>)}
        <button type="button" className="loc-button"
          aria-expanded={reportSettingsOpen}
          onClick={()=>setReportSettingsOpen(value=>!value)}>設定</button>
        <button type="button" className="loc-button"
          onClick={()=>setSelectedPlace(null)}>收合內容</button>
      </div>
      {reportSettingsOpen?<div className="loc-trace-report-settings">
        <label>時間
          <select className="scope-select" value={timeWindow} onChange={event=>setTimeWindow(event.target.value)}>
            <option value="3m">最近三個月（預設）</option>
            <option value="12m">最近一年</option>
            <option value="all">全部時間</option>
            <option value="custom">自訂日期</option>
          </select>
        </label>
        {timeWindow==='custom'?<>
          <label>開始日期<input type="date" value={customStart} onChange={event=>setCustomStart(event.target.value)}/></label>
          <label>結束日期<input type="date" value={customEnd} onChange={event=>setCustomEnd(event.target.value)}/></label>
        </>:null}
        <form onSubmit={event=>{event.preventDefault();setSourceName(sourceDraft.trim());}}>
          <label>作品來源／分類
            <input type="search" value={sourceDraft} onChange={event=>setSourceDraft(event.target.value)}
              placeholder="例如 Threads（留空＝全部）"/>
          </label>
          <button type="submit" className="loc-button">套用來源</button>
          {sourceName?<button type="button" className="loc-button"
            onClick={()=>{setSourceName('');setSourceDraft('');}}>清除來源</button>:null}
        </form>
        <label>媒體類型
          <select className="scope-select" value={mediaType}
            onChange={event=>setMediaType(event.target.value)}>
            <option value="">全部媒體</option>
            <option value="音樂">音樂</option>
            <option value="圖片">圖片</option>
            <option value="影片">影片</option>
          </select>
        </label>
        <p className="scope-status">來源對應作品的 source_name（例如 Threads）；媒體類型對應 galaxy_media.media_type。兩者可交叉篩選，三種模式共用 {timeWindow==='3m'?'最近三個月':timeWindow==='all'?'全部時間':'目前設定時間'}。</p>
      </div>:null}
    </div>:null}

    <TraceMap mapOnly={mapOnly} spatialData={spatialData} hideRoutePicker
      selectedRouteUid={currentMap?.uid||''}
      onAnchorSelect={choosePlace}/>

    {!mapOnly&&reportPlace?<TracePlaceResults place={reportPlace}
      anchors={spatialData?.anchors||[]} scopeId={periodScopeId}
      tab={reportTab} sourceName={sourceName} mediaType={mediaType} dateRange={dateRange}/>:null}
  </FeaturePage>;
}
