'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {selectScopeConfig} from './scope-data';
import {updateRows} from './db-client.mjs';
import {useAccount} from './use-account';
import RichBlockEditor,{normalizeBlocks,plainTextToBlocks} from './RichBlockEditor';

const SLOT_COUNT=4;

function fallbackDocument(value){
  if(Array.isArray(value))return normalizeBlocks(value);
  if(value&&typeof value==='object'&&Array.isArray(value.blocks))return normalizeBlocks(value.blocks);
  return plainTextToBlocks(String(value??''));
}

function normalizeSlots(value,fallbackDocuments=[]){
  const rows=Array.isArray(value)?value:[];
  return Array.from({length:SLOT_COUNT},(_,index)=>{
    const stored=rows[index];
    const blocks=stored&&typeof stored==='object'&&Array.isArray(stored.blocks)
      ?normalizeBlocks(stored.blocks)
      :fallbackDocument(fallbackDocuments[index]);
    return {slot:index+1,blocks};
  });
}

export default function ScopeEditableBlocks({
  scopeId,
  field='home_blocks',
  fallbackDocuments=[],
  className='',
  slotClassName='loc-card'
}){
  const account=useAccount();
  const queryClient=useQueryClient();
  const query=useQuery({
    queryKey:['scope-public-config',scopeId],
    queryFn:()=>selectScopeConfig(scopeId),
    staleTime:60_000
  });
  const fallbackKey=useMemo(()=>JSON.stringify(fallbackDocuments),[fallbackDocuments]);
  const slots=useMemo(
    ()=>normalizeSlots(query.data?.[field],fallbackDocuments),
    [query.data,field,fallbackKey]
  );
  const [editing,setEditing]=useState(0);
  const [draft,setDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(!editing)return;
    const slot=slots[editing-1];
    if(slot)setDraft(slot.blocks);
  },[editing,query.data]);

  const canEdit=account.canManageScopeSync(scopeId);

  function begin(index){
    setEditing(index+1);
    setDraft(slots[index]?.blocks||plainTextToBlocks(''));
    setMessage('');
  }

  async function save(index){
    setBusy(true);setMessage('');
    try{
      const table=account.scopeDataFor(scopeId)?.config;
      if(!table)throw new Error('Scope config table 未解析。');
      const next=slots.map((slot,slotIndex)=>({
        slot:slotIndex+1,
        blocks:slotIndex===index?normalizeBlocks(draft):slot.blocks
      }));
      await updateRows(table,{
        [field]:next,
        updated_at:new Date().toISOString()
      },{filters:[{column:'id',operator:'eq',value:scopeId}]});
      await queryClient.invalidateQueries({queryKey:['scope-public-config',scopeId]});
      setEditing(0);
      setDraft(null);
      setMessage('已更新。');
    }catch(error){
      setMessage(error?.message||'儲存失敗。');
    }finally{
      setBusy(false);
    }
  }

  if(query.isPending)return null;

  return <div className={'scope-editable-block-grid '+className}>
    {slots.map((slot,index)=>{
      const active=editing===index+1;
      const empty=!slot.blocks?.some(block=>{
        const content=block?.content;
        if(typeof content==='string')return content.trim();
        return Array.isArray(content)&&content.length;
      });
      if(empty&&!canEdit)return null;
      return <section className={slotClassName+' scope-editable-block'} key={slot.slot}>
        {canEdit?<div className="scope-inline-editbar">
          {!active?<button type="button" className="loc-button" onClick={()=>begin(index)}>編輯</button>:<>
            <button type="button" className="loc-button primary" disabled={busy} onClick={()=>save(index)}>{busy?'儲存中…':'儲存'}</button>
            <button type="button" className="loc-button" disabled={busy} onClick={()=>{setEditing(0);setDraft(null);setMessage('')}}>取消</button>
          </>}
        </div>:null}
        {active?<RichBlockEditor
          key={scopeId+':'+field+':'+index+':edit'}
          initialContent={draft}
          onChange={setDraft}
        />:<RichBlockEditor
          key={scopeId+':'+field+':'+index+':view:'+JSON.stringify(slot.blocks)}
          initialContent={slot.blocks}
          editable={false}
        />}
      </section>;
    })}
    {message?<p className="scope-status" role="status">{message}</p>:null}
  </div>;
}
