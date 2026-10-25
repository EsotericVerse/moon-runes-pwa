'use client';

import {useEffect,useRef,useState} from 'react';
import {useUiLocale} from '../../../i18n/ui-locale';
import {createTraceMap} from './trace-map-engine';
import {searchTracePlaces} from './trace-geocoding';
import 'maplibre-gl/dist/maplibre-gl.css';
// Coordinates stay in the browser-only example module. These labels identify
// the same public sample anchors in each language; not Galaxy places.
const DEMO_PLACES=[
  {id:'banqiao',name:'板橋車站'},
  {id:'fuzhong',name:'府中站'},
  {id:'jiangzicui',name:'江子翠站'}
];

const SEARCH_UI={
  'zh-Hant':{label:'快速地區定位',placeholder:'搜尋地名、車站、商家或地區',find:'查詢地點',empty:'沒有找到符合的地點，請換個地名。',failed:'地點查詢失敗'},
  'zh-Hans':{label:'快速地区定位',placeholder:'搜索地名、车站、商家或地区',find:'查询地点',empty:'没有找到符合的地点。',failed:'地点查询失败'},
  en:{label:'Find a place',placeholder:'Place, station, venue or region',find:'Search places',empty:'No matching locations found.',failed:'Place lookup failed'},
  ja:{label:'場所を検索',placeholder:'地名、駅、施設、地域',find:'場所を探す',empty:'該当する場所が見つかりません。',failed:'検索できませんでした'}
};
const STRINGS={
  'zh-Hant':{
    label:'地理痕跡示範',eyebrow:'痕跡 · 空間定錨',title:'地理定位與路線',
    intro:'這是地圖模組展示；地點為板橋一帶的示例，並非你的 Galaxy 打卡紀錄。',
    controls:'地圖操作',all:'全部定錨點',examples:'查看示例地點',resizeHint:'桌機可拖曳地圖右下角調整寬度與高度。',hide:'隱藏路線',show:'展示道路路線',busy:'規劃路線中…',
    map:'可縮放、旋轉、傾斜的板橋地圖示範',
    note:'紫色立體柱是空間定錨示例，不代表真實建物或資料量。道路線僅為路網建議，不代表實際歷史行程。底圖採用 OpenFreeMap／OpenStreetMap，規劃示例路線時使用公開 OSRM 測試服務。',
    status:{
      loading:'正在啟動地理底圖…',ready:'已顯示真實地理位置的立體定錨點；座標及高度為展示用。',
      mapError:'底圖可能暫時無法載入，請確認網路與地圖服務。',
      moduleError:'MapLibre 模組載入失敗，請檢查連線。',
      initError:'無法啟動 3D 地圖；請檢查瀏覽器 WebGL 與網路連線。',
      routeHidden:'已隱藏路線，保留空間定錨點。',
      routeLoading:'正在讀取示例路網路線…',
      routeReady:'橘線是路網建議路線，不代表使用者曾走過或造訪。',
      routeError:'暫時無法取得路網路線；未顯示虛構道路。',
      locationPicked:'已選取位置，座標已自動填入上方欄位；也可以拖動橘色圖釘微調。'
    }
  },
  'zh-Hans':{
    label:'地理痕迹演示',eyebrow:'痕迹 · 空间定锚',title:'地理定位与路线',
    intro:'这是地图模块演示；地点为板桥一带的示例，并非你的 Galaxy 打卡记录。',
    controls:'地图操作',all:'全部定锚点',examples:'查看示例地点',resizeHint:'在电脑上可拖动地图右下角调整宽度和高度。',hide:'隐藏路线',show:'演示道路路线',busy:'正在规划路线…',
    map:'可缩放、旋转、倾斜的板桥地图演示',
    note:'紫色立体柱为空间定锚示例，不代表真实建筑物或数据量。路线仅为道路规划建议，不代表实际历史行程。底图来自 OpenFreeMap／OpenStreetMap，规划示例路线时使用公开 OSRM 测试服务。',
    status:{
      loading:'正在启动地理底图…',ready:'已显示真实地理位置的立体定锚点；坐标及高度仅用于展示。',
      mapError:'地图可能暂时无法加载，请确认网络与地图服务。',
      moduleError:'MapLibre 模块加载失败，请检查网络。',
      initError:'无法启动 3D 地图；请检查浏览器 WebGL 与网络。',
      routeHidden:'已隐藏路线，保留空间定锚点。',
      routeLoading:'正在获取示例道路路线…',
      routeReady:'橙线是道路规划建议，不代表真实走过的路线。',
      routeError:'暂时无法获取道路路线；不会显示虚构道路。',
      locationPicked:'已选取位置，坐标已自动填写；也可以拖动橙色图钉微调。'
    }
  },
  en:{
    label:'Geographic traces demonstration',eyebrow:'Traces · Spatial anchors',title:'Places and routes',
    intro:'Map demonstration with sample locations around Banqiao. These are not your Galaxy check-ins.',
    controls:'Map controls',all:'All anchors',examples:'Show sample places',resizeHint:'On desktop, drag the bottom-right corner to resize the map.',hide:'Hide route',show:'Plan sample road route',busy:'Planning route…',
    map:'Interactive tiltable map of Banqiao',
    note:'Purple 3D pillars represent sample anchors, not buildings or data volume. The line is a proposed road route, not a recorded trip. Tiles: OpenFreeMap / OpenStreetMap; example route: public OSRM test server.',
    status:{
      loading:'Starting the map…',ready:'3D sample anchors are visible at real-world locations; their heights and coordinates are illustrative.',
      mapError:'Map tiles may be unavailable. Check your network connection.',
      moduleError:'MapLibre could not load. Check your network.',
      initError:'Unable to start the 3D map. Check WebGL support and connectivity.',
      routeHidden:'Route hidden; sample anchors remain.',
      routeLoading:'Finding a sample road route…',
      routeReady:'The orange line is a suggested road route, not a recorded journey.',
      routeError:'Road routing is currently unavailable. No invented road was drawn.',
      locationPicked:'Location selected. Coordinates filled above. Drag the orange pin to adjust.'
    }
  },
  ja:{
    label:'地理的な軌跡のデモ',eyebrow:'軌跡 · 空間アンカー',title:'場所とルート',
    intro:'板橋周辺の地点を使った地図デモです。Galaxy の実際のチェックイン履歴ではありません。',
    controls:'地図操作',all:'すべてのアンカー',examples:'サンプル地点を表示',resizeHint:'デスクトップでは地図の右下隅をドラッグしてサイズを変更できます。',hide:'ルートを隠す',show:'道路ルートを表示',busy:'ルート計算中…',
    map:'板橋周辺の傾斜・回転・拡大可能な地図',
    note:'紫色の立体柱はアンカーの例であり、建物や記録件数を表しません。線は推奨道路ルートで、実際の移動履歴ではありません。地図は OpenFreeMap / OpenStreetMap、ルート計算は公開 OSRM テストサービスを使用します。',
    status:{
      loading:'地図を起動しています…',ready:'実際の地理座標にサンプルの3Dアンカーを表示しました。高さと座標はデモ用です。',
      mapError:'地図の読み込みに問題があります。通信状況をご確認ください。',
      moduleError:'MapLibre を読み込めませんでした。通信をご確認ください。',
      initError:'3D 地図を起動できません。WebGL と通信状況をご確認ください。',
      routeHidden:'ルートを非表示にしました。',
      routeLoading:'サンプル道路ルートを取得しています…',
      routeReady:'オレンジの線は推奨道路ルートで、実際の移動記録ではありません。',
      routeError:'道路ルートを取得できません。架空の道路は表示しません。',
      locationPicked:'位置を選択しました。座標は自動入力済みです。オレンジ色のピンをドラッグして調整できます。'
    }
  }
};

export default function TraceMap({onLocationPick=null,onAnchorSelect=null,radiusMeters=500,focusLocation=null,spatialData=null}){
  const {locale}=useUiLocale();
  const copy=STRINGS[locale]||STRINGS['zh-Hant'];
  const geo=SEARCH_UI[locale]||SEARCH_UI['zh-Hant'];
  const containerRef=useRef(null);
  const mapRef=useRef(null);
  const resizeStartRef=useRef(null);
  const locationPickRef=useRef(onLocationPick);
  locationPickRef.current=onLocationPick;
  const anchorSelectRef=useRef(onAnchorSelect);
  anchorSelectRef.current=onAnchorSelect;
  const selectingLocation=typeof onLocationPick==='function';
  const [ready,setReady]=useState(false);
  const [routeVisible,setRouteVisible]=useState(false);
  const [routeBusy,setRouteBusy]=useState(false);
  const [selected,setSelected]=useState('');
  const [status,setStatus]=useState('loading');
  const [placeQuery,setPlaceQuery]=useState('');
  const [matches,setMatches]=useState([]);
  const [searching,setSearching]=useState(false);
  const [lookupError,setLookupError]=useState('');
  const [lookupDone,setLookupDone]=useState(false);
  const lookupId=useRef(0);

  // TraceMap itself is a client-only, lazily loaded feature chunk: MapLibre is
  // initialized exactly once per mount and cleaned up on navigation/unmount.
  // No CDN script, global namespace, or secondary lifecycle is needed.
  useEffect(()=>{
    let active=true;
    let instance=null;
    try{
      instance=createTraceMap(containerRef.current,{
        radiusMeters,
        anchors:spatialData?.anchors||[],
        onSelect:id=>{if(active)setSelected(id);},
        onAnchorSelect:!selectingLocation?anchor=>{if(active)anchorSelectRef.current?.(anchor);}:null,
        onLocationPick:selectingLocation?coords=>{if(active)locationPickRef.current?.(coords);}:null,
        onStatus:code=>{
          if(!active)return;
          setStatus(code);
          if(code==='ready')setReady(true);
        }
      });
      mapRef.current=instance;
    }catch{
      if(active)setStatus('initError');
    }
    return ()=>{
      active=false;
      instance?.destroy();
      if(mapRef.current===instance)mapRef.current=null;
    };
  },[]);

  // MapLibre must remeasure its WebGL canvas whenever the CSS resize handle
  // changes the element box, not only when the browser window resizes.
  useEffect(()=>{
    if(typeof ResizeObserver==='undefined'||!containerRef.current)return;
    const observer=new ResizeObserver(()=>mapRef.current?.resize());
    observer.observe(containerRef.current);
    return()=>observer.disconnect();
  },[]);

  useEffect(()=>{mapRef.current?.setRadius(radiusMeters);},[radiusMeters]);
  useEffect(()=>{mapRef.current?.setAnchors(spatialData?.anchors||[]);},[spatialData]);
  useEffect(()=>{
    if(ready&&focusLocation)mapRef.current?.focusCoordinates(focusLocation);
  },[ready,focusLocation]);
  // The visible resize grip lives outside MapLibre's canvas and controls, so
  // its pointer events do not conflict with map pan/rotate or attribution.
  function resizeFrame(width,height){
    const frame=containerRef.current;
    if(!frame)return;
    const availableWidth=frame.parentElement?.clientWidth||frame.clientWidth;
    frame.style.width=Math.min(availableWidth,Math.max(320,width))+'px';
    frame.style.height=Math.min(Math.max(360,window.innerHeight*.95),Math.max(340,height))+'px';
  }
  function startMapResize(event){
    if(event.button!==0||!containerRef.current)return;
    const rect=containerRef.current.getBoundingClientRect();
    resizeStartRef.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,w:rect.width,h:rect.height};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function moveMapResize(event){
    const start=resizeStartRef.current;
    if(!start||start.pointerId!==event.pointerId)return;
    resizeFrame(start.w+event.clientX-start.x,start.h+event.clientY-start.y);
  }
  function stopMapResize(event){
    if(resizeStartRef.current?.pointerId===event.pointerId)resizeStartRef.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboardMapResize(event){
    const deltas={ArrowLeft:[-32,0],ArrowRight:[32,0],ArrowUp:[0,-32],ArrowDown:[0,32]};
    const delta=deltas[event.key];
    if(!delta||!containerRef.current)return;
    event.preventDefault();
    const bounds=containerRef.current.getBoundingClientRect();
    const step=event.shiftKey?2:1;
    resizeFrame(bounds.width+delta[0]*step,bounds.height+delta[1]*step);
  }

  async function lookupPlace(event){
    event.preventDefault();
    if(searching)return;
    const id=++lookupId.current;
    setSearching(true);setLookupError('');setMatches([]);setLookupDone(false);
    try{
      const found=await searchTracePlaces(placeQuery);
      if(id===lookupId.current){setMatches(found);setLookupDone(true);}
    }catch(error){if(id===lookupId.current)setLookupError(String(error?.message||geo.failed));}
    finally{if(id===lookupId.current)setSearching(false);}
  }
  async function toggleRoute(){
    if(!mapRef.current||routeBusy)return;
    setRouteBusy(true);
    try{
      setRouteVisible(Boolean(await mapRef.current.showRoadRoute()));
    }finally{
      setRouteBusy(false);
    }
  }

  return <section className="loc-card loc-trace-panel" aria-label={copy.label}>
    <header className="loc-trace-intro">
      <div>
        <p className="loc-eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
      </div>
      <p className="scope-status">{selectingLocation?(
        locale==='zh-Hans'?'点击地图选择空间定锚点，或点击下方车站示例；经纬度将自动填写。':
        locale==='en'?'Click any map location or a sample station to fill in coordinates automatically.':
        locale==='ja'?'地図上の位置または駅の例をクリックすると、座標を自動入力します。':
        '直接點地圖選取空間定錨點，或點下方車站快捷位置；經緯度會自動填入。'
      ):(onAnchorSelect&&spatialData?.anchors?.length?
        '點擊地圖上的綠色空間定錨點，直接使用 LOC 搜尋查看該地點的文章列表；不必先懂經緯度。':copy.intro)}</p>
    </header>
    {!selectingLocation?<><form className="loc-trace-location-search" role="search" onSubmit={lookupPlace}>
      <label htmlFor="trace-geocode-query">{geo.label}</label>
      <input id="trace-geocode-query" type="search" minLength={2} maxLength={160}
        placeholder={geo.placeholder} value={placeQuery} onChange={e=>setPlaceQuery(e.target.value)}/>
      <button className="loc-button" type="submit" disabled={searching||placeQuery.trim().length<2}>{searching?'…':geo.find}</button>
    </form>
    {lookupError?<p role="alert" className="scope-status scope-error">{lookupError}</p>:null}
    {lookupDone&&!matches.length?<p role="status" className="scope-status">{geo.empty}</p>:null}
    {matches.length?<div className="loc-trace-location-results" role="group" aria-label={geo.label}>
      {matches.map((item,index)=><button type="button" className="loc-button" key={index}
        disabled={!ready} onClick={()=>mapRef.current?.focusCoordinates({...item,radius_m:radiusMeters})}>{item.label}</button>)}
    </div>:null}</>:null}
    {!selectingLocation&&onAnchorSelect&&spatialData?.anchors?.length?<div className="loc-trace-start-points" role="group" aria-label="從已有地點開始搜尋文章">
      <p className="scope-status">從這裡開始：點選已建立的地點，查看它的打卡文章。</p>
      {[...new Map(spatialData.anchors.filter(anchor=>anchor.trace_type==='anchor').map(anchor=>[anchor.source_scope+':'+anchor.title,anchor])).values()]
        .slice(0,12).map(anchor=><button className="loc-button" type="button"
          key={anchor.source_scope+':'+anchor.uid}
          onClick={()=>onAnchorSelect(anchor)}>{anchor.title} · 查看文章</button>)}
    </div>:null}
    <div className="loc-trace-controls" role="group" aria-label={copy.controls}>
      <button type="button" className="loc-button" onClick={()=>{mapRef.current?.overview();setSelected('');}} disabled={!ready}>
        {spatialData?.anchors?.some(anchor=>anchor.trace_type==='anchor'
          &&Number.isFinite(Number(anchor.longitude))&&Number.isFinite(Number(anchor.latitude)))
          ?copy.all:copy.examples}
      </button>
      {DEMO_PLACES.map(place=><button key={place.id} type="button" aria-pressed={selected===place.id}
        className="loc-button" onClick={()=>{setSelected(place.id);mapRef.current?.focus(place.id);}} disabled={!ready}>
        {place.name}
      </button>)}
      <button type="button" className="loc-button" aria-pressed={routeVisible}
        disabled={!ready||routeBusy} onClick={toggleRoute}>
        {routeBusy?copy.busy:routeVisible?copy.hide:copy.show}
      </button>
    </div>
    <div className="loc-trace-map-frame" ref={containerRef}
      role="application" aria-label={copy.map}/>
    <div className="loc-trace-resize-tools">
      <span className="scope-status loc-trace-resize-hint">{copy.resizeHint}</span>
      <button type="button" className="loc-trace-resize-grip"
        aria-label={copy.resizeHint} title={copy.resizeHint}
        onPointerDown={startMapResize} onPointerMove={moveMapResize}
        onPointerUp={stopMapResize} onPointerCancel={stopMapResize}
        onKeyDown={keyboardMapResize}>
        <span aria-hidden="true">◢</span>
      </button>
    </div>
    <p className="scope-status loc-trace-map-status" role="status" aria-live="polite">{copy.status[status]||copy.status.loading}</p>
    <p className="scope-status loc-trace-map-note">{copy.note}</p>
  </section>;
}
