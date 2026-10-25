'use client';

import {useEffect,useRef,useState} from 'react';

const MODULE_SRC='/traces-map.mjs';
const MAP_CSS='https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.css';
const DEMO_PLACES=[
  {id:'banqiao',name:'板橋車站'},
  {id:'fuzhong',name:'府中站'},
  {id:'jiangzicui',name:'江子翠站'}
];

export default function TracesMap(){
  const containerRef=useRef(null);
  const mapRef=useRef(null);
  const [ready,setReady]=useState(false);
  const [routeVisible,setRouteVisible]=useState(false);
  const [routeBusy,setRouteBusy]=useState(false);
  const [status,setStatus]=useState('正在啟動地理底圖…');

  useEffect(()=>{
    let active=true;
    let insertedScript=null;
    let insertedStyles=null;
    const init=()=>{
      if(!active||!containerRef.current||!window.LOCTracesMapModule)return;
      if(mapRef.current)return;
      try{
        mapRef.current=window.LOCTracesMapModule.createTracesMap(containerRef.current,{
          onStatus:message=>{if(active)setStatus(message);}
        });
        setReady(true);
      }catch(error){
        setStatus('無法啟動 3D 地圖；請檢查瀏覽器 WebGL 與網路連線。');
      }
    };
    const existingStyles=document.querySelector('link[data-loc-traces-map-style]');
    if(!existingStyles){
      insertedStyles=document.createElement('link');
      insertedStyles.rel='stylesheet';
      insertedStyles.href=MAP_CSS;
      insertedStyles.dataset.locTracesMapStyle='1';
      document.head.appendChild(insertedStyles);
    }
    if(window.LOCTracesMapModule)init();
    else{
      insertedScript=document.createElement('script');
      insertedScript.type='module';
      insertedScript.src=MODULE_SRC;
      insertedScript.addEventListener('load',init,{once:true});
      insertedScript.addEventListener('error',()=>{if(active)setStatus('MapLibre 模組載入失敗，請檢查連線。')},{once:true});
      document.head.appendChild(insertedScript);
    }
    return ()=>{
      active=false;
      mapRef.current?.destroy();
      mapRef.current=null;
      if(insertedScript)insertedScript.remove();
      if(insertedStyles)insertedStyles.remove();
    };
  },[]);

  async function toggleRoute(){
    if(!mapRef.current||routeBusy)return;
    setRouteBusy(true);
    try{
      const visible=await mapRef.current.showRoadRoute();
      setRouteVisible(Boolean(visible));
    }finally{
      setRouteBusy(false);
    }
  }

  return <section className="loc-card loc-traces-panel" aria-label="地理痕跡示範">
    <header className="loc-traces-intro">
      <div>
        <p className="loc-eyebrow">痕跡 · 空間定錨</p>
        <h2>地理定位與路線</h2>
      </div>
      <p className="scope-status">這是地圖模組展示；地點為板橋一帶的示例，並非你的 Galaxy 打卡紀錄。</p>
    </header>
    <div className="loc-traces-controls" aria-label="地圖操作">
      <button type="button" className="loc-button" onClick={()=>mapRef.current?.overview()} disabled={!ready}>全部定錨點</button>
      {DEMO_PLACES.map(place=><button key={place.id} type="button"
        className="loc-button" onClick={()=>mapRef.current?.focus(place.id)} disabled={!ready}>
        {place.name}
      </button>)}
      <button type="button" className="loc-button" aria-pressed={routeVisible}
        disabled={!ready||routeBusy} onClick={toggleRoute}>
        {routeBusy?'規劃路線中…':routeVisible?'隱藏路線':'展示道路路線'}
      </button>
    </div>
    <div className="loc-traces-map-frame" ref={containerRef}
      role="application" aria-label="可縮放、旋轉、傾斜的板橋地圖示範"/>
    <p className="scope-status loc-traces-map-status" role="status" aria-live="polite">{status}</p>
    <p className="scope-status loc-traces-map-note">
      紫色立體柱是空間定錨示例，不代表真實建物或資料量。道路線僅為路網建議，不代表實際歷史行程。
      底圖採用 OpenFreeMap／OpenStreetMap，規劃示例路線時使用公開 OSRM 測試服務。
    </p>
  </section>;
}
