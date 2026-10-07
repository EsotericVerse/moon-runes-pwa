'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {insertRows,updateRows} from './db-client.mjs';
import {selectScopeBlocks} from './scope-data';
import {useAccount} from './use-account';
import RichBlockEditor,{blocksToPlainText,normalizeBlocks,plainTextToBlocks} from './RichBlockEditor';

const SLOT_COUNT=4;

function fallbackDocument(value){
  if(Array.isArray(value))return normalizeBlocks(value);
  if(value&&typeof value==='object'&&Array.isArray(value.blocks))return normalizeBlocks(value.blocks);
  return normalizeBlocks(value??'');
}

function slotRows(rows=[],fallbackDocuments=[]){
  const byOrder=new Map((Array.isArray(rows)?rows:[]).map(row=>[Number(row.block_order),row]));
  return Array.from({length:SLOT_COUNT},(_,index)=>{
    const order=index+1;
    const stored=byOrder.get(order)||null;
    const storedText=String(stored?.block_text||'');
    const blocks=storedText.trim()?normalizeBlocks({html:storedText}):fallbackDocument(fallbackDocuments[index]);
    return {
      order,
      stored:Boolean(stored),
      title:String(stored?.block_title||''),
      blocks
    };
  });
}

export default function ScopeEditableBlocks({
  scopeId,
  page='home',
  orders=null,
  fallbackDocuments=[],
  className='',
  slotClassName='loc-card'
}){
  const account=useAccount();
  const queryClient=useQueryClient();
  const query=useQuery({
    queryKey:['scope-blocks',scopeId,page],
    queryFn:()=>selectScopeBlocks(scopeId,page),
    staleTime:60_000
  });
  const fallbackKey=useMemo(()=>JSON.stringify(fallbackDocuments),[fallbackDocuments]);
  const slots=useMemo(
    ()=>slotRows(query.data||[],fallbackDocuments),
    [query.data,fallbackKey]
  );
  const visibleOrders=Array.isArray(orders)&&orders.length
    ?new Set(orders.map(Number).filter(value=>value>=1&&value<=SLOT_COUNT))
    :null;
  const [editing,setEditing]=useState(0);
  const [draft,setDraft]=useState(null);
  const [draftTitle,setDraftTitle]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(!editing)return;
    const slot=slots[editing-1];
    if(slot){
      setDraft(slot.blocks);
      setDraftTitle(slot.title);
    }
  },[editing,query.data]);

  const canEdit=scopeId==='loc'?account.canManageGlobalSync():account.canManageScopeSync(scopeId);
  const table=`silver.${scopeId}_blocks`;

  function begin(index){
    setEditing(index+1);
    setDraft(slots[index]?.blocks||plainTextToBlocks(''));
    setDraftTitle(slots[index]?.title||'');
    setMessage('');
  }

  async function save(index){
    setBusy(true);setMessage('');
    try{
      const slot=slots[index];
      const doc=normalizeBlocks(draft);
      const values={
        block_title:String(draftTitle||'').trim(),
        block_text:String(doc.html||'')
      };
      if(slot?.stored){
        await updateRows(table,values,{filters:[
          {column:'block_page',operator:'eq',value:page},
          {column:'block_order',operator:'eq',value:index+1}
        ]});
      }else{
        await insertRows(table,[{
          block_page:page,
          block_title:values.block_title,
          block_text:values.block_text,
          block_order:index+1
        }]);
      }
      await queryClient.invalidateQueries({queryKey:['scope-blocks',scopeId,page]});
      setEditing(0);
      setDraft(null);
      setDraftTitle('');
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
      if(visibleOrders&&!visibleOrders.has(slot.order))return null;
      const active=editing===index+1;
      const empty=!blocksToPlainText(slot.blocks)&&!slot.title;
      if(empty&&!canEdit)return null;
      return <section className={slotClassName+' scope-editable-block'} key={slot.order}>
        {canEdit?<div className="scope-inline-editbar">
          {!active?<button type="button" className="loc-button" onClick={()=>begin(index)}>編輯</button>:<>
            <button type="button" className="loc-button primary" disabled={busy} onClick={()=>save(index)}>{busy?'儲存中…':'儲存'}</button>
            <button type="button" className="loc-button" disabled={busy} onClick={()=>{setEditing(0);setDraft(null);setDraftTitle('');setMessage('')}}>取消</button>
          </>}
        </div>:null}
        {active?<>
          <label className="scope-management-wide-field"><span>標題</span><input className="scope-search-input" value={draftTitle} onChange={event=>setDraftTitle(event.target.value)}/></label>
          <RichBlockEditor
            key={scopeId+':'+page+':'+index+':edit'}
            initialContent={draft}
            onChange={setDraft}
          />
        </>:<>
          {slot.title?<h3>{slot.title}</h3>:null}
          <RichBlockEditor
            key={scopeId+':'+page+':'+index+':view:'+JSON.stringify(slot.blocks)}
            initialContent={slot.blocks}
            editable={false}
          />
        </>}
      </section>;
    })}
    {message?<p className="scope-status" role="status">{message}</p>:null}
  </div>;
}
