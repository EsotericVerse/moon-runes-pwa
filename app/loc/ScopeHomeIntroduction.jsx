'use client';

import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {selectScopeConfig} from './scope-data';
import {updateRows} from './db-client.mjs';
import {useAccount} from './use-account';

export default function ScopeHomeIntroduction({
  scopeId,
  fallback='',
  emptyText='尚未設定介紹。'
}){
  const account=useAccount();
  const queryClient=useQueryClient();
  const query=useQuery({
    queryKey:['scope-public-config',scopeId],
    queryFn:()=>selectScopeConfig(scopeId),
    staleTime:60_000
  });
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const intro=String(query.data?.home_intro||fallback||'').trim();
  const canEdit=account.canManageScopeSync(scopeId);

  useEffect(()=>{
    if(!editing)setDraft(intro);
  },[intro,editing]);

  function beginEdit(){
    setDraft(intro);
    setMessage('');
    setEditing(true);
  }

  async function save(){
    setBusy(true);setMessage('');
    try{
      const table=account.scopeDataFor(scopeId)?.config;
      if(!table)throw new Error('Scope config table 未解析。');
      const value=String(draft||'').trim();
      await updateRows(table,{
        home_intro:value,
        updated_at:new Date().toISOString()
      },{filters:[{column:'id',operator:'eq',value:scopeId}]});
      await queryClient.invalidateQueries({queryKey:['scope-public-config',scopeId]});
      setEditing(false);
      setMessage('已更新。');
    }catch(error){
      setMessage(error?.message||'首頁介紹儲存失敗。');
    }finally{
      setBusy(false);
    }
  }

  return <div className="scope-inline-intro">
    {canEdit?<div className="scope-inline-editbar">
      {!editing?<button type="button" className="loc-button" onClick={beginEdit}>編輯</button>:<>
        <button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?'儲存中…':'儲存'}</button>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>{setEditing(false);setDraft(intro);setMessage('')}}>取消</button>
      </>}
    </div>:null}

    {editing?<textarea
      className="scope-inline-intro-editor"
      rows={7}
      value={draft}
      onChange={event=>setDraft(event.target.value)}
      aria-label="Scope 首頁介紹"
      autoFocus
    />:<div className="scope-inline-intro-copy">
      {intro?intro.split(/\n+/).map((line,index)=><p key={index}>{line}</p>):<p className="scope-status">{emptyText}</p>}
    </div>}

    {message?<p className="scope-status" role="status">{message}</p>:null}
  </div>;
}
