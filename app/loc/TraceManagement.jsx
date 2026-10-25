'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import {useEditDockForm} from '../modular/edit-dock';
import {useAsyncResource} from './use-async-resource';
import {dbAuthClient} from './db-client.mjs';
import {
  TRACE_SCOPES,traceKey,readTraceData,addTraceAnchor,updateTraceAnchor,addTraceMap,validCoordinates
} from '../modular/features/trace/trace-data';

const TraceMap=dynamic(()=>import('../modular/features/trace/TraceMap'),{
  ssr:false,loading:()=> <p className="scope-status" role="status">正在開啟空間定錨地圖…</p>
});

function AnchorEditor({scopeId,spatial,reload}){
  const ownAnchors=spatial.anchors.filter(row=>row.source_scope===scopeId);
  const [editingUid,setEditingUid]=useState('');
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [longitude,setLongitude]=useState('');
  const [latitude,setLatitude]=useState('');
  const [radius,setRadius]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const dirty=Boolean(editingUid||title||description||longitude||latitude||radius);
  const pickExisting=uid=>{
    const anchor=ownAnchors.find(row=>row.uid===uid);
    setEditingUid(anchor?.uid||'');
    setTitle(anchor?.title||'');
    setDescription(anchor?.description||'');
    setLongitude(anchor?.longitude==null?'':String(anchor.longitude));
    setLatitude(anchor?.latitude==null?'':String(anchor.latitude));
    setRadius(anchor?.radius_m==null?'500':String(anchor.radius_m));
    setNotice('');
  };
  const popular=useAsyncResource(['trace-place-names',scopeId],async()=>{
    const {data,error}=await dbAuthClient.schema('silver').rpc('trace_place_suggestions',{
      p_scope_id:scopeId,p_limit:50
    });
    if(error)throw new Error(error.message||'打卡名稱讀取失敗');
    return data||[];
  },{enabled:scopeId!=='loc',revalidateOnFocus:false,revalidateOnReconnect:false});
  const save=async()=>{
    if(busy)return false;
    setBusy(true);setNotice('');
    try{
      if(!editingUid&&ownAnchors.some(row=>String(row.title||'').trim()===title.trim())){
        throw new Error('已有同名空間定錨點，請先從上方選擇編輯既有紀錄，避免重複建立。');
      }
      if(editingUid)await updateTraceAnchor({scopeId,uid:editingUid,title,description,longitude,latitude,radius_m:radius||500});
      else await addTraceAnchor({scopeId,title,description,longitude,latitude,radius_m:radius||500});
      await reload();
      setEditingUid('');
      setTitle('');setDescription('');setLongitude('');setLatitude('');setRadius('');
      setNotice(editingUid?'空間定錨點已更新。':'空間定錨點已儲存。');
      return true;
    }catch(error){setNotice(String(error?.message||'新增空間定錨點失敗。'));return false;}
    finally{setBusy(false);}
  };
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy});
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
    <p className="scope-status">請直接在地圖上點選位置（或點車站快捷位置），經緯度會自動填入；橘色圖釘可拖曳調整。不會修改 Galaxy 打卡欄位。</p>
    <div className="scope-management-fields">
      <label>空間定錨點名稱<input type="text" maxLength={120} list={'trace-place-'+scopeId}
        value={title} onChange={e=>setTitle(e.target.value)}
        placeholder="選既有 Facebook 打卡名稱，或自行輸入" disabled={busy}/>
        <datalist id={'trace-place-'+scopeId}>
          {(popular.data||[]).map(item=><option key={item.name} value={item.name}/>)}
        </datalist>
      </label>
      <label>說明<textarea maxLength={2000} rows={2} value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
      <label>經度<input type="number" min={-180} max={180} step="any" value={longitude} onChange={e=>setLongitude(e.target.value)} disabled={busy}/></label>
      <label>緯度<input type="number" min={-90} max={90} step="any" value={latitude} onChange={e=>setLatitude(e.target.value)} disabled={busy}/></label>
      <label>周圍搜尋半徑（公尺）<input type="number" min={10} max={20000000} step={10} value={radius} placeholder="500" onChange={e=>setRadius(e.target.value)} disabled={busy}/></label>
    </div>
    {popular.data?.length?<div className="scope-stat-controls" role="group" aria-label="常用打卡地點名稱">
      <p className="scope-status">常用 Facebook 打卡名稱（沿用原字串，座標請在地圖確認）：</p>
      {popular.data.slice(0,10).map(item=><button className="loc-button" type="button"
        key={item.name} disabled={busy} onClick={()=>setTitle(item.name)}>
        {item.name}（{item.article_count}）
      </button>)}
    </div>:null}
    {popular.error?<p role="status" className="scope-status scope-error">
      打卡名稱讀取失敗：{String(popular.error.message||popular.error)}
    </p>:null}
    <TraceMap spatialData={spatial} onLocationPick={({lng,lat,name})=>{
      if(name)setTitle(current=>current.trim()?current:name);
      setLongitude(String(Math.round(lng*1e6)/1e6));
      setLatitude(String(Math.round(lat*1e6)/1e6));
    }}/>
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}

function MapEditor({scopeId,spatial,reload}){
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [selected,setSelected]=useState([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const anchors=spatial.anchors.filter(row=>row.source_scope===scopeId);
  const dirty=Boolean(title||description||selected.length);
  const save=async()=>{
    if(busy)return false;
    setBusy(true);setNotice('');
    try{
      await addTraceMap({scopeId,title,description,anchorUids:selected,anchors});
      await reload();
      setTitle('');setDescription('');setSelected([]);
      setNotice('痕跡圖已儲存，並保留所選空間定錨點的連接順序。');
      return true;
    }catch(error){setNotice(String(error?.message||'新增痕跡圖失敗。'));return false;}
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
  return <section className="loc-card scope-feature-card">
    <h3>新增痕跡圖</h3>
    <p className="scope-status">從本 Scope 的空間定錨點選出至少兩處，依顯示順序連成痕跡圖。LOC Group 讀取其他 Scope 的痕跡圖，但不會把它們複製進 LOC。</p>
    <div className="scope-management-fields">
      <label>痕跡圖名稱<input maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy}/></label>
      <label>說明<textarea maxLength={2000} rows={2} value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
    </div>
    <div className="loc-trace-anchor-choices" role="group" aria-label="選擇空間定錨點">
      {anchors.map(anchor=><label key={anchor.uid}>
        <input type="checkbox" disabled={busy} checked={selected.includes(anchor.uid)}
          onChange={e=>setSelected(ids=>e.target.checked?[...ids,anchor.uid]:ids.filter(uid=>uid!==anchor.uid))}/>
        <span>{anchor.title}</span>
      </label>)}
      {!anchors.length?<p className="scope-status">目前沒有空間定錨點，請先新增空間定錨點。</p>:null}
    </div>
    <h4>連接順序</h4>
    <ol className="loc-trace-selection-order">
      {selected.map((uid,index)=>{
        const item=anchors.find(row=>row.uid===uid);
        return <li key={uid}>
          <span>{item?.title||uid}</span>
          <button className="loc-button" type="button" disabled={busy||index===0} onClick={()=>shift(index,-1)} aria-label={'將'+(item?.title||uid)+'上移'}>↑</button>
          <button className="loc-button" type="button" disabled={busy||index===selected.length-1} onClick={()=>shift(index,1)} aria-label={'將'+(item?.title||uid)+'下移'}>↓</button>
        </li>;
      })}
    </ol>
    <div className="scope-stat-controls"><button type="button" className="loc-button primary" disabled={busy||!title.trim()||selected.length<2} onClick={save}>新增痕跡圖</button></div>
    {notice?<p role="status" className="scope-status">{notice}</p>:null}
  </section>;
}

// Embedded under the existing /manage (Scope) or /admin (LOC) routes.
// The parent manager owns authorization, edit mode and tab navigation.
export default function TraceManagementPanel({scopeId,mode='anchor'}){
  const enabled=TRACE_SCOPES.includes(scopeId);
  const query=useAsyncResource(traceKey(scopeId),()=>readTraceData(scopeId),{
    enabled,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  if(!enabled)return <p className="scope-status">此 Scope 尚未配置痕跡資料表。</p>;
  if(query.isPending)return <p className="scope-status" role="status">正在載入空間定錨點與痕跡圖…</p>;
  if(query.error)return <p role="alert" className="scope-status scope-error">{String(query.error.message||query.error)}</p>;
  const spatial=query.data||{anchors:[],maps:[]};
  return mode==='map'
    ?<MapEditor key={scopeId+'-map'} scopeId={scopeId} spatial={spatial} reload={()=>query.mutate()}/>
    :<AnchorEditor key={scopeId+'-anchor'} scopeId={scopeId} spatial={spatial} reload={()=>query.mutate()}/>;
}
