'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import {useEditDockForm} from '../modular/edit-dock';
import {useAsyncResource} from './use-async-resource';
import {
  TRACE_SCOPES,traceKey,readTraceData,addTraceAnchor,addTraceMap,validCoordinates
} from '../modular/features/trace/trace-data';

const TraceMap=dynamic(()=>import('../modular/features/trace/TraceMap'),{
  ssr:false,loading:()=> <p className="scope-status" role="status">正在開啟空間定錨地圖…</p>
});

function AnchorEditor({scopeId,spatial,reload}){
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [longitude,setLongitude]=useState('');
  const [latitude,setLatitude]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const dirty=Boolean(title||description||longitude||latitude);
  const save=async()=>{
    if(busy)return false;
    setBusy(true);setNotice('');
    try{
      await addTraceAnchor({scopeId,title,description,longitude,latitude});
      await reload();
      setTitle('');setDescription('');setLongitude('');setLatitude('');
      setNotice('空間定錨點已儲存。');
      return true;
    }catch(error){setNotice(String(error?.message||'新增空間定錨點失敗。'));return false;}
    finally{setBusy(false);}
  };
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy});
  return <section className="loc-card scope-feature-card">
    <h3>新增空間定錨點</h3>
    <p className="scope-status">請直接在地圖上點選位置（或點車站快捷位置），經緯度會自動填入；橘色圖釘可拖曳調整。不會修改 Galaxy 打卡欄位。</p>
    <div className="scope-management-fields">
      <label>空間定錨點名稱<input type="text" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：起點" disabled={busy}/></label>
      <label>說明<textarea maxLength={2000} rows={2} value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
      <label>經度<input type="number" min={-180} max={180} step="any" value={longitude} onChange={e=>setLongitude(e.target.value)} disabled={busy}/></label>
      <label>緯度<input type="number" min={-90} max={90} step="any" value={latitude} onChange={e=>setLatitude(e.target.value)} disabled={busy}/></label>
    </div>
    <TraceMap spatialData={spatial} onLocationPick={({lng,lat,name})=>{
      if(name)setTitle(name);
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
