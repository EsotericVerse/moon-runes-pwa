'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {FEATURES_V2} from './scope-registry.v2';
import {useNeonAccount} from '../loc/use-neon-account';
import {createScope,deleteScope,updateScope,selectScopes,selectScopeRelations,selectScopeRelationRequests,selectScopePermissions,upsertScopeAccessGrant,revokeScopeAccessGrant,decideScopeRelationRequest} from '../loc/neon-scope-governance';

const textFields=[
  ['scope_name','名稱'],['scope_kind','Scope 類別'],['scope_type','型態'],['domain','網域'],['alias_name','別名'],['label','顯示標籤'],
  ['mount_host','掛載主機'],['mount_path','掛載路徑'],['primary_link_label','主連結文字'],['primary_link_href','主連結網址'],
  ['role_link_label','角色連結文字'],['role_link_href','角色連結網址'],['search_collection','搜尋集合'],
  ['context_view','脈絡檢視'],['rankings_view','排行檢視'],['ranking_title','排行標題'],['context_table_name','脈絡資料表'],
  ['contact_label','聯絡名稱'],['contact_email','聯絡信箱'],['extra_privileges','額外權限說明'],['display_text','說明']
];
const arrayFields=[['local_routes','頁面路徑'],['route_patterns','動態路徑'],['compatibility_routes','相容路徑'],['home_link_labels','首頁連結文字'],['home_link_hrefs','首頁連結網址']];
const flagFields=[['active','啟用'],['graph_enabled','顯示資料圖'],['include_in_admin_graph','顯示於管理圖'],['include_in_global_search','列入全域搜尋'],['include_in_global_stats','列入全域統計']];
const formFields=[...textFields.map(([key])=>key),...arrayFields.map(([key])=>key),...flagFields.map(([key])=>key),'parent_scope_id','display_order','default_theme_id'];
const emptyScope={scope_id:'',scope_name:'',scope_kind:'custom_scope',scope_type:'directory',parent_scope_id:'',display_order:10,default_theme_id:'theme-7',active:true,graph_enabled:false,include_in_admin_graph:true,include_in_global_search:true,include_in_global_stats:true,local_routes:[],route_patterns:[],compatibility_routes:[],home_link_labels:[],home_link_hrefs:[]};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const lines=value=>String(value||'').split('\n').map(part=>part.trim()).filter(Boolean);
const initialDraft=row=>({...emptyScope,...row,parent_scope_id:row?.parent_scope_id||'',...Object.fromEntries(arrayFields.map(([key])=>[key,Array.isArray(row?.[key])?row[key].join('\n'):String(row?.[key]||'')]))});
function scopePayload(draft){
  const result=Object.fromEntries(formFields.map(key=>[key,draft[key]??null]));
  for(const [key] of textFields)result[key]=String(draft[key]||'').trim()||null;
  for(const [key] of arrayFields)result[key]=Array.isArray(draft[key])?draft[key].map(String).map(value=>value.trim()).filter(Boolean):lines(draft[key]);
  for(const [key] of flagFields)result[key]=Boolean(draft[key]);
  result.scope_name=result.scope_name||String(draft.scope_id||'').trim();
  result.parent_scope_id=String(draft.parent_scope_id||'').trim()||null;
  result.display_order=Number.isFinite(Number(draft.display_order))?Number(draft.display_order):null;
  result.default_theme_id=/^theme-[1-8]$/.test(draft.default_theme_id)?draft.default_theme_id:'theme-7';
  return result;
}
function pointsFor(scopes,relations,requests,grants){
  const depthOf=(row,seen=new Set())=>{
    if(!row?.parent_scope_id||seen.has(row.scope_id))return 0;
    seen.add(row.scope_id);
    return 1+depthOf(scopes.find(item=>item.scope_id===row.parent_scope_id),seen);
  };
  const out=scopes.map((row,index)=>({
    id:'scope:'+row.scope_id,kind:'scope',scopeId:row.scope_id,x:depthOf(row)+1,y:Number(row.display_order)||index+1,z:0,
    label:row.label||row.scope_name||row.scope_id,detail:`${row.scope_id} · ${row.parent_scope_id||'根 Scope'}${row.active?'':' · 已停用'}`
  }));
  for(const [index,row] of relations.entries()){
    const child=scopes.find(item=>item.scope_id===row.child_scope_id);
    out.push({id:'relation:'+row.id,kind:'relation',scopeId:row.child_scope_id,x:depthOf(child)+0.5,y:Number(child?.display_order)||index+1,z:-0.35,label:`${row.parent_scope_id} → ${row.child_scope_id}`,detail:'父子關係'});
  }
  for(const [index,row] of requests.entries()){
    const child=scopes.find(item=>item.scope_id===row.child_scope_id);
    out.push({id:'request:'+row.id,kind:'request',requestId:row.id,scopeId:row.child_scope_id,x:depthOf(child)+1,y:Number(child?.display_order)||index+1,z:-1-index*0.14,label:`申請 ${row.parent_scope_id} → ${row.child_scope_id}`,detail:row.reason||'待審核'});
  }
  for(const [index,row] of grants.entries()){
    const scope=scopes.find(item=>item.scope_id===row.scope_id);
    out.push({id:'grant:'+row.record_id,kind:'grant',scopeId:row.scope_id,x:depthOf(scope)+1,y:Number(scope?.display_order)||index+1,z:1+index*0.14,label:`${row.case_id} · ${row.access_level}`,detail:`${row.scope_id} · ${row.user_id}`});
  }
  return out;
}

export default function ScopeManagementV2(){
  const account=useNeonAccount();
  const client=useQueryClient();
  const canvasRef=useRef(null),clickRef=useRef(null);
  const [isAdmin,setIsAdmin]=useState(false),[permissionChecked,setPermissionChecked]=useState(false);
  const [selected,setSelected]=useState(null),[draft,setDraft]=useState(null),[grantDraft,setGrantDraft]=useState({userId:'',accessLevel:'page_manager',caseId:FEATURES_V2[0].id});
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[graphError,setGraphError]=useState('');
  useEffect(()=>{
    let live=true;setIsAdmin(false);setPermissionChecked(false);
    if(!account.user||account.permissionLoading){setPermissionChecked(!account.permissionLoading);return()=>{live=false};}
    account.canManageGlobal().then(value=>{if(live){setIsAdmin(Boolean(value));setPermissionChecked(true)}}).catch(()=>{if(live)setPermissionChecked(true)});
    return()=>{live=false};
  },[account.user?.id,account.permissionLoading,account.canManageGlobal]);
  const queryKey=['scope-admin-graph',account.user?.id];
  const dataQuery=useQuery({queryKey,queryFn:async()=>{
    const [scopes,relations,requests,grants]=await Promise.all([selectScopes(),selectScopeRelations(),selectScopeRelationRequests({status:'pending'}),selectScopePermissions()]);
    return {scopes,relations,requests,grants};
  },enabled:permissionChecked&&isAdmin,staleTime:20_000});
  const data=dataQuery.data||{scopes:[],relations:[],requests:[],grants:[]};
  const points=useMemo(()=>pointsFor(data.scopes,data.relations,data.requests,data.grants),[data]);
  const refresh=()=>client.invalidateQueries({queryKey});
  const mutate=useMutation({mutationFn:async action=>{
    if(!await account.canManageGlobal())throw new Error('只有 admin 可管理 Scope');
    switch(action.kind){
      case 'create':return createScope(action.payload);
      case 'update':return updateScope(action.id,action.payload);
      case 'delete':return deleteScope(action.id);
      case 'grant':return upsertScopeAccessGrant(action.payload);
      case 'revoke':return revokeScopeAccessGrant(action.payload);
      case 'decide':return decideScopeRelationRequest(action.id,action.status);
      default:throw new Error('未知操作');
    }
  },onSuccess:refresh});
  const selectPoint=point=>{
    setSelected(point);setError('');setMessage('');
    if(point?.kind==='new')setDraft(initialDraft(emptyScope));
    else if(point?.scopeId)setDraft(initialDraft(data.scopes.find(item=>item.scope_id===point.scopeId)||emptyScope));
    else setDraft(null);
  };
  clickRef.current=selectPoint;
  useEffect(()=>{
    if(!isAdmin||!canvasRef.current||!points.length)return;
    let cancelled=false,graph=null;
    import('vis-graph3d/standalone').then(({Graph3d})=>{
      if(cancelled||!canvasRef.current)return;
      const plot=points.map(({id,x,y,z,label,detail})=>({id,x,y,z,title:escapeHtml(label)+' · '+escapeHtml(detail)}));
      graph=new Graph3d(canvasRef.current,plot,{
        width:'100%',height:'540px',style:'dot',showPerspective:true,showGrid:true,keepAspectRatio:true,
        xLabel:'Scope 層級',yLabel:'顯示順序',zLabel:'關係／權限',tooltip:true,verticalRatio:0.7,
        dataColor:{fill:'#7b9ac2',stroke:'#385b86',strokeWidth:2},
        zValueLabel:value=>value>0?'頁面權限':value<0?'關係／申請':'Scope'
      });
      graph.on('click',item=>{const point=points.find(row=>row.id===String(item?.id));if(point)clickRef.current?.(point)});
      setGraphError('');
    }).catch(reason=>{if(!cancelled)setGraphError(String(reason?.message||reason))});
    return()=>{cancelled=true;graph?.destroy()};
  },[isAdmin,points]);
  async function run(action,success){
    setError('');setMessage('');
    try{await mutate.mutateAsync(action);setMessage(success);return true}catch(reason){setError(String(reason?.message||reason));return false}
  }
  async function save(event){
    event.preventDefault();
    const creating=selected?.kind==='new';
    const payload=scopePayload(draft);
    if(creating)payload.scope_id=String(draft.scope_id||'').trim();
    const okay=await run({kind:creating?'create':'update',id:draft.scope_id,payload},creating?'Scope 已新增':'Scope 已更新');
    if(okay)setSelected({kind:'scope',scopeId:draft.scope_id,id:'scope:'+draft.scope_id});
  }
  async function remove(){
    if(!draft||!window.confirm(`確定刪除 ${draft.scope_id}？如有被其他資料使用，請改為停用。`))return;
    if(await run({kind:'delete',id:draft.scope_id},'Scope 已刪除')){setSelected(null);setDraft(null)}
  }
  const currentGrants=data.grants.filter(row=>row.scope_id===draft?.scope_id);
  const selectedRequest=data.requests.find(row=>row.id===selected?.requestId);
  return <section className="scope-v2-page scope-graph-admin">
    <header className="scope-v2-hero"><p className="scope-v2-eyebrow">Scope Administration</p><h1>Scope 3D 管理圖</h1><p>點選 3D 圖中的 Scope、關係、權限或申請，直接在圖的編輯區管理。只有 admin 可新增、修改、刪除 Scope 與分配頁面權限。</p></header>
    {account.loading||account.permissionLoading||!permissionChecked?<p className="scope-v2-status">正在確認 Neon 管理權限…</p>:null}
    {!account.loading&&!account.user?<section className="scope-v2-card"><h2>需要登入</h2><button type="button" onClick={account.signIn}>使用 Google 登入 Neon</button></section>:null}
    {account.user&&permissionChecked&&!isAdmin?<section className="scope-v2-card"><h2>需要 admin 權限</h2><p>此頁的 Scope 管理需由 admin 授權。</p></section>:null}
    {account.error?<p role="alert" className="scope-v2-error">{account.error}</p>:null}
    {isAdmin?<section className="scope-v2-card scope-graph-workspace" aria-label="Scope 3D 管理工作區">
      <div className="scope-graph-toolbar"><button type="button" onClick={()=>selectPoint({id:'new',kind:'new'})}>＋ 在 3D 圖新增 Scope</button><label>選取節點 <select value={selected?.id||''} onChange={event=>selectPoint(points.find(point=>point.id===event.target.value)||null)}><option value="">請選擇</option>{points.map(point=><option key={point.id} value={point.id}>{point.label}</option>)}</select></label><button type="button" onClick={refresh} disabled={dataQuery.isFetching}>重新整理圖</button></div>
      {dataQuery.isPending?<p className="scope-v2-status">正在載入 Scope 圖…</p>:null}
      {dataQuery.error?<p role="alert" className="scope-v2-error">{dataQuery.error.message}</p>:null}
      {graphError?<p role="alert" className="scope-v2-error">3D 圖無法顯示：{graphError}</p>:null}
      <div ref={canvasRef} className="scope-graph-canvas" role="img" aria-label={`Scope 3D 圖，${points.length} 個節點；可用上方選單選取節點`}/>
      <p className="scope-v2-meta">橫軸為層級，縱軸為排序，深度顯示 Scope、父子關係與頁面權限。拖曳旋轉，點選節點編輯。</p>
      {message?<p role="status" className="scope-v2-status">{message}</p>:null}
      {error?<p role="alert" className="scope-v2-status scope-v2-error">{error}</p>:null}
      {draft?<div className="scope-graph-inspector" aria-label="3D 圖節點編輯器">
        <h2>{selected?.kind==='new'?'新增 Scope':`編輯 ${draft.scope_id}`}</h2>
        <form onSubmit={save} className="scope-graph-form">
          <label>Scope ID<input required pattern="[A-Za-z][A-Za-z0-9_.-]{0,62}" value={draft.scope_id||''} disabled={selected?.kind!=='new'} onChange={event=>setDraft(row=>({...row,scope_id:event.target.value}))}/></label>
          <label>父 Scope<select value={draft.parent_scope_id||''} onChange={event=>setDraft(row=>({...row,parent_scope_id:event.target.value}))}><option value="">根 Scope</option>{data.scopes.filter(row=>row.scope_id!==draft.scope_id).map(row=><option key={row.scope_id} value={row.scope_id}>{row.label||row.scope_name||row.scope_id} ({row.scope_id})</option>)}</select></label>
          {textFields.map(([key,label])=><label key={key}>{label}<input type={key==='contact_email'?'email':'text'} value={draft[key]||''} onChange={event=>setDraft(row=>({...row,[key]:event.target.value}))}/></label>)}
          {arrayFields.map(([key,label])=><label key={key}>{label}（每行一項）<textarea rows={3} value={draft[key]||''} onChange={event=>setDraft(row=>({...row,[key]:event.target.value}))}/></label>)}
          <label>顯示順序<input type="number" value={draft.display_order??''} onChange={event=>setDraft(row=>({...row,display_order:event.target.value}))}/></label>
          <label>預設主題<select value={draft.default_theme_id||'theme-7'} onChange={event=>setDraft(row=>({...row,default_theme_id:event.target.value}))}>{Array.from({length:8},(_,index)=><option key={index} value={`theme-${index+1}`}>theme-{index+1}</option>)}</select></label>
          {flagFields.map(([key,label])=><label key={key} className="scope-graph-check"><input type="checkbox" checked={Boolean(draft[key])} onChange={event=>setDraft(row=>({...row,[key]:event.target.checked}))}/>{label}</label>)}
          <div className="scope-graph-actions"><button type="submit" disabled={mutate.isPending}>{mutate.isPending?'儲存中…':'儲存 Scope'}</button>{selected?.kind!=='new'?<button type="button" disabled={mutate.isPending} onClick={remove}>刪除 Scope</button>:null}<button type="button" onClick={()=>{setDraft(null);setSelected(null)}}>關閉編輯</button></div>
        </form>
        {selected?.kind!=='new'?<div className="scope-graph-grants"><h3>{draft.scope_id} 的頁面權限</h3>
          <form onSubmit={async event=>{event.preventDefault();await run({kind:'grant',payload:{...grantDraft,scopeId:draft.scope_id}},'權限已分配')}} className="scope-graph-grant-form">
            <label>Neon 使用者 ID<input required value={grantDraft.userId} onChange={event=>setGrantDraft(row=>({...row,userId:event.target.value}))}/></label>
            <label>權限<select value={grantDraft.accessLevel} onChange={event=>setGrantDraft(row=>({...row,accessLevel:event.target.value}))}><option value="page_manager">頁面管理</option><option value="scope_manager">Scope 管理</option><option value="privacy_dispute_handler">隱私爭議處理</option></select></label>
            <label>頁面／功能<input required list="scope-page-features" value={grantDraft.caseId} onChange={event=>setGrantDraft(row=>({...row,caseId:event.target.value}))}/><datalist id="scope-page-features">{FEATURES_V2.map(row=><option key={row.id} value={row.id}/>)}</datalist></label>
            <button type="submit" disabled={mutate.isPending}>分配權限</button>
          </form>
          {currentGrants.length?<ul>{currentGrants.map(row=><li key={row.record_id}>{row.user_id} · {row.access_level} · {row.case_id} <button type="button" disabled={mutate.isPending} onClick={()=>run({kind:'revoke',payload:{userId:row.user_id,scopeId:row.scope_id,accessLevel:row.access_level,caseId:row.case_id}},'權限已撤銷')}>撤銷</button></li>)}</ul>:<p>此 Scope 尚未分配頁面權限。</p>}
        </div>:null}
      </div>:null}
      {selectedRequest?<div className="scope-graph-inspector"><h2>父子關係申請</h2><p>{selectedRequest.parent_scope_id} → {selectedRequest.child_scope_id}：{selectedRequest.reason||'未填理由'}</p><button type="button" disabled={mutate.isPending} onClick={()=>run({kind:'decide',id:selectedRequest.id,status:'approved'},'關係已核准')}>核准</button> <button type="button" disabled={mutate.isPending} onClick={()=>run({kind:'decide',id:selectedRequest.id,status:'rejected'},'申請已拒絕')}>拒絕</button></div>:null}
      <button type="button" onClick={account.signOut}>登出 Neon</button>
    </section>:null}
  </section>;
}
