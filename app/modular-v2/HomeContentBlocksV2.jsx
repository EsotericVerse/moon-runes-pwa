'use client';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import ContentEditorV2 from './ContentEditorV2';
import EditableContentBlockV2 from './EditableContentBlockV2';
import {useNeonAccount} from '../loc/use-neon-account';
import {deleteContentBlock,reorderContentBlocks,selectContentBlocks,upsertContentBlock} from '../loc/content-blocks';

const MAX_HOME_BLOCKS=8;

export default function HomeContentBlocksV2({scopeId}){
  const account=useNeonAccount();
  const queryClient=useQueryClient();
  const queryKey=['content-blocks',scopeId,'home'];
  const query=useQuery({
    queryKey,
    queryFn:()=>selectContentBlocks(scopeId,'home'),
    staleTime:30_000
  });
  const rows=query.data||[];
  const canEdit=account.canManageScopeSync(scopeId);
  const [adding,setAdding]=useState(false);
  const [draft,setDraft]=useState({title:'',body:'',hidden:false});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  if(!canEdit&&!rows.length)return null;

  async function add(){
    if(rows.length>=MAX_HOME_BLOCKS)return;
    setBusy(true);setError('');
    try{
      const slot='custom:'+globalThis.crypto.randomUUID();
      await upsertContentBlock(scopeId,'home',slot,{
        title:draft.title,
        body:draft.body,
        display_order:rows.length+1,
        active:true
      });
      await queryClient.invalidateQueries({queryKey});
      setDraft({title:'',body:'',hidden:false});
      setAdding(false);
    }catch(exception){
      setError(String(exception?.message||exception||'新增失敗。'));
    }finally{
      setBusy(false);
    }
  }

  async function remove(slotKey){
    setBusy(true);setError('');
    try{
      await deleteContentBlock(scopeId,'home',slotKey);
      await queryClient.invalidateQueries({queryKey});
    }catch(exception){
      setError(String(exception?.message||exception||'刪除失敗。'));
    }finally{
      setBusy(false);
    }
  }

  async function move(index,direction){
    const next=index+direction;
    if(next<0||next>=rows.length)return;
    const slots=rows.map(row=>row.slot_key);
    [slots[index],slots[next]]=[slots[next],slots[index]];
    setBusy(true);setError('');
    try{
      await reorderContentBlocks(scopeId,'home',slots);
      await queryClient.invalidateQueries({queryKey});
    }catch(exception){
      setError(String(exception?.message||exception||'排序失敗。'));
    }finally{
      setBusy(false);
    }
  }

  return <section className="home-content-blocks-v2">
    {rows.map((row,index)=><div className="home-content-block-shell" key={row.block_id||row.slot_key}>
      <EditableContentBlockV2
        scopeId={scopeId}
        pageKey="home"
        slotKey={row.slot_key}
        title={row.title||''}
        body={row.body||''}
        displayOrder={index+1}
        canEdit={canEdit}
      />
      {canEdit?<div className="scope-v2-tabs home-content-block-actions">
        <button type="button" disabled={busy||index===0} onClick={()=>move(index,-1)}>上移</button>
        <button type="button" disabled={busy||index===rows.length-1} onClick={()=>move(index,1)}>下移</button>
        <button type="button" disabled={busy} onClick={()=>remove(row.slot_key)}>刪除</button>
      </div>:null}
    </div>)}

    {canEdit&&rows.length<MAX_HOME_BLOCKS&&!adding?<section className="loc-card">
      <button type="button" onClick={()=>{setAdding(true);setError('')}}>新增文字方塊（{rows.length}/{MAX_HOME_BLOCKS}）</button>
    </section>:null}

    {canEdit&&adding?<section className="loc-card">
      <p className="loc-eyebrow">New Content Block</p>
      <h2>新增首頁文字方塊</h2>
      <ContentEditorV2
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        error={error}
        showVisibility={false}
        bodyLabel="內容"
        onSave={add}
        onCancel={()=>{setAdding(false);setDraft({title:'',body:'',hidden:false});setError('')}}
      />
    </section>:null}
    {error&&!adding?<p className="scope-v2-status scope-v2-error">{error}</p>:null}
  </section>;
}
