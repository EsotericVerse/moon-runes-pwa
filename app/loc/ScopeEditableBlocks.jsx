'use client';
import UiText,{useUiText} from '../i18n/UiText';

import {useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {deleteRows,insertRows,moveScopeBlock,updateRows} from './db-client.mjs';
import {selectScopeBlocks} from './scope-data';
import {useAccount} from './use-account';
import ArticleBodyEditor from './ArticleBodyEditor';
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
  const t=useUiText();
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
    setBusy(true);setMessage(t('uiExtra.editBlocks.moving'));
    try{
      const result=await moveScopeBlock(scopeId,pageName,draft.uid,direction);
      setDraft(current=>current?.uid===draft.uid?{...current,order:Number(result.block_order)||current.order}:current);
      await queryClient.invalidateQueries({queryKey:['scope-blocks',scopeId,pageName]});
      await queryClient.refetchQueries({queryKey:['scope-blocks',scopeId,pageName],type:'active'});
      setMessage(t('uiExtra.editBlocks.moved'));
    }catch(error){
      setMessage(t('uiExtra.editBlocks.moveFailed',{error:String(error?.message||error)}));
    }finally{setBusy(false);}
  }

  async function save(){
    if(!draft)return;
    setBusy(true);setMessage(t('uiExtra.editBlocks.saving'));
    try{
      const embeddedImages=frameImageCount(draft);
      if(!allowImages&&embeddedImages>0)throw new Error(t('uiExtra.editBlocks.textOnly'));
      if(embeddedImages>1)throw new Error(t('uiExtra.editBlocks.oneImage'));
      if(embeddedImages===1&&!firstFrameImageUrl(draft))throw new Error(t('uiExtra.editBlocks.invalidImage'));
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
      setMessage(t('uiExtra.editBlocks.saved'));
    }catch(error){
      setMessage(t('uiExtra.editBlocks.saveFailedPrefix')+String(error?.message||error||t('uiExtra.editBlocks.unknown')));
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
      setMessage(t('uiExtra.editBlocks.deleted'));
    }catch(error){
      setMessage(error?.message||t('uiExtra.editBlocks.deleteFailed'));
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
            <button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={()=>removeEntity(index)}><UiText id="uiExtra.editBlocks.remove"/></button>
          </div>
          <label className="scope-management-wide-field">
            <span><UiText id="uiExtra.editBlocks.childTitleHint"/></span>
            <input
              className="scope-search-input"
              placeholder={t('uiExtra.editBlocks.bubbleHint')}
              value={entity.title}
              onChange={event=>updateEntity(index,{title:event.target.value})}
            />
          </label>
          <ArticleBodyEditor
            editorKey={entity.uid+':edit'}
            content={entity.text?{html:entity.text}:''}
            onHtmlChange={html=>updateEntity(index,{text:html})}
            canInsertImage={allowImages&&canInsertImageIn(entity.text)}
          />
        </>:<>
          {childPresentation(entity.title)==='card'?<h4>{entity.title}</h4>:null}
          {entity.text?<div className="scope-rich-surface" dangerouslySetInnerHTML={{__html:entity.text}}/>:null}
        </>}
      </article>)}
      {editable&&entities.length<ENTITY_LIMIT?<button type="button" className="scope-block-entity-add" onClick={addEntity} disabled={busy}>
        <UiText id="uiExtra.editBlocks.addChild"/>
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
            <button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?t('uiExtra.editBlocks.saving'):t('uiExtra.editBlocks.save')}</button>
            {slot.stored&&movableSlots.length>1?<>
              <button type="button" className="loc-button" disabled={busy||movableIndex<=0} onClick={()=>moveBlock(-1)}><UiText id="uiExtra.editBlocks.moveUp"/></button>
              <button type="button" className="loc-button" disabled={busy||movableIndex>=movableSlots.length-1} onClick={()=>moveBlock(1)}><UiText id="uiExtra.editBlocks.moveDown"/></button>
            </>:null}
            {allowDelete?<button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={remove}><UiText id="uiExtra.editBlocks.remove"/></button>:null}
            <button type="button" className="loc-button" disabled={busy} onClick={cancel}><UiText id="uiExtra.editBlocks.cancel"/></button>
            {message?<span className={'scope-inline-save-status'+(message.startsWith(t('uiExtra.editBlocks.saveFailedPrefix'))?' scope-error':'')} role="status" aria-live="polite">{message}</span>:null}
          </div>
          {editEyebrow?<label className="scope-management-wide-field">
            <span><UiText id="uiExtra.editBlocks.englishEyebrow"/></span>
            <input
              className="scope-search-input"
              value={draft.eyebrow}
              onChange={event=>setDraft(current=>({...current,eyebrow:event.target.value}))}
            />
          </label>:null}
          <label className="scope-management-wide-field">
            <span><UiText id="uiExtra.editBlocks.chineseHeadline"/></span>
            <input
              className="scope-search-input"
              value={draft.title}
              onChange={event=>setDraft(current=>({...current,title:event.target.value}))}
            />
          </label>
          {pageName==='index'&&draft.order===1&&['loc','lo3rwang'].includes(scopeId)?<fieldset className="scope-hero-image-mode">
            <legend><UiText id="uiExtra.editBlocks.heroImageMode"/></legend>
            <label><input type="radio" name={'hero-image-'+draft.uid} checked={heroImageMode(draft)==='background'} onChange={()=>updateHeroImageMode('background')}/> <UiText id="uiExtra.editBlocks.background"/></label>
            <label><input type="radio" name={'hero-image-'+draft.uid} checked={heroImageMode(draft)==='side'} onChange={()=>updateHeroImageMode('side')}/> <UiText id="uiExtra.editBlocks.beside"/></label>
          </fieldset>:null}
          <div className="scope-management-wide-field">
            <span><UiText id="uiExtra.editBlocks.subtitle"/></span>
          </div>
          <ArticleBodyEditor
            editorKey={draft.uid+':subtitle:edit'}
            content={draft.subtitle?{html:draft.subtitle}:''}
            onHtmlChange={html=>setDraft(current=>({...current,subtitle:html}))}
            canInsertImage={allowImages&&canInsertImageIn(draft.subtitle)}
          />
          <div className="scope-management-wide-field">
            <span><UiText id="uiExtra.editBlocks.body"/></span>
          </div>
          <ArticleBodyEditor
            editorKey={draft.uid+':body:edit'}
            content={draft.text?{html:draft.text}:''}
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
          {empty&&canEdit?<p className="scope-status"><UiText id="uiExtra.editBlocks.clickToCreate"/></p>:null}
        </>}
      </SlotTag>;
    })}
    {canEdit&&!normalizedOrders.length&&(!maxBlocks||nextOrder<=maxBlocks)?<button
      type="button"
      className="loc-button scope-add-page-block"
      onClick={()=>begin(normalizeRow(null,nextOrder))}
      disabled={busy}
    ><UiText id="uiExtra.editBlocks.addBlock"/></button>:null}
    {message?<p className="scope-status" role="status">{message}</p>:null}
  </>;
  return containerless?contents:<div className={'scope-editable-block-grid '+className}>{contents}</div>;
}
