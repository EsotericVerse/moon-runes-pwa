'use client';

import {useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {deleteRows,insertRows,moveScopeBlock,updateRows} from './db-client.mjs';
import {selectScopeBlocks} from './scope-data';
import {useAccount} from './use-account';
import BlockNoteEditor from './BlockNoteEditor';
import {stripLocHomeEditorPlaceholders} from './loc-home-text.mjs';
import {childPresentation,removeDuplicatedLegacySubtitle} from './block-presentation.mjs';
import {homeBlockRows} from './home-block-model.mjs';
import {countHtmlImages,frameImageCount,firstFrameImageUrl,heroImageMode} from './blocknote-image-url.mjs';

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
    ...(entity?.image_mode==='side'?{image_mode:'side'}:{}),
    order:index+1
  }));
}

function normalizeRow(row,order){
  return {
    uid:String(row?.uid||''),
    stored:Boolean(row?.uid),
    order:Number(row?.block_order||order||1),
    eyebrow:String(row?.block_eyebrow||''),
    title:String(row?.block_title||''),
    subtitle:String(row?.block_subtitle||''),
    text:removeDuplicatedLegacySubtitle(row?.block_text,row?.block_subtitle),
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
  editSlotClassName='',
  headingLevel=3,
  renderDisplay=null,
  resolveSlotClassName=null,
  maxBlocks=null,
  placeholderFirstOrder=null,
  containerless=false,
  allowEditing=true,
  allowDelete=true,
  allowEntities=true,
  allowImages=true,
  editEyebrow=true,
  slotTag='section',
  slotId=''
}){
  const account=useAccount();
  const queryClient=useQueryClient();
  const pageName=pageNameOf(page);
  const query=useQuery({
    queryKey:['scope-blocks',scopeId,pageName],
    queryFn:()=>selectScopeBlocks(scopeId,pageName),
    staleTime:60_000
  });
  const canEdit=allowEditing&&(scopeId==='loc'?account.canManageGlobalSync():account.canManageScopeSync(scopeId));
  const table=`silver.${scopeId}_blocks`;
  const normalizedOrders=useMemo(
    ()=>Array.isArray(orders)?orders.map(Number).filter(value=>Number.isInteger(value)&&value>0):[],
    [orders]
  );
  const [draft,setDraft]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  const slots=useMemo(()=>{
    const rows=Array.isArray(query.data)?query.data:[];
    if(normalizedOrders.length){
      const byOrder=new Map(rows.map(row=>[Number(row.block_order),row]));
      return normalizedOrders.map(order=>normalizeRow(byOrder.get(order),order));
    }
    if(Number.isInteger(maxBlocks)&&maxBlocks>0){
      const displayed=homeBlockRows(rows,pageName,maxBlocks).map(row=>normalizeRow(row,row.block_order));
      if(draft&&!draft.stored&&!displayed.some(slot=>slot.order===draft.order)&&draft.order<=maxBlocks){
        displayed.push({...draft});
      }
      // Render the standard Hero visual in static HTML before client data loads.
      // The placeholder is replaced by the real first block after the DB query.
      if(Number.isInteger(placeholderFirstOrder)&&placeholderFirstOrder>0&&placeholderFirstOrder<=maxBlocks
          &&!displayed.some(slot=>slot.order===placeholderFirstOrder)){
        displayed.push(normalizeRow(null,placeholderFirstOrder));
      }
      displayed.sort((a,b)=>a.order-b.order);
      return displayed;
    }
    return rows.map(row=>normalizeRow(row,row.block_order));
  },[query.data,normalizedOrders,maxBlocks,pageName,draft,placeholderFirstOrder]);
  const nextOrder=useMemo(()=>{
    const rows=Array.isArray(query.data)?query.data:[];
    return Math.max(0,...rows.map(row=>Number(row.block_order)||0))+1;
  },[query.data]);


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

  function updateHeroImageMode(value){
    const mode=value==='side'?'side':'background';
    setDraft(current=>{
      if(!current)return current;
      const entities=current.entities.length?[...current.entities]:[
        {uid:makeUid(),title:'',text:'',order:1}
      ];
      entities[0]={...entities[0],image_mode:mode};
      return {...current,entities};
    });
  }

  function canInsertImageIn(html=''){
    return !draft||frameImageCount(draft)-countHtmlImages(html)===0;
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
      const mode=heroImageMode(current);
      const entities=current.entities
        .filter((_,entityIndex)=>entityIndex!==index)
        .map((entity,entityIndex)=>({...entity,order:entityIndex+1}));
      if(current.order===1&&entities.length){
        entities.forEach(entity=>delete entity.image_mode);
        if(mode==='side')entities[0].image_mode='side';
      }
      return {...current,entities};
    });
  }

  function moveEntity(index,direction){
    setDraft(current=>{
      if(!current)return current;
      const target=index+direction;
      if(target<0||target>=current.entities.length)return current;
      const mode=heroImageMode(current);
      const entities=[...current.entities];
      [entities[index],entities[target]]=[entities[target],entities[index]];
      const ordered=entities.map((entity,entityIndex)=>({...entity,order:entityIndex+1}));
      if(current.order===1&&ordered.length){
        ordered.forEach(entity=>delete entity.image_mode);
        if(mode==='side')ordered[0].image_mode='side';
      }
      return {...current,entities:ordered};
    });
  }

  async function moveBlock(direction){
    if(!draft?.stored||busy||normalizedOrders.length)return;
    setBusy(true);setMessage('正在調整區塊順序…');
    try{
      const result=await moveScopeBlock(scopeId,pageName,draft.uid,direction);
      setDraft(current=>current?.uid===draft.uid?{...current,order:Number(result.block_order)||current.order}:current);
      await queryClient.invalidateQueries({queryKey:['scope-blocks',scopeId,pageName]});
      await queryClient.refetchQueries({queryKey:['scope-blocks',scopeId,pageName],type:'active'});
      setMessage('區塊順序已儲存。其他未儲存的文字修改仍留在草稿。');
    }catch(error){
      setMessage('區塊移動失敗：'+String(error?.message||error));
    }finally{setBusy(false);}
  }

  async function save(){
    if(!draft)return;
    setBusy(true);setMessage('儲存中…');
    try{
      const embeddedImages=frameImageCount(draft);
      if(!allowImages&&embeddedImages>0)throw new Error('此文字區僅允許編輯文字。');
      if(embeddedImages>1)throw new Error('每個文字框架最多只能有一張圖片，請先移除多餘圖片。');
      if(embeddedImages===1&&!firstFrameImageUrl(draft))throw new Error('圖片必須是有效的 http:// 或 https:// 網址。');
      const normalizeSavedHtml=value=>scopeId==='loc'&&pageName==='index'
        ?stripLocHomeEditorPlaceholders(value)
        :String(value??'');
      const values={
        page_name:pageName,
        block_eyebrow:String(draft.eyebrow||'').trim(),
        block_title:String(draft.title||'').trim(),
        block_subtitle:normalizeSavedHtml(draft.subtitle),
        block_text:normalizeSavedHtml(draft.text),
        block_order:Number(draft.order)||1,
        block_entity:normalizeEntities(draft.entities).map(({uid,title,text,image_mode},index)=>({
          uid,
          title:String(title||'').trim(),
          text:normalizeSavedHtml(text),
          ...(pageName==='index'&&draft.order===1&&index===0&&image_mode==='side'?{image_mode:'side'}:{})
        }))
      };
      if(draft.stored){
        await updateRows(table,values,{filters:[{column:'uid',operator:'eq',value:draft.uid}]});
      }else{
        await insertRows(table,[{uid:draft.uid,...values}]);
      }
      await queryClient.invalidateQueries({queryKey:['scope-blocks',scopeId,pageName]});
      await queryClient.refetchQueries({queryKey:['scope-blocks',scopeId,pageName],type:'active'});
      setDraft(null);
      setMessage('已儲存。');
    }catch(error){
      setMessage('儲存失敗：'+String(error?.message||error||'未知錯誤'));
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
      {entities.map((entity,index)=><article className={childPresentation(entity.title)==='card'?'scope-block-entity':'loc-bubble scope-block-text-bubble'} key={entity.uid}>
        {editable?<>
          <div className="scope-block-entity-actions">
            <button type="button" className="loc-button" disabled={index===0||busy} onClick={()=>moveEntity(index,-1)}>←</button>
            <button type="button" className="loc-button" disabled={index===entities.length-1||busy} onClick={()=>moveEntity(index,1)}>→</button>
            <button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={()=>removeEntity(index)}>刪除</button>
          </div>
          <label className="scope-management-wide-field">
            <span>標題（不用標題＝文字泡泡，輸入標題＝文字框）</span>
            <input
              className="scope-search-input"
              placeholder="不用標題（文字泡泡）"
              value={entity.title}
              onChange={event=>updateEntity(index,{title:event.target.value})}
            />
          </label>
          <BlockNoteEditor
            key={entity.uid+':edit'}
            initialContent={entity.text?{html:entity.text}:''}
            onHtmlChange={html=>updateEntity(index,{text:html})}
            canInsertImage={allowImages&&canInsertImageIn(entity.text)}
          />
        </>:<>
          {childPresentation(entity.title)==='card'?<h4>{entity.title}</h4>:null}
          {entity.text?<div className="scope-rich-surface" dangerouslySetInnerHTML={{__html:entity.text}}/>:null}
        </>}
      </article>)}
      {editable&&entities.length<ENTITY_LIMIT?<button type="button" className="scope-block-entity-add" onClick={addEntity} disabled={busy}>
        ＋ 子文字框
      </button>:null}
    </div>;
  }

  const movableSlots=!normalizedOrders.length&&allowDelete?slots.filter(slot=>slot.stored):[];
  const SlotTag=slotTag==='header'?'header':'section';
  const contents=<>
    {slots.map(slot=>{
      const active=draft?.uid&&(draft.uid===slot.uid||(!slot.stored&&draft.order===slot.order));
      const movableIndex=movableSlots.findIndex(item=>item.uid===slot.uid);
      const empty=!slot.eyebrow&&!slot.title&&!slot.subtitle&&!slot.text&&!slot.entities.length;
      if(empty&&!canEdit&&slot.order!==placeholderFirstOrder)return null;
      const level=Number(headingLevel);
      const Heading=level===1?'h1':level===2?'h2':level===4?'h4':'h3';
      return <SlotTag
        id={slotId||undefined}
        className={((active&&editSlotClassName)?editSlotClassName:(typeof resolveSlotClassName==='function'?resolveSlotClassName(slot):slotClassName))+' scope-editable-block'+(active?' is-editing':'')+(canEdit&&!active?' is-editable-idle':'')+(empty?' is-empty':'')}
        key={slot.uid||'order:'+slot.order}
        data-page-name={pageName}
        data-block-order={slot.order}
        onClickCapture={canEdit&&!active?event=>{if(!isInteractiveTarget(event.target))begin(slot)}:undefined}
      >
        {active?<>
          <div className="scope-inline-editbar">
            <button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?'儲存中…':'儲存'}</button>
            {slot.stored&&movableSlots.length>1?<>
              <button type="button" className="loc-button" disabled={busy||movableIndex<=0} onClick={()=>moveBlock(-1)}>↑ 上移</button>
              <button type="button" className="loc-button" disabled={busy||movableIndex>=movableSlots.length-1} onClick={()=>moveBlock(1)}>↓ 下移</button>
            </>:null}
            {allowDelete?<button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={remove}>刪除</button>:null}
            <button type="button" className="loc-button" disabled={busy} onClick={cancel}>取消</button>
            {message?<span className={'scope-inline-save-status'+(message.startsWith('儲存失敗')?' scope-error':'')} role="status" aria-live="polite">{message}</span>:null}
          </div>
          {editEyebrow?<label className="scope-management-wide-field">
            <span>英文標題（可留空）</span>
            <input
              className="scope-search-input"
              value={draft.eyebrow}
              onChange={event=>setDraft(current=>({...current,eyebrow:event.target.value}))}
            />
          </label>:null}
          <label className="scope-management-wide-field">
            <span>中文大標題（可留空）</span>
            <input
              className="scope-search-input"
              value={draft.title}
              onChange={event=>setDraft(current=>({...current,title:event.target.value}))}
            />
          </label>
          {pageName==='index'&&draft.order===1&&['loc','lo3rwang'].includes(scopeId)?<fieldset className="scope-hero-image-mode">
            <legend>Hero 圖片位置（背景或旁邊，二選一）</legend>
            <label><input type="radio" name={'hero-image-'+draft.uid} checked={heroImageMode(draft)==='background'} onChange={()=>updateHeroImageMode('background')}/> 背景</label>
            <label><input type="radio" name={'hero-image-'+draft.uid} checked={heroImageMode(draft)==='side'} onChange={()=>updateHeroImageMode('side')}/> 旁邊</label>
          </fieldset>:null}
          <div className="scope-management-wide-field">
            <span>標題說明（可保留粗體與換行）</span>
          </div>
          <BlockNoteEditor
            key={draft.uid+':subtitle:edit'}
            initialContent={draft.subtitle?{html:draft.subtitle}:''}
            onHtmlChange={html=>setDraft(current=>({...current,subtitle:html}))}
            canInsertImage={allowImages&&canInsertImageIn(draft.subtitle)}
          />
          <div className="scope-management-wide-field">
            <span>下方正文（BlockNote）</span>
          </div>
          <BlockNoteEditor
            key={draft.uid+':body:edit'}
            initialContent={draft.text?{html:draft.text}:''}
            onHtmlChange={html=>setDraft(current=>({...current,text:html}))}
            canInsertImage={allowImages&&canInsertImageIn(draft.text)}
          />
          {allowEntities?renderEntities(draft.entities,true):null}
        </>:<>
          {typeof renderDisplay==='function'
            ?renderDisplay(slot)
            :<>
              {slot.eyebrow?<p className="loc-eyebrow">{slot.eyebrow}</p>:null}
              {slot.title?<Heading>{slot.title}</Heading>:null}
              {slot.subtitle?<div className="loc-subtitle scope-block-subtitle" dangerouslySetInnerHTML={{__html:slot.subtitle}}/>:null}
              {slot.text?<div className="scope-rich-surface" dangerouslySetInnerHTML={{__html:slot.text}}/>:null}
              {renderEntities(slot.entities,false)}
            </>}
          {empty&&canEdit?<p className="scope-status">點此建立文字框。</p>:null}
        </>}
      </SlotTag>;
    })}
    {canEdit&&!normalizedOrders.length&&(!maxBlocks||nextOrder<=maxBlocks)?<button
      type="button"
      className="loc-button scope-add-page-block"
      onClick={()=>begin(normalizeRow(null,nextOrder))}
      disabled={busy}
    >＋ 新增文字框</button>:null}
    {message?<p className="scope-status" role="status">{message}</p>:null}
  </>;
  return containerless?contents:<div className={'scope-editable-block-grid '+className}>{contents}</div>;
}
