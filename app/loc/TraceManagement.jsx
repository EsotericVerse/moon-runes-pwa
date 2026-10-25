'use client';

import {useEffect,useState} from 'react';
import dynamic from 'next/dynamic';
import {FeaturePage} from '../modular/ui';
import {useScopeRuntime} from '../modular/use-scope-runtime';
import {useAccount} from './use-account';
import {useEditDock,useEditDockForm} from '../modular/edit-dock';
import {useAsyncResource} from './use-async-resource';
import ManagementSectionNav,{useManagementSection} from '../modular/ManagementSectionNav';
import {
  TRACE_SCOPES,traceKey,readTraceData,addTraceAnchor,addTraceMap,validCoordinates
} from '../modular/features/trace/trace-data';

const TraceMap=dynamic(()=>import('../modular/features/trace/TraceMap'),{
  ssr:false,loading:()=> <p className="scope-status" role="status">正在開啟定錨地圖…</p>
});
const OPTIONS=[
  {value:'anchor',label:'新增定錨點',shortLabel:'新增定錨點'},
  {value:'map',label:'新增痕跡圖',shortLabel:'新增痕跡圖'}
];

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
      setNotice('定錨點已儲存，痕跡地圖會顯示新位置。');
      return true;
    }catch(error){setNotice(String(error?.message||'新增定錨點失敗。'));return false;}
    finally{setBusy(false);}
  };
  useEditDockForm({save,isDirty:()=>dirty,isBusy:()=>busy});
  return <section className="loc-card scope-feature-card">
    <h3>新增定錨點</h3>
    <p className="scope-status">在地圖上點選位置，或直接輸入經緯度。這是獨立的空間資料，不會修改 Galaxy 打卡欄位。</p>
    <div className="scope-management-fields">
      <label>定錨點名稱<input type="text" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：起點" disabled={busy}/></label>
      <label>說明<textarea maxLength={2000} rows={2} value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
      <label>經度<input type="number" min={-180} max={180} step="any" value={longitude} onChange={e=>setLongitude(e.target.value)} disabled={busy}/></label>
      <label>緯度<input type="number" min={-90} max={90} step="any" value={latitude} onChange={e=>setLatitude(e.target.value)} disabled={busy}/></label>
    </div>
    <TraceMap spatialData={spatial} onLocationPick={({lng,lat})=>{
      setLongitude(String(Math.round(lng*1e6)/1e6));
      setLatitude(String(Math.round(lat*1e6)/1e6));
    }}/>
    <div className="scope-stat-controls">
      <button type="button" className="loc-button primary" disabled={busy||!title.trim()||!validCoordinates(longitude,latitude)} onClick={save}>新增定錨點</button>
    </div>
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
      setNotice('痕跡圖已儲存，路線會依選取的定錨點順序連線。');
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
    <p className="scope-status">從本 Scope 的定錨點選出至少兩處，依顯示順序連成痕跡圖。LOC Group 讀取其他 Scope 的痕跡圖，但不會把它們複製進 LOC。</p>
    <div className="scope-management-fields">
      <label>痕跡圖名稱<input maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy}/></label>
      <label>說明<textarea maxLength={2000} rows={2} value={description} onChange={e=>setDescription(e.target.value)} disabled={busy}/></label>
    </div>
    <div className="loc-trace-anchor-choices" role="group" aria-label="選擇定錨點">
      {anchors.map(anchor=><label key={anchor.uid}>
        <input type="checkbox" disabled={busy} checked={selected.includes(anchor.uid)}
          onChange={e=>setSelected(ids=>e.target.checked?[...ids,anchor.uid]:ids.filter(uid=>uid!==anchor.uid))}/>
        <span>{anchor.title}</span>
      </label>)}
      {!anchors.length?<p className="scope-status">目前沒有定錨點，請先新增定錨點。</p>:null}
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

export default function TraceManagement({scopeId:providedScopeId}){
  const runtime=useScopeRuntime();
  const scopeId=providedScopeId||runtime.scopeId;
  const account=useAccount();
  const dock=useEditDock();
  const [section,setSection]=useManagementSection(OPTIONS,'anchor');
  const authorized=Boolean(account.user&&!account.loading&&!account.permissionLoading&&
    TRACE_SCOPES.includes(scopeId)&&
    (scopeId==='loc'?account.canManageGlobalSync():account.canManageScopeSync(scopeId)));
  const query=useAsyncResource(traceKey(scopeId),()=>readTraceData(scopeId),{
    enabled:authorized,revalidateOnFocus:false,revalidateOnReconnect:false
  });
  useEffect(()=>{
    if(authorized&&(!dock?.active||dock.scopeId!==scopeId))dock?.begin(scopeId);
  },[authorized,scopeId,dock?.active,dock?.scopeId,dock?.begin]);
  if(account.loading||account.permissionLoading)return <FeaturePage featureId="trace"><p className="scope-status">正在確認痕跡管理權限…</p></FeaturePage>;
  if(!authorized)return <FeaturePage featureId="trace"><p className="scope-status">目前帳號沒有此 Scope 的痕跡管理權限，或此 Scope 尚未配置痕跡資料表。</p></FeaturePage>;
  const spatial=query.data||{anchors:[],maps:[]};
  return <FeaturePage featureId="trace">
    <div className="management-workspace">
      <ManagementSectionNav id="trace-management" title="痕跡管理" panelId="trace-management-panel"
        items={OPTIONS} value={section} onChange={next=>{
          if(next===section)return;
          if(dock?.active)dock.switchSection(next,setSection);
          else setSection(next);
        }}/>
      <div id="trace-management-panel" className="management-workspace-panel">
        {query.isPending?<p className="scope-status">正在載入定錨點與痕跡圖…</p>
        :query.error?<p role="alert" className="scope-status scope-error">{String(query.error.message||query.error)}</p>
        :section==='anchor'
          ?<AnchorEditor key={scopeId+'-anchor'} scopeId={scopeId} spatial={spatial} reload={()=>query.mutate()}/>
          :<MapEditor key={scopeId+'-map'} scopeId={scopeId} spatial={spatial} reload={()=>query.mutate()}/>}
      </div>
    </div>
  </FeaturePage>;
}
