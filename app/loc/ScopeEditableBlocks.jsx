'use client';
import UiText,{useUiText} from '../i18n/UiText';

import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {deleteRows,insertRows,moveScopeBlock,updateRows} from './db-client.mjs';
import {selectScopeBlocks} from './scope-data';
import {useAccount} from './use-account';
// Read-only home blocks must not eagerly import editor UI or BlockNote.
const BlockNoteEditor=dynamic(()=>import('./BlockNoteEditor'),{loading:()=>null});
const ObjectEditor=dynamic(()=>import('./BlockNoteEditor').then(mod=>mod.ObjectEditor),{loading:()=>null});
import {isInteractiveContentTarget} from './content-policy.js';

import {HomeBlock} from './home-block-model';
import {BlockNoteContent} from './blocknote-content.mjs';

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
    text:HomeBlock.removeDuplicatedLegacySubtitle(row?.block_text,row?.block_subtitle),
    entities:normalizeEntities(row?.block_entity)
  };
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
  allowInlineChildAdd=false,
  explicitEditButton=false,
  onSuggestionClick=null,
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
      const displayed=HomeBlock.rows(rows,pageName,maxBlocks).map(row=>normalizeRow(row,row.block_order));
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
    const displayed=rows.map(row=>normalizeRow(row,row.block_order));
    // Unbounded pages must render the unsaved draft, or the Add Block button appears inert.
    if(draft&&!draft.stored&&!displayed.some(slot=>slot.order===draft.order)){
      displayed.push({...draft});
      displayed.sort((a,b)=>a.order-b.order);
    }
    return displayed;
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

  function beginWithChild(slot){
    if(!canEdit||!allowEntities)return;
    const entities=normalizeEntities(slot.entities);
    if(entities.length>=ENTITY_LIMIT)return;
    setDraft({
      ...slot,
      uid:slot.uid||makeUid(),
      entities:[...entities,{uid:makeUid(),title:'',text:'',order:entities.length+1}]
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
    return !draft||BlockNoteContent.image.frameImageCount(draft)-BlockNoteContent.image.countHtmlImages(html)===0;
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
      const mode=BlockNoteContent.image.heroImageMode(current);
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
      const mode=BlockNoteContent.image.heroImageMode(current);
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
      const embeddedImages=BlockNoteContent.image.frameImageCount(draft);
      if(!allowImages&&embeddedImages>0)throw new Error(t('uiExtra.editBlocks.textOnly'));
      if(embeddedImages>1)throw new Error(t('uiExtra.editBlocks.oneImage'));
      if(embeddedImages===1&&!BlockNoteContent.image.firstFrameImageUrl(draft))throw new Error(t('uiExtra.editBlocks.invalidImage'));
      const normalizeSavedHtml=value=>scopeId==='loc'&&pageName==='index'
        ?HomeBlock.stripLocHomeEditorPlaceholders(value)
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

  function recommendationTerm(raw){
    return String(raw||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
  }
  function selectSuggestion(text){
    if(typeof onSuggestionClick==='function'){
      const term=recommendationTerm(text);
      if(term)onSuggestionClick(term);
    }
  }

  function renderEntities(entities,editable=false){
    if(!entities.length&&!editable)return null;
    return <div className="scope-block-entity-grid">
      {entities.map((entity,index)=><article className={HomeBlock.childPresentation(entity.title)==='card'?'scope-block-entity':'loc-bubble scope-block-text-bubble'} key={entity.uid}
        role={!editable&&onSuggestionClick?'link':undefined}
        tabIndex={!editable&&onSuggestionClick?0:undefined}
        onKeyDown={!editable&&onSuggestionClick?event=>{if(event.key==='Enter'&&!isInteractiveContentTarget(event.target,event.currentTarget)){event.stopPropagation();selectSuggestion(entity.title||entity.text);}}:undefined}
        onClick={!editable&&onSuggestionClick?event=>{if(!isInteractiveContentTarget(event.target,event.currentTarget)){event.stopPropagation();selectSuggestion(entity.title||entity.text);}}:undefined}>
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
          <BlockNoteEditor
            editorKey={entity.uid+':edit'}
            content={entity.text?{html:entity.text}:''}
            onHtmlChange={html=>updateEntity(index,{text:html})}
            canInsertImage={allowImages&&canInsertImageIn(entity.text)}
          />
        </>:<>
          {HomeBlock.childPresentation(entity.title)==='card'?<h4>{entity.title}</h4>:null}
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
      // A Search suggestion needs an actual clickable term, not just its
      // section heading. Editors always retain their block and edit action.
      if(onSuggestionClick&&!canEdit&&!active
          &&!recommendationTerm(slot.text)
          &&!recommendationTerm(slot.subtitle)
          &&!slot.entities.some(entity=>recommendationTerm(entity.title)||recommendationTerm(entity.text)))return null;
      const level=Number(headingLevel);
      const Heading=level===1?'h1':level===2?'h2':level===4?'h4':'h3';
      return <SlotTag
        id={slotId||undefined}
        className={((active&&editSlotClassName)?editSlotClassName:(typeof resolveSlotClassName==='function'?resolveSlotClassName(slot):slotClassName))+' scope-editable-block'+(active?' is-editing':'')+(canEdit&&!active?' is-editable-idle':'')+(empty?' is-empty':'')}
        key={slot.uid||'order:'+slot.order}
        data-page-name={pageName}
        data-block-order={slot.order}
        onClickCapture={canEdit&&!active&&!explicitEditButton?event=>{if(!isInteractiveContentTarget(event.target))begin(slot)}:undefined}
        onClick={!active&&onSuggestionClick?event=>{if(!isInteractiveContentTarget(event.target))selectSuggestion(slot.text||slot.subtitle||slot.title)}:undefined}
      >
        {active?<>
          <ObjectEditor mode="actions" actionClassName="scope-inline-editbar" actions={[
            {key:'save',primary:true,disabled:busy,onClick:save,label:busy?t('uiExtra.editBlocks.saving'):t('uiExtra.editBlocks.save')},
            ...(slot.stored&&movableSlots.length>1?[
              {key:'up',disabled:busy||movableIndex<=0,onClick:()=>moveBlock(-1),label:<UiText id="uiExtra.editBlocks.moveUp"/>},
              {key:'down',disabled:busy||movableIndex>=movableSlots.length-1,onClick:()=>moveBlock(1),label:<UiText id="uiExtra.editBlocks.moveDown"/>}
            ]:[]),
            ...(allowDelete?[{key:'delete',danger:true,disabled:busy,onClick:remove,label:<UiText id="uiExtra.editBlocks.remove"/>}]:[]),
            {key:'cancel',disabled:busy,onClick:cancel,label:<UiText id="uiExtra.editBlocks.cancel"/>}
          ]} status={message}
            statusClassName={message.startsWith(t('uiExtra.editBlocks.saveFailedPrefix'))?'scope-error':''}/>
          <ObjectEditor mode="scope" fields={[
            ...(editEyebrow?[{
              key:'eyebrow',label:<UiText id="uiExtra.editBlocks.englishEyebrow"/>,
              value:draft.eyebrow,onChange:value=>setDraft(current=>({...current,eyebrow:value}))
            }]:[]),
            {
              key:'title',label:<UiText id="uiExtra.editBlocks.chineseHeadline"/>,
              value:draft.title,onChange:value=>setDraft(current=>({...current,title:value}))
            },
            ...(pageName==='index'&&draft.order===1&&['loc','lo3rwang'].includes(scopeId)?[{
              key:'hero-mode',kind:'node',
              node:<fieldset className="scope-hero-image-mode">
                <legend><UiText id="uiExtra.editBlocks.heroImageMode"/></legend>
                <label><input type="radio" name={'hero-image-'+draft.uid} checked={BlockNoteContent.image.heroImageMode(draft)==='background'} onChange={()=>updateHeroImageMode('background')}/> <UiText id="uiExtra.editBlocks.background"/></label>
                <label><input type="radio" name={'hero-image-'+draft.uid} checked={BlockNoteContent.image.heroImageMode(draft)==='side'} onChange={()=>updateHeroImageMode('side')}/> <UiText id="uiExtra.editBlocks.beside"/></label>
              </fieldset>
            }]:[]),
            {
              key:'subtitle',kind:'rich',label:<UiText id="uiExtra.editBlocks.subtitle"/>,
              editorKey:draft.uid+':subtitle:edit',content:draft.subtitle?{html:draft.subtitle}:'',
              onHtmlChange:html=>setDraft(current=>({...current,subtitle:html})),
              canInsertImage:allowImages&&canInsertImageIn(draft.subtitle)
            },
            {
              key:'body',kind:'rich',label:<UiText id="uiExtra.editBlocks.body"/>,
              editorKey:draft.uid+':body:edit',content:draft.text?{html:draft.text}:'',
              onHtmlChange:html=>setDraft(current=>({...current,text:html})),
              canInsertImage:allowImages&&canInsertImageIn(draft.text)
            }
          ]}/>
          {allowEntities?renderEntities(draft.entities,true):null}
        </>:<>
          {canEdit&&explicitEditButton?<button type="button" className="loc-button scope-search-block-edit" onClick={()=>begin(slot)} aria-label={t('uiExtra.editBlocks.editSuggestion')}><UiText id="uiExtra.editBlocks.edit"/></button>:null}
          {typeof renderDisplay==='function'
            ?renderDisplay(slot)
            :<>
              {slot.eyebrow?<p className="loc-eyebrow">{slot.eyebrow}</p>:null}
              {slot.title?<Heading>{slot.title}</Heading>:null}
              {slot.subtitle?<div className="loc-subtitle scope-block-subtitle" dangerouslySetInnerHTML={{__html:slot.subtitle}}/>:null}
              {slot.text?<div className="scope-rich-surface" dangerouslySetInnerHTML={{__html:slot.text}}/>:null}
              {renderEntities(slot.entities,false)}
            </>}
          {canEdit&&allowEntities&&allowInlineChildAdd&&slot.entities.length<ENTITY_LIMIT?<button
            type="button"
            className="loc-button scope-search-add-child"
            onClick={()=>beginWithChild(slot)}
            disabled={busy}
          ><UiText id="uiExtra.editBlocks.addChild"/></button>:null}
          {empty&&canEdit&&!explicitEditButton?<p className="scope-status"><UiText id="uiExtra.editBlocks.clickToCreate"/></p>:null}
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
