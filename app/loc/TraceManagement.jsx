'use client';

import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import PopularSelect from './PopularSelect';
import {useEditDockForm} from '../modular/edit-dock';
import {useAsyncResource,useResourceCache} from './use-async-resource';
import {revalidateServerMetadata} from './scope-data';
import {
  TRACE_SCOPES,traceKey,traceAllAnchorsKey,
  readTraceData,addTraceAnchor,updateTraceAnchor,renameTraceAnchorTitles
} from '../modular/features/trace/trace-data';
import {reviewReorderedCoordinateNames} from '../modular/features/trace/trace-place-names.mjs';

const TraceRouteManager=dynamic(()=>import('./TraceRouteManager'),{
  loading:()=> <p className="scope-status" role="status">正在開啟路線／痕跡圖管理…</p>
});
const TraceOrganizer=dynamic(()=>import('./TraceOrganizer'),{
  loading:()=> <p className="scope-status">正在載入地點名稱整理…</p>
});
const TraceMap=dynamic(()=>import('../modular/features/trace/TraceMap'),{
  ssr:false,loading:()=> <p className="scope-status">正在載入地圖…</p>
});

function AnchorEditor({scopeId,spatial,reload}){
  const cache=useResourceCache();
  const ownAnchors=useMemo(()=>(spatial.anchors||[]).filter(row=>row.source_scope===scopeId),
    [spatial.anchors,scopeId]);
  const [editingUid,setEditingUid]=useState('');
  const [standardTitles,setStandardTitles]=useState({});
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [postalAddress,setPostalAddress]=useState('');
  const [longitude,setLongitude]=useState('');
  const [latitude,setLatitude]=useState('');
  const [focusLocation,setFocusLocation]=useState(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [isError,setIsError]=useState(false);
  const options=useMemo(()=>ownAnchors.map(row=>({value:row.uid,label:row.title+' · '+row.uid})),[ownAnchors]);
  const renameGroups=useMemo(()=>reviewReorderedCoordinateNames(ownAnchors),[ownAnchors]);
  const dirty=Boolean(editingUid||title||description||postalAddress||longitude||latitude);
  const pickExisting=uid=>{
    const row=ownAnchors.find(item=>item.uid===uid);
    setEditingUid(row?.uid||'');
    setTitle(row?.title||'');
    setDescription(row?.description||'');
    setPostalAddress(row?.postal_address||'');
    setLongitude(row?.longitude==null?'':String(row.longitude));
    setLatitude(row?.latitude==null?'':String(row.latitude));
    if(row?.longitude!=null&&row?.latitude!=null)
      setFocusLocation({longitude:row.longitude,latitude:row.latitude,name:row.title});
  };
  const save=async()=>{
    if(scopeId==='loc'){
      setIsError(true);setNotice('LOC 空間聚合已暫停；請先在來源 Scope 編輯。');return false;
    }
    if(busy)return false;
    setBusy(true);setIsError(false);setNotice('');
    try{
      if(!title.trim())throw Error('請填入空間定錨點標題');
      const input={scopeId,title,description,address:postalAddress,longitude,latitude};
      const saved=editingUid
        ?await updateTraceAnchor({...input,uid:editingUid})
        :await addTraceAnchor(input);
      let refreshFailed=false;
      try{await reload();}catch{refreshFailed=true;}
      try{await revalidateServerMetadata();}catch{refreshFailed=true;}
      await Promise.allSettled([
        cache.invalidate({queryKey:traceAllAnchorsKey(scopeId)}),
        cache.invalidate({queryKey:['trace-map-index',scopeId]}),
        cache.invalidate({queryKey:['trace-current',scopeId]})
      ]);
      setEditingUid('');setTitle('');setDescription('');setPostalAddress('');
      setLongitude('');setLatitude('');
      setNotice('定錨點 '+saved.uid+' 已保存。'+(refreshFailed?'重新讀取未完成，請勿重複提交。':''));
      return true;
    }catch(e){setIsError(true);setNotice(String(e.message||e));return false;}
    finally{setBusy(false);}
  };
  const quickRename=async group=>{
    if(busy||scopeId==='loc')return;
    const canonicalTitle=standardTitles[group.key]||group.items[0]?.title||'';
    const change=group.items.filter(item=>item.title!==canonicalTitle);
    if(!change.length){setIsError(false);setNotice('這組地點名稱已相同，不需更新。');return;}
    setBusy(true);setIsError(false);setNotice('');
    try{
      const count=await renameTraceAnchorTitles({
        scopeId,uids:change.map(item=>item.uid),title:canonicalTitle
      });
      if(change.some(item=>item.uid===editingUid))setTitle(canonicalTitle);
      let refreshFailed=false;
      try{await reload();}catch{refreshFailed=true;}
      await Promise.allSettled([
        cache.invalidate({queryKey:traceAllAnchorsKey(scopeId)}),
        cache.invalidate({queryKey:traceKey(scopeId)}),
        cache.invalidate({queryKey:['trace-map-index',scopeId]})
      ]);
      setNotice('已快速更新 '+count+' 筆地點名稱，全部 UID、座標與原始紀錄保留。'
        +(refreshFailed?' 重新讀取未完成，請勿重複提交。':''));
    }catch(e){setIsError(true);setNotice(String(e.message||e));}
    finally{setBusy(false);}
  };
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy});
  return <section className="loc-card scope-feature-card loc-trace-anchor-editor">
    <h3>{editingUid?'編輯空間定錨點':'新增空間定錨點'}</h3>
    <p className="scope-status">地點名稱、文字說明與經緯度分開處理；經緯度儲存於 address Array，文字地址存 description.address。不使用縣市分類、周圍半徑或付費地理查詢。</p>
    <label>編輯既有地點（直接搜尋標題）
      <PopularSelect scopeId={scopeId} kind="space" instanceId={'trace-anchor-edit-'+scopeId} inputId={'trace-anchor-edit-'+scopeId}
        options={options} isClearable value={options.find(o=>o.value===editingUid)||null}
        onChange={choice=>pickExisting(choice?.value||'')} isDisabled={busy}
        placeholder="搜尋標題，或留空新增" classNamePrefix="loc-react-select"/>
    </label>
    <details className="scope-card loc-trace-quick-update">
      <summary>快速更新｜相同位置、名稱排列不同（{renameGroups.length} 組）</summary>
      <p className="scope-status">只列出同一 Scope、完全相同的經緯度，以及名稱字元相同但排列不同的地點。僅更新標題；保留每個 UID、座標、文章引用和路線，不會合併或刪除紀錄。</p>
      {!renameGroups.length?<p className="scope-status">目前沒有符合條件的名稱排列候選；沒有座標的地點不會猜測為同一位置。</p>:null}
      {renameGroups.slice(0,80).map(group=>{
        const names=[...new Set(group.items.map(item=>item.title))];
        const selected=standardTitles[group.key]||group.items[0].title;
        const updateCount=group.items.filter(item=>item.title!==selected).length;
        return <div key={group.key} className="loc-trace-quick-update-group">
          <p><strong>相同座標：</strong>{group.position.join(', ')} · {group.items.length} 筆</p>
          <p className="scope-status">{group.items.map(item=>item.title+'（'+item.uid+'）').join('、')}</p>
          <label>選擇統一名稱
            <select value={selected} onChange={event=>setStandardTitles(current=>({
              ...current,[group.key]:event.target.value
            }))} disabled={busy}>
              {names.map(name=><option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <button type="button" className="loc-button primary" disabled={busy||!updateCount||scopeId==='loc'}
            onClick={()=>quickRename(group)}>{busy?'更新中…':'快速更新 '+updateCount+' 筆名稱'}</button>
        </div>;
      })}
      {renameGroups.length>80?<p className="scope-status">目前顯示前 80 組，整理後會載入下一批。</p>:null}
    </details>
    <div className="scope-management-fields">
      <label>地點標題<input maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}
        disabled={busy} placeholder="空間定錨點名稱"/></label>
      <label>文字地址（非必填）<input maxLength={320} value={postalAddress}
        onChange={e=>setPostalAddress(e.target.value)} disabled={busy}/></label>
      <label className="loc-trace-description-field">說明<textarea rows={6} maxLength={2000} value={description}
        onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
      <label>經度（可留空）<input type="number" min={-180} max={180} step="any"
        value={longitude} onChange={e=>setLongitude(e.target.value)} disabled={busy}/></label>
      <label>緯度（可留空）<input type="number" min={-90} max={90} step="any"
        value={latitude} onChange={e=>setLatitude(e.target.value)} disabled={busy}/></label>
      <button className="loc-button primary" type="button" disabled={busy||!title.trim()} onClick={save}>
        {busy?'儲存中…':'儲存地點'}
      </button>
    </div>
    {notice?<p role={isError?'alert':'status'} className={'scope-status'+(isError?' scope-error':'')}>{notice}</p>:null}
    <TraceMap spatialData={spatial} focusLocation={focusLocation}
      onLocationPick={({lng,lat,name})=>{
        if(name)setTitle(t=>t.trim()||name);
        setLongitude(String(Math.round(lng*1e6)/1e6));
        setLatitude(String(Math.round(lat*1e6)/1e6));
      }}/>
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
  if(query.isPending)return <p className="scope-status" role="status">正在載入空間定錨點…</p>;
  if(query.error)return <p role="alert" className="scope-status scope-error">{String(query.error.message||query.error)}</p>;
  const spatial=query.data||{anchors:[],maps:[]};
  return mode==='cleanup'
    ?<TraceOrganizer key={scopeId+'-cleanup'} scopeId={scopeId} spatial={spatial} reload={()=>query.mutate()}/>
    :<AnchorEditor key={scopeId+'-anchor'} scopeId={scopeId} spatial={spatial} reload={()=>query.mutate()}/>;
}
