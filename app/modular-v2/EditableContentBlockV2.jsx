'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import ContentEditorV2 from './ContentEditorV2';
import {selectContentBlocks,upsertContentBlock} from '../loc/content-blocks';

function textParagraphs(value){
  const lines=String(value||'').split(/\n+/).map(line=>line.trim()).filter(Boolean);
  return lines.map((line,index)=><p key={index}>{line}</p>);
}

export default function EditableContentBlockV2({
  scopeId,
  pageKey,
  slotKey,
  eyebrow='',
  title='',
  body='',
  displayOrder=0,
  canEdit=false,
  className='loc-card',
  id,
  children=null
}){
  const queryClient=useQueryClient();
  const queryKey=useMemo(()=>['content-blocks',scopeId,pageKey],[scopeId,pageKey]);
  const query=useQuery({
    queryKey,
    queryFn:()=>selectContentBlocks(scopeId,pageKey),
    staleTime:30_000
  });
  const row=(query.data||[]).find(item=>item.slot_key===slotKey)||null;
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const shownEyebrow=row?.eyebrow||eyebrow;
  const shownTitle=row?.title||title;
  const shownBody=row?String(row.body||''):String(body||'');

  useEffect(()=>{
    if(!editing)return;
    setDraft({title:shownTitle,body:shownBody,hidden:false});
  },[row?.updated_at,editing]);

  async function save(){
    if(!draft)return;
    setBusy(true);setError('');
    try{
      await upsertContentBlock(scopeId,pageKey,slotKey,{
        eyebrow:shownEyebrow,
        title:draft.title,
        body:draft.body,
        display_order:displayOrder,
        active:true
      });
      await queryClient.invalidateQueries({queryKey});
      setEditing(false);setDraft(null);
    }catch(exception){
      setError(String(exception?.message||exception||'儲存失敗。'));
    }finally{
      setBusy(false);
    }
  }

  return <section className={className} id={id}>
    {shownEyebrow?<p className="loc-eyebrow">{shownEyebrow}</p>:null}
    {shownTitle?<h2>{shownTitle}</h2>:null}
    {row?textParagraphs(shownBody):(children||textParagraphs(shownBody))}
    {canEdit&&!editing?<p className="scope-v2-inline-edit-action"><button type="button" onClick={()=>{
      setDraft({title:shownTitle,body:shownBody,hidden:false});
      setError('');
      setEditing(true);
    }}>編輯</button></p>:null}
    {canEdit&&editing?<ContentEditorV2
      draft={draft}
      setDraft={setDraft}
      busy={busy}
      error={error}
      showVisibility={false}
      bodyLabel="內容"
      onSave={save}
      onCancel={()=>{setEditing(false);setDraft(null);setError('')}}
    />:null}
  </section>;
}
