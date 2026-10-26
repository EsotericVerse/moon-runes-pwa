'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useEditDockForm} from '../modular/edit-dock';
const TraceRouteManager=dynamic(()=>import('./TraceRouteManager'),{
  loading:()=> <p className="scope-status" role="status">正在開啟痕跡圖管理…</p>
});
import {useAsyncResource,useResourceCache} from './use-async-resource';
import {revalidateServerMetadata} from './scope-data';
import {dbAuthClient} from './db-client.mjs';
import {searchTracePlaces,exactTracePlaceMatch} from '../modular/features/trace/trace-geocoding';
import {findAnchorWriteMatches} from '../modular/features/trace/trace-organizer.mjs';
import {
  TRACE_SCOPES,traceKey,traceAllAnchorsKey,
  readTraceData,addTraceAnchor,updateTraceAnchor,validCoordinates
} from '../modular/features/trace/trace-data';

const TraceOrganizer=dynamic(()=>import('./TraceOrganizer'),{loading:()=> <p className="scope-status">正在整理空間定錨點…</p>});

const TraceMap=dynamic(()=>import('../modular/features/trace/TraceMap'),{
  ssr:false,loading:()=> <p className="scope-status" role="status">正在開啟空間定錨地圖…</p>
});

function AnchorEditor({scopeId,spatial,reload}){
  const cache=useResourceCache();
  const ownAnchors=spatial.anchors.filter(row=>row.source_scope===scopeId);
  const [editingUid,setEditingUid]=useState('');
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [longitude,setLongitude]=useState('');
  const [latitude,setLatitude]=useState('');
  const [radius,setRadius]=useState('');
  const [focusLocation,setFocusLocation]=useState(null);
  const [quickCandidates,setQuickCandidates]=useState([]);
  const [quickBusy,setQuickBusy]=useState(false);
  const [quickNotice,setQuickNotice]=useState('');
  const quickRequest=useRef(0);
  useEffect(()=>()=>{quickRequest.current+=1;},[]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const dirty=Boolean(editingUid||title||description||longitude||latitude||radius);
  const duplicateCandidates=useMemo(()=>{
    if(!title.trim()||!validCoordinates(longitude,latitude))return [];
    return findAnchorWriteMatches({
      uid:'__incoming__',source_scope:scopeId,trace_type:'anchor',title,
      description,longitude,latitude
    },ownAnchors.filter(row=>row.uid!==editingUid));
  },[spatial.anchors,scopeId,editingUid,title,description,longitude,latitude]);
  const closeCandidates=duplicateCandidates.filter(item=>
    item.type==='near-unverified'||item.type==='same-address'
    ||item.type==='address-coordinate-conflict'||item.type==='same-name-different-location');
  const pickExisting=uid=>{
    quickRequest.current+=1;
    setQuickBusy(false);setQuickCandidates([]);setQuickNotice('');
    const anchor=ownAnchors.find(row=>row.uid===uid);
    setEditingUid(anchor?.uid||'');
    setTitle(anchor?.title||'');
    setDescription(anchor?.description||'');
    setLongitude(anchor?.longitude==null?'':String(anchor.longitude));
    setLatitude(anchor?.latitude==null?'':String(anchor.latitude));
    setRadius(anchor?.radius_m==null?'500':String(anchor.radius_m));
    if(anchor?.longitude!=null&&anchor?.latitude!=null)setFocusLocation({longitude:anchor.longitude,latitude:anchor.latitude,name:anchor.title,radius_m:anchor.radius_m||500});
    setNotice('');
  };
  const popular=useAsyncResource(['trace-place-names',scopeId,500],async()=>{
    const {data,error}=await dbAuthClient.schema('silver').rpc('trace_place_suggestions',{
      p_scope_id:scopeId,p_limit:500
    });
    if(error)throw new Error(error.message||'打卡名稱讀取失敗');
    return data||[];
  },{enabled:scopeId!=='loc',revalidateOnFocus:false,revalidateOnReconnect:false});
  const applyQuickPlace=(candidate,query=title.trim())=>{
    const lng=Number(candidate.longitude),lat=Number(candidate.latitude);
    if(!Number.isFinite(lng)||!Number.isFinite(lat))return;
    setLongitude(String(Math.round(lng*1e6)/1e6));
    setLatitude(String(Math.round(lat*1e6)/1e6));
    setFocusLocation({longitude:lng,latitude:lat,name:query,radius_m:Number(radius)||500});
    setQuickCandidates([]);
    setQuickNotice('已快速移至「'+candidate.label+'」，座標已填入；請核對位置後再儲存。');
  };
  const quickLocate=async()=>{
    const query=title.trim();
    if(busy||quickBusy||query.length<2)return;
    const request=++quickRequest.current;
    setQuickBusy(true);setQuickCandidates([]);setQuickNotice('');
    try{
      const found=await searchTracePlaces(query);
      if(quickRequest.current!==request)return;
      if(!found.length){
        setQuickNotice('找不到「'+query+'」，請換個地名或直接點選地圖。');
      }else if(found.length===1&&exactTracePlaceMatch(query,found[0])){
        applyQuickPlace(found[0],query);
      }else{
        setQuickCandidates(found);
        setQuickNotice('請選擇正確地點；不會自動採用不確定的搜尋結果。');
      }
    }catch(error){
      if(quickRequest.current===request)setQuickNotice('快速定位失敗：'+String(error?.message||error));
    }finally{
      if(quickRequest.current===request)setQuickBusy(false);
    }
  };
  const save=async()=>{
    if(busy||quickBusy)return false;
    setBusy(true);setNotice('');
    try{
      if(closeCandidates.some(item=>item.type==='near-unverified')&&!window.confirm(
        '附近已有位置接近、但尚未證明同址的定錨點。確定要保留為獨立地點？寫入後可至「整理空間定錨點」進一步核對。'
      ))return false;
      const saved=editingUid
        ?await updateTraceAnchor({scopeId,uid:editingUid,title,description,longitude,latitude,radius_m:radius||500})
        :await addTraceAnchor({scopeId,title,description,longitude,latitude,radius_m:radius||500});
      await reload();
      await revalidateServerMetadata();
      // The database write has already succeeded; a secondary cache
      // refresh failure must not invite a duplicate insert on retry.
      let anchorCacheSynced=true;
      try{
        await Promise.all([
          cache.invalidate({queryKey:['loc-place-summary',scopeId]}),
          cache.invalidate({queryKey:traceAllAnchorsKey(scopeId)}),
          cache.invalidate({queryKey:['trace-current',scopeId]})
        ]);
      }catch{anchorCacheSynced=false;}
      setEditingUid('');
      setTitle('');setDescription('');setLongitude('');setLatitude('');setRadius('');
      setNotice(editingUid?'空間定錨點已更新，已檢查重複位置。'
        :saved?.reused?'已沿用同址定錨點；未建立重複紀錄'+(saved.aliasAdded?'，並保留打卡別名「'+saved.aliasAdded+'」。':'。')
        :'空間定錨點已儲存，已完成新增前重複檢查。'
        +(anchorCacheSynced?'':'部分已開啟的痕跡快取可能需要重新整理。'));
      return true;
    }catch(error){setNotice(String(error?.message||'新增空間定錨點失敗。'));return false;}
    finally{setBusy(false);}
  };
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy||quickBusy});
  return <section className="loc-card scope-feature-card">
    <h3>{editingUid?'編輯空間定錨點':'新增空間定錨點'}</h3>
    {ownAnchors.length?<div className="scope-management-fields">
      <label>編輯既有空間定錨點（不需要重新新增）
        <select className="scope-select" value={editingUid} onChange={event=>pickExisting(event.target.value)} disabled={busy}>
          <option value="">新增新地點</option>
          {ownAnchors.map(anchor=><option key={anchor.uid} value={anchor.uid}>
            {anchor.title} · {anchor.latitude}, {anchor.longitude}
          </option>)}
        </select>
      </label>
    </div>:null}
    <p className="scope-status">輸入或選擇打卡地名後按「快速定位」，地圖會直接跳往候選位置；也可在地圖點選位置或拖曳圖釘調整。不會修改 Galaxy 打卡欄位。</p>
    <div className="scope-management-fields">
      <div className="loc-trace-quick-field">
        <label>空間定錨點名稱<input type="text" maxLength={120} list={'trace-place-'+scopeId}
          value={title} onChange={e=>{
            quickRequest.current+=1;
            setQuickBusy(false);setQuickCandidates([]);setQuickNotice('');
            setTitle(e.target.value);
          }}
          placeholder="選既有 Facebook 打卡名稱，或自行輸入" disabled={busy}/>
          <datalist id={'trace-place-'+scopeId}>
            {(popular.data||[]).map(item=><option key={item.name} value={item.name}/>)}
          </datalist>
        </label>
        <button className="loc-button" type="button" onClick={quickLocate}
          disabled={busy||quickBusy||title.trim().length<2}>
          {quickBusy?'定位中…':'快速定位'}
        </button>
      </div>
      <label>說明<textarea maxLength={2000} rows={2} value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
      <label>經度<input type="number" min={-180} max={180} step="any" value={longitude} onChange={e=>setLongitude(e.target.value)} disabled={busy}/></label>
      <label>緯度<input type="number" min={-90} max={90} step="any" value={latitude} onChange={e=>setLatitude(e.target.value)} disabled={busy}/></label>
      <label>周圍搜尋半徑（公尺）<input type="number" min={10} max={20000000} step={10} value={radius} placeholder="500" onChange={e=>setRadius(e.target.value)} disabled={busy}/></label>
    </div>
    {closeCandidates.length?<div className="scope-card" role="status">
      <strong>儲存前：附近／同址檢查（{closeCandidates.length} 組）</strong>
      {closeCandidates.slice(0,5).map(item=><p key={item.b.uid} className="scope-status">
        {item.b.title} · {item.meters??'未知'} 公尺 · {item.safeReuse
          ?'完整地址相同，儲存時沿用原定錨點'
          :item.type==='near-unverified'?'附近候選；需核對是否不同地點'
          :item.type==='address-coordinate-conflict'?'地址相同但座標衝突，需先整理'
          :'請確認是否為同一地點'}
      </p>)}
    </div>:null}
    {quickNotice?<p className="scope-status" role="status" aria-live="polite">{quickNotice}</p>:null}
    {quickCandidates.length?<div className="loc-trace-quick-results" role="group" aria-label="地點候選">
      {quickCandidates.map((candidate,index)=><button key={index} className="loc-button" type="button"
        disabled={busy||quickBusy} onClick={()=>applyQuickPlace(candidate)}>{candidate.label}</button>)}
    </div>:null}
    {popular.data?.length?<div className="scope-stat-controls" role="group" aria-label="常用打卡地點名稱">
      <p className="scope-status">常用 Facebook 打卡名稱（沿用原字串，座標請在地圖確認）：</p>
      {popular.data.slice(0,10).map(item=><button className="loc-button" type="button"
        key={item.name} disabled={busy} onClick={()=>{
          quickRequest.current+=1;
          setQuickBusy(false);setQuickCandidates([]);setQuickNotice('');
          setTitle(item.name);
        }}>
        {item.name}（{item.article_count}）
      </button>)}
    </div>:null}
    {popular.error?<p role="status" className="scope-status scope-error">
      打卡名稱讀取失敗：{String(popular.error.message||popular.error)}
    </p>:null}
    <TraceMap spatialData={spatial} radiusMeters={Number(radius)||500} focusLocation={focusLocation} onLocationPick={({lng,lat,name})=>{
      if(name)setTitle(current=>current.trim()?current:name);
      setLongitude(String(Math.round(lng*1e6)/1e6));
      setLatitude(String(Math.round(lat*1e6)/1e6));
    }}/>
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}

// Embedded under the existing /manage (Scope) or /admin (LOC) routes.
// The parent manager owns authorization, edit mode and tab navigation.
export default function TraceManagementPanel({scopeId,mode='anchor'}){
  const enabled=TRACE_SCOPES.includes(scopeId);
  const query=useAsyncResource(traceKey(scopeId),()=>readTraceData(scopeId),{
    enabled:enabled&&mode!=='map',revalidateOnFocus:false,revalidateOnReconnect:false
  });
  if(!enabled)return <p className="scope-status">此 Scope 尚未配置痕跡資料表。</p>;
  if(mode==='map')return <TraceRouteManager key={scopeId+'-map'} scopeId={scopeId}/>;
  if(query.isPending)return <p className="scope-status" role="status">正在載入空間定錨點與痕跡圖…</p>;
  if(query.error)return <p role="alert" className="scope-status scope-error">{String(query.error.message||query.error)}</p>;
  const spatial=query.data||{anchors:[],maps:[]};
  return mode==='cleanup'
    ?<TraceOrganizer key={scopeId+'-cleanup'} scopeId={scopeId} spatial={spatial} reload={()=>query.mutate()}/>
    :<AnchorEditor key={scopeId+'-anchor'} scopeId={scopeId} spatial={spatial} reload={()=>query.mutate()}/>;
}
