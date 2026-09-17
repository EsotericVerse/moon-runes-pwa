'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getManagementSession,
  managementAuthConfigured,
  managementHasPermission,
  managementStateRequest,
  managementStateWrite,
  signInManagementWithGoogle
} from '../loc/auth-client';

const EMPTY_ROUTE={
  id:'',
  label:'',
  segment:'',
  parent_id:'',
  host:'loc.lo3rwang.cc',
  scope:'loc',
  page_type:'page',
  manager_route:'',
  status:'current',
  order:0
};

function depthFor(row,map){
  let depth=0;
  let current=row;
  const seen=new Set();
  while(current?.parent_id&&map.has(current.parent_id)&&!seen.has(current.parent_id)){
    seen.add(current.parent_id);
    depth+=1;
    current=map.get(current.parent_id);
  }
  return depth;
}

export default function RouteRegistryManager(){
  const configured=managementAuthConfigured();
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(configured);
  const [routes,setRoutes]=useState([]);
  const [draft,setDraft]=useState(EMPTY_ROUTE);
  const [insertParentFor,setInsertParentFor]=useState('');
  const [message,setMessage]=useState('');

  const canWrite=managementHasPermission(session,'platform:routes:write');
  const routeMap=useMemo(()=>new Map(routes.map(row=>[row.id,row])),[routes]);
  const ordered=useMemo(()=>[...routes].sort((a,b)=>String(a.host).localeCompare(String(b.host))||String(a.full_route).localeCompare(String(b.full_route))||Number(a.order||0)-Number(b.order||0)),[routes]);

  const load=async()=>{
    const data=await managementStateRequest('/routes');
    setRoutes(Array.isArray(data?.routes)?data.routes:[]);
  };

  useEffect(()=>{
    if(!configured)return;
    let alive=true;
    getManagementSession().then(async value=>{
      if(!alive)return;
      setSession(value);
      setLoading(false);
      if(managementHasPermission(value,'platform:routes:write')) await load();
    }).catch(error=>{
      if(alive){setLoading(false);setMessage(String(error?.message||error));}
    });
    return()=>{alive=false;};
  },[configured]);

  const login=async()=>{
    try{await signInManagementWithGoogle('/admin/routes');}
    catch(error){setMessage(String(error?.message||error));}
  };

  const reset=()=>{setDraft(EMPTY_ROUTE);setInsertParentFor('');};

  const save=async event=>{
    event.preventDefault();
    setMessage('');
    try{
      const route={
        ...draft,
        id:draft.id||crypto.randomUUID(),
        parent_id:draft.parent_id||null,
        manager_route:draft.manager_route||null,
        order:Number(draft.order||0)
      };
      if(insertParentFor){
        await managementStateWrite('/routes',{body:{action:'insert_parent',child_id:insertParentFor,route}});
      }else{
        await managementStateWrite('/routes',{body:{action:'upsert',route}});
      }
      await load();
      reset();
      setMessage('Route Registry 已更新。');
    }catch(error){setMessage(`更新失敗：${String(error?.message||error)}`);}
  };

  const edit=row=>{
    setInsertParentFor('');
    setDraft({...EMPTY_ROUTE,...row,parent_id:row.parent_id||'',manager_route:row.manager_route||''});
  };

  const addChild=row=>{
    setInsertParentFor('');
    setDraft({...EMPTY_ROUTE,parent_id:row.id,host:row.host,scope:row.scope});
  };

  const addParent=row=>{
    setInsertParentFor(row.id);
    setDraft({...EMPTY_ROUTE,parent_id:row.parent_id||'',host:row.host,scope:row.scope});
  };

  const remove=async row=>{
    setMessage('');
    try{
      await managementStateWrite('/routes',{body:{action:'delete',id:row.id}});
      await load();
      if(draft.id===row.id)reset();
      setMessage('Route 已移除。');
    }catch(error){
      const text=String(error?.message||error);
      setMessage(text.includes('route_has_children')?'此節點仍有下層，請先移動或刪除子節點。':`刪除失敗：${text}`);
    }
  };

  if(!configured)return <section className="loc-card"><h2>Route Registry</h2><p role="alert">尚未設定管理登入。</p></section>;
  if(loading)return <section className="loc-card"><p>正在確認管理權限…</p></section>;
  if(!session)return <section className="loc-card"><h2>Route Registry</h2><button type="button" onClick={login}>登入 Admin</button>{message&&<p role="alert">{message}</p>}</section>;
  if(!canWrite)return <section className="loc-card"><h2>Route Registry</h2><p role="alert">需要 platform:routes:write。</p></section>;

  return <div className="loc-stack">
    <section className="loc-card">
      <p className="loc-eyebrow">Admin · Routes</p>
      <h2>Page / Route Registry</h2>
      <p>以 parent / child 管理頁面階層；完整 route 由系統計算。功能導覽不得使用 hash。</p>
      <div className="links"><a href="/admin">回 Admin</a></div>
    </section>

    <section className="loc-card">
      <h3>Route Tree</h3>
      {ordered.length===0&&<p>尚未建立 route registry。</p>}
      {ordered.length>0&&<ul className="loc-route-tree">{ordered.map(row=>{
        const depth=depthFor(row,routeMap);
        return <li key={row.id}>
          <span aria-hidden="true">{'— '.repeat(depth)}</span><strong>{row.label||row.segment||'/'}</strong> <code>{row.host}{row.full_route}</code> · {row.scope} · {row.status}
          {row.manager_route&&<> · <a href={row.manager_route}>管理頁</a></>}
          <div className="loc-actions">
            <button type="button" onClick={()=>edit(row)}>編輯</button>
            <button type="button" onClick={()=>addChild(row)}>新增下層</button>
            <button type="button" onClick={()=>addParent(row)}>插入上層</button>
            <button type="button" onClick={()=>remove(row)}>刪除</button>
          </div>
        </li>;
      })}</ul>}
    </section>

    <section className="loc-card">
      <h3>{insertParentFor?'插入上層':draft.id?'編輯節點':'新增節點'}</h3>
      <form onSubmit={save}>
        <p><label>Label <input value={draft.label} onChange={e=>setDraft(v=>({...v,label:e.target.value}))}/></label></p>
        <p><label>Segment <input value={draft.segment} onChange={e=>setDraft(v=>({...v,segment:e.target.value}))} placeholder="context"/></label></p>
        <p><label>Parent <select value={draft.parent_id} onChange={e=>setDraft(v=>({...v,parent_id:e.target.value}))}><option value="">root</option>{ordered.filter(row=>row.id!==draft.id).map(row=><option key={row.id} value={row.id}>{row.host}{row.full_route}</option>)}</select></label></p>
        <p><label>Host <input required value={draft.host} onChange={e=>setDraft(v=>({...v,host:e.target.value}))}/></label></p>
        <p><label>Scope <input required value={draft.scope} onChange={e=>setDraft(v=>({...v,scope:e.target.value}))}/></label></p>
        <p><label>Page type <input value={draft.page_type} onChange={e=>setDraft(v=>({...v,page_type:e.target.value}))}/></label></p>
        <p><label>Manager route <input value={draft.manager_route} onChange={e=>setDraft(v=>({...v,manager_route:e.target.value}))} placeholder="/context/manage"/></label></p>
        <p><label>Status <select value={draft.status} onChange={e=>setDraft(v=>({...v,status:e.target.value}))}><option value="current">current</option><option value="draft">draft</option><option value="legacy">legacy</option><option value="deprecated">deprecated</option><option value="disabled">disabled</option></select></label></p>
        <p><label>Order <input type="number" value={draft.order} onChange={e=>setDraft(v=>({...v,order:e.target.value}))}/></label></p>
        <div className="loc-actions"><button type="submit">儲存</button><button type="button" onClick={reset}>取消</button></div>
      </form>
      {message&&<p role="status">{message}</p>}
    </section>
  </div>;
}
