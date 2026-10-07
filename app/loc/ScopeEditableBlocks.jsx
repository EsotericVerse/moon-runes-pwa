'use client';

import {useEffect,useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {insertRows,updateRows} from './db-client.mjs';
import {selectScopeBlocks} from './scope-data';
import {useAccount} from './use-account';
import RichBlockEditor,{blocksToPlainText,normalizeBlocks,plainTextToBlocks} from './RichBlockEditor';

const DEFAULT_SLOT_COUNT=4;
const MAX_SLOT_COUNT=32;

function fallbackDocument(value){
  if(Array.isArray(value))return normalizeBlocks(value);
  if(value&&typeof value==='object'&&Array.isArray(value.blocks))return normalizeBlocks(value.blocks);
  return normalizeBlocks(value??'');
}

function slotRows(rows=[],fallbackDocuments=[],slotCount=DEFAULT_SLOT_COUNT){
  const byOrder=new Map((Array.isArray(rows)?rows:[]).map(row=>[Number(row.block_order),row]));
  return Array.from({length:slotCount},(_,index)=>{
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

function isInteractiveTarget(target){
  return Boolean(target?.closest?.('a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]'));
}

export default function ScopeEditableBlocks({
  scopeId,
  page='home',
  orders=null,
  fallbackDocuments=[],
  className='',
  slotClassName='loc-card',
  headingLevel=3,
  slotCount=null
}){
  const account=useAccount();
  const queryClient=useQueryClient();
  const query=useQuery({
    queryKey:['scope-blocks',scopeId,page],
    queryFn:()=>selectScopeBlocks(scopeId,page),
    staleTime:60_000
  });
  const fallbackKey=useMemo(()=>JSON.stringify(fallbackDocuments),[fallbackDocuments]);
  const normalizedOrders=Array.isArray(orders)?orders.map(Number).filter(Number.isFinite):[];
  const maxRequestedOrder=normalizedOrders.length?Math.max(...normalizedOrders):0;
  const requestedSlotCount=Number(slotCount);
  const resolvedSlotCount=Math.min(
    MAX_SLOT_COUNT,
    Math.max(
      DEFAULT_SLOT_COUNT,
      fallbackDocuments.length,
      maxRequestedOrder,
      Number.isFinite(requestedSlotCount)?Math.floor(requestedSlotCount):0
    )
  );
  const slots=useMemo(
    ()=>slotRows(query.data||[],fallbackDocuments,resolvedSlotCount),
    [query.data,fallbackKey,resolvedSlotCount]
  );
  const visibleOrders=normalizedOrders.length
    ?new Set(normalizedOrders.filter(value=>value>=1&&value<=resolvedSlotCount))
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

  return <div className={'scope-editable-block-grid '+className}>
    {slots.map((slot,index)=>{
      if(visibleOrders&&!visibleOrders.has(slot.order))return null;
      const active=editing===index+1;
      const empty=!blocksToPlainText(slot.blocks)&&!slot.title;
      if(empty&&!canEdit)return null;
      const Heading=Number(headingLevel)===2?'h2':'h3';
      return <section
        className={slotClassName+' scope-editable-block'+(active?' is-editing':'')+(canEdit&&!active?' is-editable-idle':'')}
        key={slot.order}
        onClickCapture={canEdit&&!active?event=>{if(!isInteractiveTarget(event.target))begin(index)}:undefined}
      >
        {canEdit&&active?<div className="scope-inline-editbar">
          <button type="button" className="loc-button primary" disabled={busy} onClick={()=>save(index)}>{busy?'儲存中…':'儲存'}</button>
          <button type="button" className="loc-button" disabled={busy} onClick={()=>{setEditing(0);setDraft(null);setDraftTitle('');setMessage('')}}>取消</button>
        </div>:null}
        {active?<>
          <label className="scope-management-wide-field"><span>標題</span><input className="scope-search-input" value={draftTitle} onChange={event=>setDraftTitle(event.target.value)}/></label>
          <RichBlockEditor
            key={scopeId+':'+page+':'+index+':edit'}
            initialContent={draft}
            onChange={setDraft}
          />
        </>:<>
          {slot.title?<Heading>{slot.title}</Heading>:null}
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
