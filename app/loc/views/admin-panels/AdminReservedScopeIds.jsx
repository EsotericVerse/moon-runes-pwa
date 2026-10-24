'use client';

import {useState} from 'react';
import {useAsyncResource} from '../../use-async-resource';
import {useSWRConfig} from 'swr';
import {dbAuthRelation} from '../../db-client.mjs';
import {useAccount} from '../../use-account';
import {useEditDockForm} from '../../../modular/edit-dock';

const TABLE='silver.block_scopeid';
const ID=/^[a-z][a-z0-9]{0,14}$/;
const normalizeId=value=>String(value||'').trim().toLowerCase();

export default function AdminReservedScopeIds(){
  const account=useAccount();
  const {mutate}=useSWRConfig();
  const [newId,setNewId]=useState('');
  const [newNote,setNewNote]=useState('');
  const [notes,setNotes]=useState({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const allowed=Boolean(account.user&&!account.loading&&!account.permissionLoading&&account.canManageGlobalSync());
  const query=useAsyncResource(['admin-reserved-scope-ids'],async()=>{
      const {data,error}=await dbAuthRelation(TABLE).select('id,note').order('id');
      if(error)throw new Error(error.message||'保留 Scope ID 載入失敗');
      return data||[];
  },{enabled:allowed});
  const rows=query.data||[];
  const normalizedNewId=normalizeId(newId);

  async function execute(write){
    if(!allowed||busy)return false;
    setBusy(true);
    setMessage('');
    try{
      await write();
      await mutate(key=>Array.isArray(key)&&['admin-reserved-scope-ids','settings-scope-registry'].includes(key[0]));
      setMessage('已儲存保留 Scope ID 設定。');
      return true;
    }catch(error){
      setMessage(String(error?.message||error||'儲存失敗'));
      return false;
    }finally{
      setBusy(false);
    }
  }

  function add(){
    return execute(async()=>{
      if(!ID.test(normalizedNewId))throw Error('Scope ID 須以小寫字母開頭，長度 1–15 字，只能使用小寫英數。');
      if(rows.some(row=>row.id===normalizedNewId))throw Error('此 Scope ID 已在保留清單中。');
      const {data,error}=await dbAuthRelation(TABLE)
        .insert({id:normalizedNewId,note:newNote.trim()||null}).select('id');
      if(error)throw Error(error.message);
      if(!data?.length)throw Error('新增未寫入資料，請確認 Admin 權限。');
      setNewId('');
      setNewNote('');
    });
  }
  function save(row){
    return execute(async()=>{
      const note=String(notes[row.id]??row.note??'').trim();
      const {data,error}=await dbAuthRelation(TABLE)
        .update({note:note||null}).eq('id',row.id).select('id');
      if(error)throw Error(error.message);
      if(!data?.length)throw Error('更新未寫入資料，請確認 Admin 權限。');
      setNotes(current=>{
        const next={...current};
        delete next[row.id];
        return next;
      });
    });
  }

  const dirtyNotes=rows.filter(row=>String(notes[row.id]??row.note??'').trim()!==String(row.note||'').trim());
  const hasNew=Boolean(newId.trim()||newNote.trim());
  useEditDockForm({
    isDirty:()=>hasNew||dirtyNotes.length>0,
    isBusy:()=>busy,
    save:()=>execute(async()=>{
      if(hasNew){
        if(!ID.test(normalizedNewId))throw Error('新增保留 Scope ID 格式不正確。');
        if(rows.some(row=>row.id===normalizedNewId))throw Error('此 ID 已存在。');
        const {data,error}=await dbAuthRelation(TABLE).insert({id:normalizedNewId,note:newNote.trim()||null}).select('id');
        if(error||!data?.length)throw Error(error?.message||'新增保留 ID 未完成');
        setNewId('');setNewNote('');
      }
      for(const row of dirtyNotes){
        const {data,error}=await dbAuthRelation(TABLE)
          .update({note:String(notes[row.id]||'').trim()||null}).eq('id',row.id).select('id');
        if(error||!data?.length)throw Error(error?.message||'更新備註未完成');
      }
      setNotes({});
    })
  });
  if(account.loading||account.permissionLoading)return <section className="loc-card" role="status">正在確認 Admin 權限…</section>;
  if(!allowed)return <section className="loc-card scope-status scope-error" role="alert">只有 Admin 可以編輯保留 Scope ID。</section>;

  return <section className="loc-card admin-workspace scope-feature-card">
    <h2>保留名稱設定</h2>
    <h3>新增保留 ID</h3>
    <div className="scope-management-fields">
      <label><span>Scope ID</span>
        <input value={newId} onChange={event=>setNewId(event.target.value)} maxLength={15}
          placeholder="小寫英文字母開頭" autoComplete="off"/></label>
      <label><span>原因／備註</span>
        <input value={newNote} onChange={event=>setNewNote(event.target.value)}
          placeholder="例如：保留網站路徑" maxLength={500}/></label>
    </div>
    <div className="scope-stat-controls">
      <button type="button" className="loc-button primary"
        disabled={busy||!ID.test(normalizedNewId)||rows.some(row=>row.id===normalizedNewId)}
        onClick={add}>新增保留 ID</button>
    </div>
    <h3>目前保留的 ID（{rows.length}）</h3>
    {query.isPending?<p className="scope-status" role="status">正在載入保留 ID…</p>:null}
    {query.error?<p className="scope-status scope-error" role="alert">{String(query.error.message||query.error)}</p>:null}
    {!query.isPending&&!query.error?<div className="admin-source-category-grid">
      {rows.map(row=><article className="admin-source-category-card" key={row.id}>
        <strong className="admin-source-category-card__code">{row.id}</strong>
        <label><span>保留原因</span>
          <input value={notes[row.id]??row.note??''}
            maxLength={500} disabled={busy}
            onChange={event=>setNotes(current=>({...current,[row.id]:event.target.value}))}/></label>
        <div className="admin-source-category-card__actions">
          <button type="button" className="loc-button"
            disabled={busy||String(notes[row.id]??row.note??'').trim()===String(row.note||'').trim()}
            onClick={()=>save(row)}>儲存備註</button>
        </div>
      </article>)}
    </div>:null}
    {message?<p className="scope-status" role="status">{message}</p>:null}
  </section>;
}
