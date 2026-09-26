'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useNeonAccount} from '../loc/use-neon-account';
import {
  createManagedNode,deleteManagedNode,deletePermission,managedNodeId,
  selectManagedNodes,selectPermissions,updateManagedNode,upsertPermission
} from '../loc/neon-scope-governance';

const EMPTY_NODE={record_type:'scope',node_id:'',parent_group_id:'',active:true,display_order:10};
const EMPTY_PERMISSION={userId:'',email:'',privileges:''};
const privilegeLines=value=>[...new Set(String(value||'').split(/[\n,]+/).map(item=>item.trim()).filter(Boolean))];

function nodeDraft(row){
  if(!row)return {...EMPTY_NODE};
  return {
    record_type:row.record_type,
    node_id:managedNodeId(row),
    parent_group_id:row.parent_group_id||'',
    active:row.active!==false,
    display_order:row.display_order??10
  };
}
function graphFor(nodes){
  const graphNodes=nodes.map(row=>{
    const nodeId=managedNodeId(row);
    return {
      id:`${row.record_type}:${nodeId}`,
      kind:row.record_type,
      nodeId,
      label:nodeId,
      title:`${row.record_type==='group'?'Group':'Scope'} · 上層 ${row.parent_group_id||'無'}${row.active?'':' · 已停用'}`,
      shape:'box',
      level:row.parent_group_id?undefined:0
    };
  });
  const ids=new Set(graphNodes.map(node=>node.id));
  const edges=nodes.flatMap(row=>{
    if(!row.parent_group_id)return [];
    const from=`group:${row.parent_group_id}`;
    const to=`${row.record_type}:${managedNodeId(row)}`;
    if(!ids.has(from)||!ids.has(to))return [];
    return [{id:`${from}->${to}`,from,to,arrows:{to:{enabled:true,scaleFactor:0.55}}}];
  });
  return {nodes:graphNodes,edges};
}

export default function ScopeManagementV2(){
  const account=useNeonAccount();
  const client=useQueryClient();
  const canvasRef=useRef(null),clickRef=useRef(null);
  const [isAdmin,setIsAdmin]=useState(false),[permissionChecked,setPermissionChecked]=useState(false);
  const [selected,setSelected]=useState(null),[draft,setDraft]=useState(null);
  const [permissionDraft,setPermissionDraft]=useState({...EMPTY_PERMISSION});
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[graphError,setGraphError]=useState('');

  useEffect(()=>{
    let live=true;setIsAdmin(false);setPermissionChecked(false);
    if(!account.user||account.permissionLoading){setPermissionChecked(!account.permissionLoading);return()=>{live=false};}
    account.canManageGlobal().then(value=>{if(live){setIsAdmin(Boolean(value));setPermissionChecked(true)}}).catch(()=>{if(live)setPermissionChecked(true)});
    return()=>{live=false};
  },[account.user?.id,account.permissionLoading,account.canManageGlobal]);

  const queryKey=['scope-admin-graph',account.user?.id];
  const dataQuery=useQuery({
    queryKey,
    queryFn:async()=>{
      const [nodes,permissions]=await Promise.all([selectManagedNodes(),selectPermissions()]);
      return {nodes,permissions};
    },
    enabled:permissionChecked&&isAdmin,
    staleTime:20_000
  });
  const data=dataQuery.data||{nodes:[],permissions:[]};
  const groups=data.nodes.filter(row=>row.record_type==='group');
  const graphData=useMemo(()=>graphFor(data.nodes),[data.nodes]);
  const points=graphData.nodes;
  const refresh=()=>client.invalidateQueries({queryKey});

  const mutate=useMutation({
    mutationFn:async action=>{
      if(!await account.canManageGlobal())throw new Error('只有 admin 可管理');
      if(action.kind==='create')return createManagedNode(action.payload);
      if(action.kind==='update')return updateManagedNode(action.row,action.payload);
      if(action.kind==='delete')return deleteManagedNode(action.row);
      if(action.kind==='permission-save')return upsertPermission(action.payload);
      if(action.kind==='permission-delete')return deletePermission(action.userId);
      throw new Error('未知操作');
    },
    onSuccess:refresh
  });

  const selectPoint=point=>{
    setSelected(point);setError('');setMessage('');
    if(point?.kind==='new')setDraft({...EMPTY_NODE});
    else if(point?.nodeId){
      const row=data.nodes.find(item=>managedNodeId(item)===point.nodeId&&item.record_type===point.kind);
      setDraft(nodeDraft(row));
    }else setDraft(null);
  };
  clickRef.current=selectPoint;

  useEffect(()=>{
    if(!isAdmin||!canvasRef.current||!graphData.nodes.length)return;
    let cancelled=false,network=null;
    import('vis-network/standalone').then(({Network})=>{
      if(cancelled||!canvasRef.current)return;
      network=new Network(canvasRef.current,{nodes:graphData.nodes,edges:graphData.edges},{
        autoResize:true,
        layout:{improvedLayout:true,hierarchical:{
          enabled:true,direction:'UD',sortMethod:'directed',levelSeparation:150,nodeSpacing:190,treeSpacing:240,
          blockShifting:true,edgeMinimization:true,parentCentralization:true
        }},
        interaction:{hover:true,navigationButtons:true,keyboard:true,dragNodes:true,dragView:true,zoomView:true},
        nodes:{shape:'box',borderWidth:2,margin:{top:10,right:14,bottom:10,left:14},font:{size:14,align:'center'}},
        edges:{width:1.5,smooth:{type:'cubicBezier',forceDirection:'vertical',roundness:0.35}},
        physics:{enabled:false}
      });
      network.on('selectNode',event=>{
        const id=String(event.nodes?.[0]||'');
        const point=graphData.nodes.find(row=>row.id===id);
        if(point)clickRef.current?.(point);
      });
      network.fit({animation:{duration:250,easingFunction:'easeInOutQuad'}});
      setGraphError('');
    }).catch(reason=>{if(!cancelled)setGraphError(String(reason?.message||reason))});
    return()=>{cancelled=true;network?.destroy()};
  },[isAdmin,graphData]);

  async function run(action,success){
    setError('');setMessage('');
    try{await mutate.mutateAsync(action);setMessage(success);return true}
    catch(reason){setError(String(reason?.message||reason));return false}
  }

  async function saveNode(event){
    event.preventDefault();
    const creating=selected?.kind==='new';
    const payload={
      record_type:draft.record_type,
      node_id:String(draft.node_id||'').trim(),
      parent_group_id:String(draft.parent_group_id||'').trim()||null,
      active:Boolean(draft.active),
      display_order:Number(draft.display_order)
    };
    let ok=false;
    if(creating)ok=await run({kind:'create',payload},'節點已新增');
    else{
      const row=data.nodes.find(item=>managedNodeId(item)===selected?.nodeId&&item.record_type===selected?.kind);
      ok=await run({kind:'update',row,payload},'節點已更新');
    }
    if(ok)setSelected({kind:draft.record_type,nodeId:draft.node_id,id:`${draft.record_type}:${draft.node_id}`});
  }

  async function removeNode(){
    const row=data.nodes.find(item=>managedNodeId(item)===selected?.nodeId&&item.record_type===selected?.kind);
    if(!row||!window.confirm(`確定刪除 ${managedNodeId(row)}？`))return;
    if(await run({kind:'delete',row},'節點已刪除')){setSelected(null);setDraft(null)}
  }

  async function savePermission(event){
    event.preventDefault();
    const privileges=privilegeLines(permissionDraft.privileges);
    if(await run({kind:'permission-save',payload:{
      userId:permissionDraft.userId,email:permissionDraft.email,privileges
    }},'權限已儲存'))setPermissionDraft({...EMPTY_PERMISSION});
  }

  return <section className="scope-v2-page scope-graph-admin">
    <header className="scope-v2-hero">
      <p className="scope-v2-eyebrow">Management</p>
      <h1>Group / Scope 管理</h1>
      <p>上層永遠是 Group；下層可以是 Scope，也可以是另一個 Group。</p>
    </header>

    {account.loading||account.permissionLoading||!permissionChecked?<p className="scope-v2-status">正在確認管理權限…</p>:null}
    {account.user&&permissionChecked&&!isAdmin?<section className="scope-v2-card"><h2>需要 admin 權限</h2></section>:null}
    {account.error?<p role="alert" className="scope-v2-error">{account.error}</p>:null}

    {isAdmin?<section className="scope-v2-card scope-graph-workspace" aria-label="Group 與 Scope 管理工作區">
      <div className="scope-graph-toolbar">
        <button type="button" onClick={()=>selectPoint({id:'new',kind:'new'})}>＋ 新增 Group / Scope</button>
        <label>選取節點 <select value={selected?.id||''} onChange={event=>selectPoint(points.find(point=>point.id===event.target.value)||null)}>
          <option value="">請選擇</option>
          {points.map(point=><option key={point.id} value={point.id}>{point.label} · {point.kind}</option>)}
        </select></label>
        <button type="button" onClick={refresh} disabled={dataQuery.isFetching}>重新整理</button>
      </div>

      {dataQuery.isPending?<p className="scope-v2-status">正在載入…</p>:null}
      {dataQuery.error?<p role="alert" className="scope-v2-error">{dataQuery.error.message}</p>:null}
      {graphError?<p role="alert" className="scope-v2-error">關係圖無法顯示：{graphError}</p>:null}
      <div ref={canvasRef} className="scope-graph-canvas" role="img" aria-label={`Group / Scope 關係圖，共 ${points.length} 個節點`}/>

      {message?<p role="status" className="scope-v2-status">{message}</p>:null}
      {error?<p role="alert" className="scope-v2-status scope-v2-error">{error}</p>:null}

      {draft?<div className="scope-graph-inspector">
        <h2>{selected?.kind==='new'?'新增節點':`編輯 ${draft.node_id}`}</h2>
        <form onSubmit={saveNode} className="scope-graph-form">
          <label>類型<select value={draft.record_type} disabled={selected?.kind!=='new'} onChange={event=>setDraft(row=>({...row,record_type:event.target.value,parent_group_id:event.target.value==='scope'?(row.parent_group_id||''):row.parent_group_id}))}>
            <option value="group">Group</option><option value="scope">Scope</option>
          </select></label>
          <label>{draft.record_type==='group'?'Group ID':'Scope ID'}<input required pattern="[A-Za-z][A-Za-z0-9_.-]{0,62}" value={draft.node_id} disabled={selected?.kind!=='new'} onChange={event=>setDraft(row=>({...row,node_id:event.target.value}))}/></label>
          <label>上層 Group<select value={draft.parent_group_id||''} onChange={event=>setDraft(row=>({...row,parent_group_id:event.target.value}))} required={draft.record_type==='scope'}>
            {draft.record_type==='group'?<option value="">根 Group</option>:<option value="">請選擇</option>}
            {groups.filter(row=>row.group_id!==draft.node_id).map(row=><option key={row.group_id} value={row.group_id}>{row.group_id}</option>)}
          </select></label>
          <label>顯示順序<input type="number" value={draft.display_order??''} onChange={event=>setDraft(row=>({...row,display_order:event.target.value}))}/></label>
          <label className="scope-graph-check"><input type="checkbox" checked={Boolean(draft.active)} onChange={event=>setDraft(row=>({...row,active:event.target.checked}))}/>啟用</label>
          <div className="scope-graph-actions">
            <button type="submit" disabled={mutate.isPending}>{mutate.isPending?'儲存中…':'儲存'}</button>
            {selected?.kind!=='new'?<button type="button" disabled={mutate.isPending} onClick={removeNode}>刪除</button>:null}
            <button type="button" onClick={()=>{setDraft(null);setSelected(null)}}>關閉</button>
          </div>
        </form>
      </div>:null}

      <div className="scope-graph-inspector">
        <h2>網站權限</h2>
        <form onSubmit={savePermission} className="scope-graph-form">
          <label>user_id<input required value={permissionDraft.userId} onChange={event=>setPermissionDraft(row=>({...row,userId:event.target.value}))}/></label>
          <label>email<input required type="email" value={permissionDraft.email} onChange={event=>setPermissionDraft(row=>({...row,email:event.target.value}))}/></label>
          <label>privileges（每行一項）<textarea rows={5} required value={permissionDraft.privileges} onChange={event=>setPermissionDraft(row=>({...row,privileges:event.target.value}))}/></label>
          <p className="scope-v2-meta">可用：admin、&lt;scope_id&gt;、&lt;scope_id&gt;_&lt;page&gt;。權限向下相容：admin 不需再列 Scope；已有 Scope 權限時，不需再列該 Scope 的頁面。</p>
          <button type="submit" disabled={mutate.isPending}>儲存權限</button>
        </form>
        {data.permissions.length?<ul>{data.permissions.map(row=><li key={row.record_id}>
          {row.email||row.user_id} · {(row.privileges||[]).join('、')||'無權限'}
          <button type="button" disabled={mutate.isPending} onClick={()=>setPermissionDraft({userId:row.user_id,email:row.email||'',privileges:(row.privileges||[]).join('\n')})}>編輯</button>
          <button type="button" disabled={mutate.isPending} onClick={()=>run({kind:'permission-delete',userId:row.user_id},'權限已刪除')}>刪除</button>
        </li>)}</ul>:<p>目前沒有網站權限紀錄。</p>}
      </div>

    </section>:null}
  </section>;
}
