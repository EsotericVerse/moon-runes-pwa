'use client';

import {useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {deleteRows,insertRows,updateRows} from './db-client.mjs';
import {selectScopeBlocks} from './scope-data';
import {useAccount} from './use-account';
import RichBlockEditor from './RichBlockEditor';

const ENTITY_LIMIT=6;
const UID_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeUid(){
  const bytes=new Uint8Array(8);
  globalThis.crypto?.getRandomValues?.(bytes);
  let uid='';
  for(let index=0;index<8;index+=1){
    const value=bytes[index]??Math.floor(Math.random()*UID_ALPHABET.length);
    uid+=UID_ALPHABET[value%UID_ALPHABET.length];
  }
  return uid;
}

function pageNameOf(value='index'){
  const page=String(value||'index').trim().toLowerCase();
  return page==='home'?'index':page;
}

function normalizeEntities(value){
  const rows=Array.isArray(value)?value:[];
  return rows.slice(0,ENTITY_LIMIT).map((entity,index)=>({
    uid:/^[A-Za-z0-9]{8}$/.test(String(entity?.uid||''))?String(entity.uid):makeUid(),
    title:String(entity?.title||''),
    text:String(entity?.text||''),
    order:index+1
  }));
}

function normalizeRow(row,order){
  return {
    uid:String(row?.uid||''),
    stored:Boolean(row?.uid),
    order:Number(row?.block_order||order||1),
    title:String(row?.block_title||''),
    text:String(row?.block_text||''),
    entities:normalizeEntities(row?.block_entity)
  };
}

function isInteractiveTarget(target){
  return Boolean(target?.closest?.('a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]'));
}

export default function ScopeEditableBlocks({
  scopeId,
  page='index',
  orders=null,
  className='',
  slotClassName='loc-card',
  headingLevel=3
}){
  const account=useAccount();
  const queryClient=useQueryClient();
  const pageName=pageNameOf(page);
  const query=useQuery({
    queryKey:['scope-blocks',scopeId,pageName],
    queryFn:()=>selectScopeBlocks(scopeId,pageName),
    staleTime:60_000
  });
  const canEdit=scopeId==='loc'?account.canManageGlobalSync():account.canManageScopeSync(scopeId);
  const table=`silver.${scopeId}_blocks`;
  const normalizedOrders=useMemo(
    ()=>Array.isArray(orders)?orders.map(Number).filter(value=>Number.isInteger(value)&&value>0):[],
    [orders]
  );
  const slots=useMemo(()=>{
    const rows=Array.isArray(query.data)?query.data:[];
    if(!normalizedOrders.length)return rows.map(row=>normalizeRow(row,row.block_order));
    const byOrder=new Map(rows.map(row=>[Number(row.block_order),row]));
    return normalizedOrders.map(order=>normalizeRow(byOrder.get(order),order));
  },[query.data,normalizedOrders]);
  const nextOrder=useMemo(()=>{
    const rows=Array.isArray(query.data)?query.data:[];
    return Math.max(0,...rows.map(row=>Number(row.block_order)||0))+1;
  },[query.data]);

  const [draft,setDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  function begin(slot){
    if(!canEdit)return;
    setDraft({
      ...slot,
      uid:slot.uid||makeUid(),
      entities:normalizeEntities(slot.entities)
    });
    setMessage('');
  }

  function cancel(){
    setDraft(null);
    setMessage('');
  }

  function updateEntity(index,patch){
    setDraft(current=>{
      if(!current)return current;
      const entities=current.entities.map((entity,entityIndex)=>entityIndex===index?{...entity,...patch}:entity);
      return {...current,entities};
    });
  }

  function addEntity(){
    setDraft(current=>{
      if(!current||current.entities.length>=ENTITY_LIMIT)return current;
      return {
        ...current,
        entities:[...current.entities,{uid:makeUid(),title:'',text:'',order:current.entities.length+1}]
      };
    });
  }

  function removeEntity(index){
    setDraft(current=>{
      if(!current)return current;
      const entities=current.entities
        .filter((_,entityIndex)=>entityIndex!==index)
        .map((entity,entityIndex)=>({...entity,order:entityIndex+1}));
      return {...current,entities};
    });
  }

  function moveEntity(index,direction){
    setDraft(current=>{
      if(!current)return current;
      const target=index+direction;
      if(target<0||target>=current.entities.length)return current;
      const entities=[...current.entities];
      [entities[index],entities[target]]=[entities[target],entities[index]];
      return {...current,entities:entities.map((entity,entityIndex)=>({...entity,order:entityIndex+1}))};
    });
  }

  async function save(){
    if(!draft)return;
    setBusy(true);setMessage('');
    try{
      const values={
        page_name:pageName,
        block_title:String(draft.title||'').trim(),
        block_text:String(draft.text||''),
        block_order:Number(draft.order)||1,
        block_entity:normalizeEntities(draft.entities).map(({uid,title,text})=>({
          uid,
          title:String(title||'').trim(),
          text:String(text||'')
        }))
      };
      if(draft.stored){
        await updateRows(table,values,{filters:[{column:'uid',operator:'eq',value:draft.uid}]});
      }else{
        await insertRows(table,[{uid:draft.uid,...values}]);
      }
      await queryClient.invalidateQueries({queryKey:['scope-blocks',scopeId,pageName]});
      setDraft(null);
      setMessage('已更新。');
    }catch(error){
      setMessage(error?.message||'儲存失敗。');
    }finally{
      setBusy(false);
    }
  }

  async function remove(){
    if(!draft)return;
    if(!draft.stored){
      setDraft(null);
      return;
    }
    setBusy(true);setMessage('');
    try{
      await deleteRows(table,{filters:[{column:'uid',operator:'eq',value:draft.uid}]});
      await queryClient.invalidateQueries({queryKey:['scope-blocks',scopeId,pageName]});
      setDraft(null);
      setMessage('已刪除。');
    }catch(error){
      setMessage(error?.message||'刪除失敗。');
    }finally{
      setBusy(false);
    }
  }

  function renderEntities(entities,editable=false){
    if(!entities.length&&!editable)return null;
    return <div className="scope-block-entity-grid">
      {entities.map((entity,index)=><article className="scope-block-entity" key={entity.uid}>
        {editable?<>
          <div className="scope-block-entity-actions">
            <button type="button" className="loc-button" disabled={index===0||busy} onClick={()=>moveEntity(index,-1)}>←</button>
            <button type="button" className="loc-button" disabled={index===entities.length-1||busy} onClick={()=>moveEntity(index,1)}>→</button>
            <button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={()=>removeEntity(index)}>刪除</button>
          </div>
          <label className="scope-management-wide-field">
            <span>子文字框標題</span>
            <input
              className="scope-search-input"
              value={entity.title}
              onChange={event=>updateEntity(index,{title:event.target.value})}
            />
          </label>
          <RichBlockEditor
            key={entity.uid+':edit'}
            initialContent={entity.text?{html:entity.text}:''}
            onHtmlChange={html=>updateEntity(index,{text:html})}
          />
        </>:<>
          {entity.title?<h4>{entity.title}</h4>:null}
          {entity.text?<RichBlockEditor
            key={entity.uid+':view'}
            initialContent={{html:entity.text}}
            editable={false}
          />:null}
        </>}
      </article>)}
      {editable&&entities.length<ENTITY_LIMIT?<button type="button" className="scope-block-entity-add" onClick={addEntity} disabled={busy}>
        ＋ 子文字框
      </button>:null}
    </div>;
  }

  return <div className={'scope-editable-block-grid '+className}>
    {slots.map(slot=>{
      const active=draft?.uid&&(draft.uid===slot.uid||(!slot.stored&&draft.order===slot.order));
      const empty=!slot.title&&!slot.text&&!slot.entities.length;
      if(empty&&!canEdit)return null;
      const level=Number(headingLevel);
      const Heading=level===1?'h1':level===2?'h2':level===4?'h4':'h3';
      return <section
        className={slotClassName+' scope-editable-block'+(active?' is-editing':'')+(canEdit&&!active?' is-editable-idle':'')+(empty?' is-empty':'')}
        key={slot.uid||'order:'+slot.order}
        onClickCapture={canEdit&&!active?event=>{if(!isInteractiveTarget(event.target))begin(slot)}:undefined}
      >
        {active?<>
          <div className="scope-inline-editbar">
            <button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?'儲存中…':'儲存'}</button>
            <button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={remove}>刪除</button>
            <button type="button" className="loc-button" disabled={busy} onClick={cancel}>取消</button>
          </div>
          <label className="scope-management-wide-field">
            <span>標題</span>
            <input
              className="scope-search-input"
              value={draft.title}
              onChange={event=>setDraft(current=>({...current,title:event.target.value}))}
            />
          </label>
          <RichBlockEditor
            key={draft.uid+':body:edit'}
            initialContent={draft.text?{html:draft.text}:''}
            onHtmlChange={html=>setDraft(current=>({...current,text:html}))}
          />
          {renderEntities(draft.entities,true)}
        </>:<>
          {slot.title?<Heading>{slot.title}</Heading>:null}
          {slot.text?<RichBlockEditor
            key={(slot.uid||slot.order)+':body:view'}
            initialContent={{html:slot.text}}
            editable={false}
          />:null}
          {renderEntities(slot.entities,false)}
          {empty&&canEdit?<p className="scope-status">點此建立文字框。</p>:null}
        </>}
      </section>;
    })}
    {canEdit&&!normalizedOrders.length?<button
      type="button"
      className="loc-button scope-add-page-block"
      onClick={()=>begin(normalizeRow(null,nextOrder))}
      disabled={busy}
    >＋ 新增文字框</button>:null}
    {message?<p className="scope-status" role="status">{message}</p>:null}
  </div>;
}
