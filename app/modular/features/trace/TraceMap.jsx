'use client';

import {useEffect,useRef,useState} from 'react';
import {useUiLocale} from '../../../i18n/ui-locale';
import {createTraceMap} from './trace-map-engine';
import 'maplibre-gl/dist/maplibre-gl.css';
// Coordinates stay in the browser-only example module. These labels identify
// the same public sample anchors in each language; not Galaxy places.
const DEMO_PLACES=[
  {id:'banqiao',name:'板橋車站'},
  {id:'fuzhong',name:'府中站'},
  {id:'jiangzicui',name:'江子翠站'}
];

const STRINGS={
  'zh-Hant':{
    label:'地理痕跡示範',eyebrow:'痕跡 · 空間定錨',title:'地理定位與路線',
    intro:'這是地圖模組展示；地點為板橋一帶的示例，並非你的 Galaxy 打卡紀錄。',
    controls:'地圖操作',all:'全部定錨點',hide:'隱藏路線',show:'展示道路路線',busy:'規劃路線中…',
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
    controls:'地图操作',all:'全部定锚点',hide:'隐藏路线',show:'演示道路路线',busy:'正在规划路线…',
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
    controls:'Map controls',all:'All anchors',hide:'Hide route',show:'Plan sample road route',busy:'Planning route…',
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
    controls:'地図操作',all:'すべてのアンカー',hide:'ルートを隠す',show:'道路ルートを表示',busy:'ルート計算中…',
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

export default function TraceMap({onLocationPick=null}){
  const {locale}=useUiLocale();
  const copy=STRINGS[locale]||STRINGS['zh-Hant'];
  const containerRef=useRef(null);
  const mapRef=useRef(null);
  const locationPickRef=useRef(onLocationPick);
  locationPickRef.current=onLocationPick;
  const selectingLocation=typeof onLocationPick==='function';
  const [ready,setReady]=useState(false);
  const [routeVisible,setRouteVisible]=useState(false);
  const [routeBusy,setRouteBusy]=useState(false);
  const [selected,setSelected]=useState('');
  const [status,setStatus]=useState('loading');

  // TraceMap itself is a client-only, lazily loaded feature chunk: MapLibre is
  // initialized exactly once per mount and cleaned up on navigation/unmount.
  // No CDN script, global namespace, or secondary lifecycle is needed.
  useEffect(()=>{
    let active=true;
    let instance=null;
    try{
      instance=createTraceMap(containerRef.current,{
        onSelect:id=>{if(active)setSelected(id);},
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
      ):copy.intro}</p>
    </header>
    <div className="loc-trace-controls" role="group" aria-label={copy.controls}>
      <button type="button" className="loc-button" onClick={()=>{mapRef.current?.overview();setSelected('');}} disabled={!ready}>
        {copy.all}
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
    <p className="scope-status loc-trace-map-status" role="status" aria-live="polite">{copy.status[status]||copy.status.loading}</p>
    <p className="scope-status loc-trace-map-note">{copy.note}</p>
  </section>;
}
