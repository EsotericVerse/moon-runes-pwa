'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useEditDockForm} from '../modular/edit-dock';
import TraceRouteManager from './TraceRouteManager';
import {useAsyncResource,useResourceCache} from './use-async-resource';
import {revalidateServerMetadata} from './scope-data';
import {useAccount} from './use-account';
import {dbAuthClient} from './db-client.mjs';
import {searchTracePlaces,exactTracePlaceMatch} from '../modular/features/trace/trace-geocoding';
import {findAnchorWriteMatches} from '../modular/features/trace/trace-organizer.mjs';
import {groupTraceAnchorsByCountyId} from '../modular/features/trace/trace-spatial-classification.mjs';
import {traceCountyName} from '../modular/features/trace/trace-county-id.mjs';
import {traceAnchorSuggestions,traceAnchorCompletionUid} from '../modular/features/trace/trace-anchor-autocomplete.mjs';
import {readDefaultTraceRoute,setDefaultTraceRoute,clearDefaultTraceRoute,chooseDefaultTraceRoute} from '../modular/features/trace/trace-route-preference.mjs';
import {
  TRACE_SCOPES,traceKey,traceMapIndexKey,traceAllAnchorsKey,
  readTraceData,addTraceAnchor,updateTraceAnchor,
  addTraceMap,updateTraceMap,deleteTraceMap,validCoordinates
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

function MapEditor({scopeId,spatial,reload}){
  const account=useAccount();
  const cache=useResourceCache();
  // LOC is a READ union. The actual write table must be the selected source
  // Scope so the saved route refers to anchors it is authorized to own.
  const editableScopes=useMemo(()=>{
    if(scopeId!=='loc')return [scopeId];
    const sources=[...new Set([...spatial.anchors,...spatial.maps]
      .map(row=>String(row.source_scope||'').trim()))];
    return sources.filter(source=>source==='loc'
      ?account.canManageGroupSync('loc')
      :TRACE_SCOPES.includes(source)&&account.canManageScopeSync(source));
  },[scopeId,spatial.anchors,spatial.maps,account.canManageScopeSync,account.canManageGroupSync]);
  const [routeScopeId,setRouteScopeId]=useState('lo3rwang');
  const writeScopeId=scopeId==='loc'
    ?editableScopes.includes(routeScopeId)?routeScopeId:editableScopes[0]||''
    :scopeId;
  const anchors=useMemo(()=>spatial.anchors.filter(row=>row.source_scope===writeScopeId),
    [spatial.anchors,writeScopeId]);
  const maps=useMemo(()=>spatial.maps.filter(row=>row.source_scope===writeScopeId),
    [spatial.maps,writeScopeId]);
  const [preferredRouteUid,setPreferredRouteUid]=useState('');
  useEffect(()=>{setPreferredRouteUid(readDefaultTraceRoute(writeScopeId));},[writeScopeId]);
  const defaultRouteUid=chooseDefaultTraceRoute(maps,writeScopeId,preferredRouteUid)?.uid||'';
  const markDefault=map=>{
    if(busy||!setDefaultTraceRoute(map.source_scope,map.uid)){
      setNoticeError(true);setNotice('無法保存此瀏覽器的預設路線偏好。');return;
    }
    setPreferredRouteUid(map.uid);setNoticeError(false);
    setNotice('已將「'+map.title+'」設為此瀏覽器的預設痕跡圖。');
  };
  const anchorById=useMemo(()=>new Map(anchors.map(item=>[item.uid,item])),[anchors]);
  // The persisted county_id is the first-stage autocomplete filter.
  // No 139 kB county polygon lookup or thousands of <option> nodes at mount.
  const grouped=useMemo(()=>groupTraceAnchorsByCountyId(anchors),[anchors]);
  const counties=useMemo(()=>[...grouped.keys()].map(id=>({
    id,label:traceCountyName(id),count:grouped.get(id)?.length||0
  })),[grouped]);
  const [county,setCounty]=useState('');
  const [pointUid,setPointUid]=useState('');
  const [pointQuery,setPointQuery]=useState('');
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [selected,setSelected]=useState([]);
  const [editingUid,setEditingUid]=useState('');
  const [editorOpen,setEditorOpen]=useState(()=>!spatial.maps.length);
  const [expandedIds,setExpandedIds]=useState([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [noticeError,setNoticeError]=useState(false);
  const pendingSavedRef=useRef(null);
  const available=useMemo(()=>(grouped.get(county)||[]).filter(row=>!selected.includes(row.uid)),[grouped,county,selected]);
  const matches=useMemo(()=>
    traceAnchorSuggestions(available,county,pointQuery,selected,8),
  [available,county,pointQuery,selected]);
  // One unique match completes automatically; collisions require an explicit UID choice.
  const completionUid=traceAnchorCompletionUid(matches,pointUid);
  const dirty=editorOpen&&Boolean(editingUid||title||description||selected.length);
  const reset=()=>{
    setTitle('');setDescription('');setSelected([]);setEditingUid('');
    setCounty('');setPointUid('');setPointQuery('');
    pendingSavedRef.current=null;
  };
  const changeSource=source=>{
    if(source===writeScopeId||busy)return;
    if(dirty&&!window.confirm('切換作品範圍會放棄目前尚未儲存的路線佇列與文字，確定切換？'))return;
    reset();setRouteScopeId(source);setEditorOpen(false);
    setNotice('');setNoticeError(false);
  };
  const beginNew=()=>{
    if(dirty&&!window.confirm('放棄目前尚未儲存的路線修改，重新建立一張？'))return;
    reset();setEditorOpen(true);setNotice('');setNoticeError(false);
  };
  const edit=map=>{
    if(dirty&&!window.confirm('編輯其他路線會放棄目前未儲存的修改，確定切換？'))return;
    pendingSavedRef.current=null;
    if(scopeId==='loc')setRouteScopeId(map.source_scope);
    setEditingUid(map.uid);
    setTitle(String(map.title||''));
    setDescription(String(map.description||''));
    setSelected(Array.isArray(map.anchor_uids)?[...map.anchor_uids]:[]);
    setCounty('');setPointUid('');setPointQuery('');setEditorOpen(true);
    setNotice('');setNoticeError(false);
  };
  const save=async()=>{
    if(busy||!editorOpen)return false;
    setBusy(true);setNotice('');setNoticeError(false);
    try{
      if(!writeScopeId)throw Error('目前沒有可編輯的作品範圍。請先切換至具備管理權限的 Scope。');
      const input={scopeId:writeScopeId,title,description,anchorUids:selected,anchors};
      // If the insert succeeded but readback failed, never create a second
      // route on another Save click. The next click retries confirmation.
      let saved=pendingSavedRef.current;
      if(saved&&(saved.scopeId!==writeScopeId||saved.editUid!==editingUid))
        throw Error('上次寫入仍在確認中，請重新讀取頁面後檢查結果，避免重複新增。');
      if(!saved){
        const written=editingUid
          ?await updateTraceMap({...input,uid:editingUid})
          :await addTraceMap(input);
        if(!written?.uid)throw Error('寫入沒有回傳痕跡圖 UID，無法確認是否成功。');
        saved={uid:written.uid,scopeId:writeScopeId,editUid:editingUid};
        pendingSavedRef.current=saved;
      }
      const fresh=await reload();
      const confirmed=Array.isArray(fresh?.maps)?fresh.maps.find(row=>row.uid===saved.uid
        &&row.source_scope===writeScopeId):null;
      if(!confirmed||confirmed.title!==title.trim()
        ||String(confirmed.description||'')!==description.trim()
        ||JSON.stringify(confirmed.anchor_uids||[])!==JSON.stringify(selected))
        throw Error('已收到寫入回應，但重新讀取尚未確認完整路線；保留原本佇列，請勿重複新增，可再次按儲存重試確認。');
      const changed=Boolean(editingUid);
      setExpandedIds(ids=>ids.includes(saved.uid)?ids:[...ids,saved.uid]);
      reset();
      setEditorOpen(false);
      // Routes are read directly with SWR, not numeric ISR. Persistence is
      // already confirmed above; never report failure because a secondary
      // mounted public view could not refresh.
      let refreshOk=true;
      try{await Promise.all([...new Set(['loc',writeScopeId])].flatMap(id=>[
        cache.revalidate({queryKey:traceKey(id)}),
        cache.invalidate({queryKey:traceMapIndexKey(id)}),
        cache.invalidate({queryKey:['trace-current',id]})
      ]));}catch{refreshOk=false;}
      setNotice((changed?'痕跡圖已更新並重新讀取確認。':'已新增痕跡圖並重新讀取確認。')
        +(refreshOk?'':'其他已開啟的地圖可能需要重新整理。'));
      return true;
    }catch(error){
      setNoticeError(true);setNotice(String(error?.message||error));return false;
    }finally{setBusy(false);}
  };
  const remove=async map=>{
    if(busy||!window.confirm('確定要永久刪除「'+map.title+'」這張痕跡圖？只會刪除這張路線，不會刪除空間定錨點或文章。'))return;
    setBusy(true);setNotice('');setNoticeError(false);
    try{
      await deleteTraceMap({scopeId:map.source_scope,uid:map.uid});
      const fresh=await reload();
      if(!Array.isArray(fresh?.maps)||fresh.maps.some(row=>row.uid===map.uid
        &&row.source_scope===map.source_scope))
        throw Error('已收到刪除回應，但重新讀取仍顯示此路線。請勿重複操作。');
      if(readDefaultTraceRoute(map.source_scope)===map.uid){
        clearDefaultTraceRoute(map.source_scope,map.uid);
        setPreferredRouteUid('');
      }
      setExpandedIds(ids=>ids.filter(id=>id!==map.uid));
      if(editingUid===map.uid){reset();setEditorOpen(false);}
      let refreshOk=true;
      try{await Promise.all([...new Set(['loc',map.source_scope])].flatMap(id=>[
        cache.revalidate({queryKey:traceKey(id)}),
        cache.invalidate({queryKey:traceMapIndexKey(id)}),
        cache.invalidate({queryKey:['trace-current',id]})
      ]));}catch{refreshOk=false;}
      setNotice('已刪除該張痕跡圖並重新讀取確認；原始定錨點與文章均未刪除。'
        +(refreshOk?'':'其他已開啟的地圖可能需要重新整理。'));
    }catch(error){setNoticeError(true);setNotice(String(error?.message||error));}
    finally{setBusy(false);}
  };
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy});
  const shift=(index,delta)=>{
    const next=index+delta;
    if(next<0||next>=selected.length)return;
    setSelected(ids=>{
      const arr=[...ids];[arr[index],arr[next]]=[arr[next],arr[index]];return arr;
    });
  };
  const addToQueue=()=>{
    if(!completionUid||selected.includes(completionUid)||selected.length>=80)return;
    const anchor=anchorById.get(completionUid);
    if(!anchor||anchor.county_id!==county)return;
    setSelected(ids=>[...ids,completionUid]);
    setPointUid('');setPointQuery('');
  };
  const setAllExpanded=open=>setExpandedIds(open?maps.map(map=>map.uid):[]);
  return <section className="loc-card scope-feature-card loc-trace-map-manager">
    <header className="loc-trace-map-manager-heading">
      <div><h3>痕跡圖管理</h3>
        <p className="scope-status">每張痕跡圖是一條獨立路線，完整保存名稱、說明與站點順序；可建立多張。</p>
      </div>
      <button type="button" className="loc-button" disabled={busy||!writeScopeId}
        onClick={()=>editorOpen&& !editingUid ?setEditorOpen(false):beginNew()}>
        {editorOpen&&!editingUid?'收合新增表單':'新增一張痕跡圖'}
      </button>
    </header>
    {scopeId==='loc'?<div className="scope-management-fields">
      <label>可編輯的作品範圍
        <select className="scope-select" value={writeScopeId} disabled={busy||!editableScopes.length}
          onChange={event=>changeSource(event.target.value)}>
          {!editableScopes.length?<option value="">沒有可編輯的作品範圍</option>:null}
          {editableScopes.map(source=><option key={source} value={source}>
            {source==='lo3rwang'?'作者作品':source==='lrunes'?'月之符文':'LOC 自有錨點'}
          </option>)}
        </select>
      </label>
      <p className="scope-status">LOC 顯示跨 Scope 的定錨點，但路線必須寫回所選作品的原始 Scope。</p>
    </div>:null}
    {!writeScopeId?<p className="scope-status" role="status">這裡尚無有權管理且有資料的作品範圍，請先到對應作品頁建立空間定錨點。</p>:null}
    {maps.length?<div className="loc-trace-saved-maps">
      <div className="loc-trace-map-manager-heading">
        <h4>已儲存的痕跡圖（{maps.length}）</h4>
        <div className="scope-stat-controls">
          <button type="button" className="loc-button" onClick={()=>setAllExpanded(true)}>全部展開</button>
          <button type="button" className="loc-button" onClick={()=>setAllExpanded(false)}>全部收合</button>
        </div>
      </div>
      {maps.map(map=><div className="loc-trace-saved-map" key={map.uid}>
        <button type="button" className="loc-trace-saved-map-summary"
          aria-expanded={expandedIds.includes(map.uid)}
          aria-controls={'trace-map-details-'+map.source_scope+'-'+map.uid}
          onClick={()=>setExpandedIds(ids=>ids.includes(map.uid)
            ?ids.filter(id=>id!==map.uid):[...ids,map.uid])}>
          <span aria-hidden="true">{expandedIds.includes(map.uid)?'▾':'▸'}</span>
          <span>{map.title||'未命名痕跡圖'}</span>
          <span className="scope-status">{map.uid===defaultRouteUid?'預設 · ':''}{Array.isArray(map.anchor_uids)?map.anchor_uids.length:0} 站</span>
        </button>
        {expandedIds.includes(map.uid)?<div className="loc-trace-saved-map-body"
          id={'trace-map-details-'+map.source_scope+'-'+map.uid}>
          {map.description?<p className="loc-trace-route-description">{map.description}</p>:null}
          <ol className="loc-trace-selection-order">
            {(Array.isArray(map.anchor_uids)?map.anchor_uids:[]).map((uid,index)=>{
              const anchor=anchorById.get(uid);
              return <li key={uid+':'+index}><span>{anchor?.title||'原始定錨點 '+uid+'（目前無法對應）'}</span></li>;
            })}
          </ol>
          <div className="scope-stat-controls">
            <button type="button" className="loc-button" disabled={busy||map.uid===preferredRouteUid}
              aria-pressed={map.uid===preferredRouteUid} onClick={()=>markDefault(map)}>
              {map.uid===preferredRouteUid?'目前預設':map.uid===defaultRouteUid
                ?'固定為預設（目前自動）':'設為預設'}
            </button>
            <button type="button" className="loc-button" disabled={busy} onClick={()=>edit(map)}>編輯這張痕跡圖</button>
            <button type="button" className="loc-button" disabled={busy} onClick={()=>remove(map)}>刪除這張痕跡圖</button>
          </div>
        </div>:null}
      </div>)}
    </div>:<p className="scope-status">目前還沒有痕跡圖；可以建立第一條路線。</p>}
    {editorOpen?<form className="loc-trace-route-composer" onSubmit={event=>{event.preventDefault();save();}}>
      <h4>{editingUid?'編輯痕跡圖':'新增痕跡圖'}</h4>
      <div className="scope-management-fields">
        <label>痕跡圖名稱
          <input maxLength={120} value={title} onChange={event=>setTitle(event.target.value)}
            placeholder="例如：童年的南北旅程" disabled={busy} required/>
        </label>
        <label>路線故事／說明
          <textarea maxLength={2000} rows={3} value={description}
            onChange={event=>setDescription(event.target.value)} disabled={busy}/>
        </label>
      </div>
      <div className="loc-trace-route-pickers" role="group" aria-label="依縣市選取路線站點">
        <label>縣市
          <select className="scope-select" value={county} disabled={busy||!counties.length}
            onChange={event=>{setCounty(event.target.value);setPointUid('');setPointQuery('');}}>
            <option value="">請選擇縣市</option>
            {counties.map(item=><option key={item.id} value={item.id}>
              {item.label}（{item.count}）
            </option>)}
          </select>
        </label>
        <div className="loc-trace-route-autocomplete">
          <label htmlFor="trace-route-anchor-query">空間定錨點自動完成</label>
          <input id="trace-route-anchor-query" className="scope-select" type="search" autoComplete="off"
            role="combobox" aria-autocomplete="list"
            aria-expanded={Boolean(pointQuery.trim()&&matches.length)}
            aria-controls="trace-route-anchor-matches"
            placeholder={county?'輸入地點名稱、地址或 UID':'請先選縣市'}
            value={pointQuery} disabled={busy||!county||!available.length}
            onChange={event=>{setPointQuery(event.target.value);setPointUid('');}}/>
          {county&&pointQuery.trim()?<div id="trace-route-anchor-matches"
            className="loc-trace-route-suggestions" role="listbox" aria-label="符合的空間定錨點">
            {matches.length?matches.map(anchor=><button key={anchor.uid}
              type="button" className="loc-button" role="option"
              aria-selected={completionUid===anchor.uid}
              onClick={()=>{setPointUid(anchor.uid);setPointQuery(anchor.title);}}>
              <span>{anchor.title}</span>
              <small>UID {anchor.uid} · {Number(anchor.latitude).toFixed(4)}, {Number(anchor.longitude).toFixed(4)}</small>
            </button>):<span className="scope-status">此縣市沒有符合名稱的定錨點</span>}
            {matches.length===8?<span className="scope-status">只顯示前八筆；若有同名地點，可加上行政區、地址或 UID 繼續縮小範圍。</span>:null}
          </div>:null}
        </div>
        <button className="loc-button loc-trace-route-add" type="button"
          aria-label="將自動完成的定錨點 UID 加入路線佇列"
          title="加入路線佇列" disabled={busy||!completionUid||selected.length>=80}
          onClick={addToQueue}>＋</button>
      </div>
      <p className="scope-status">依儲存的縣市 ID 篩選既有定錨點，以 UID 加入路線；同名店可依座標與 UID 區分，歷史地點不合併。縣市未判定的地點可在「未判定／其他地區」找到。</p>
      {!anchors.length?<p className="scope-status">尚未建立空間定錨點；新增地點後即可排入路線。</p>:null}
      <h4>路線佇列（{selected.length}／80）</h4>
      {selected.length?<ol className="loc-trace-selection-order">
        {selected.map((uid,index)=>{
          const anchor=anchorById.get(uid);
          return <li key={uid}>
            <span>{anchor?.title||'原始定錨點 '+uid+'（目前無法對應）'}</span>
            <div className="loc-trace-route-queue-actions">
              <button className="loc-button" type="button" disabled={busy||index===0}
                onClick={()=>shift(index,-1)} aria-label={'將'+(anchor?.title||uid)+'上移'}>↑</button>
              <button className="loc-button" type="button" disabled={busy||index===selected.length-1}
                onClick={()=>shift(index,1)} aria-label={'將'+(anchor?.title||uid)+'下移'}>↓</button>
              <button className="loc-button" type="button" disabled={busy}
                onClick={()=>setSelected(ids=>ids.filter(id=>id!==uid))}
                aria-label={'從佇列移除'+(anchor?.title||uid)}>移除</button>
            </div>
          </li>;
        })}
      </ol>:<p className="scope-status">佇列尚無站點。請依序加入至少兩個地點。</p>}
      <div className="scope-stat-controls">
        <button type="submit" className="loc-button primary"
          disabled={busy||!writeScopeId||!title.trim()||selected.length<2||selected.length>80}>
          {busy?'儲存中…':editingUid?'儲存痕跡圖修改':'儲存新痕跡圖'}
        </button>
        <button type="button" className="loc-button" disabled={busy}
          onClick={()=>{reset();setEditorOpen(false);}}>取消並收合</button>
      </div>
    </form>:null}
    {notice?<p role={noticeError?'alert':'status'} className={'scope-status'+(noticeError?' scope-error':'')}>{notice}</p>:null}
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
