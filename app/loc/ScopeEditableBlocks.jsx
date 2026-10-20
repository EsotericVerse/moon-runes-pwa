'use client';
import UiText,{useUiText} from '../i18n/UiText';
import {registerDefaultSection} from '../i18n/ui-copy';
import {useUiSection} from '../i18n/ui-locale';
import editBlocksZh from '../i18n/sections/uiExtra.editBlocks.zh_tw.js';
registerDefaultSection('uiExtra.editBlocks',editBlocksZh);

import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {useAppBootstrap} from './app-bootstrap';
import {useAccount} from './use-account';
// Read-only home blocks must not eagerly import editor UI or BlockNote.
const ScopeBlockEditorSession=dynamic(()=>import('./ScopeBlockEditorSession'),{loading:()=>null});
import {isInteractiveContentTarget} from './content-policy.js';

import {HomeBlock} from './home-block-model';
import {BlockNoteContent} from './blocknote-content.mjs';

function pageNameOf(value='index'){
  const page=String(value||'index').trim().toLowerCase();
  return page==='home'?'index':page;
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
    image:row?.block_image&&typeof row.block_image==='object'?row.block_image:null,
    entities:HomeBlock.normalizeEntities(row?.block_entity)
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
  useUiSection('uiExtra.editBlocks');
  const t=useUiText();
  const account=useAccount();
  const pageName=pageNameOf(page);
  // Same (scopeId, pageName) request AppShell already makes for this route's
  // Registry/NAV/Theme bootstrap. React Query serves this from that one call
  // instead of this component re-querying the blocks on its own.
  const bootstrap=useAppBootstrap(scopeId,pageName);
  const blocks=bootstrap.data?.blocks;
  const canEdit=allowEditing&&(scopeId==='loc'?account.canManageGlobalSync():account.canManageScopeSync(scopeId));
  const normalizedOrders=useMemo(
    ()=>Array.isArray(orders)?orders.map(Number).filter(value=>Number.isInteger(value)&&value>0):[],
    [orders]
  );
  const [editingSlot,setEditingSlot]=useState(null);
  const [message,setMessage]=useState('');

  const slots=useMemo(()=>{
    const rows=Array.isArray(blocks)?blocks:[];
    if(normalizedOrders.length){
      const byOrder=new Map(rows.map(row=>[Number(row.block_order),row]));
      return normalizedOrders.map(order=>normalizeRow(byOrder.get(order),order));
    }
    if(Number.isInteger(maxBlocks)&&maxBlocks>0){
      const displayed=HomeBlock.rows(rows,pageName,maxBlocks).map(row=>normalizeRow(row,row.block_order));
      if(editingSlot&&!editingSlot.stored&&!displayed.some(slot=>slot.order===editingSlot.order)&&editingSlot.order<=maxBlocks){
        displayed.push({...editingSlot});
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
    // Unbounded pages must render the unsaved editingSlot, or the Add Block button appears inert.
    if(editingSlot&&!editingSlot.stored&&!displayed.some(slot=>slot.order===editingSlot.order)){
      displayed.push({...editingSlot});
      displayed.sort((a,b)=>a.order-b.order);
    }
    return displayed;
  },[blocks,normalizedOrders,maxBlocks,pageName,editingSlot,placeholderFirstOrder]);
  const nextOrder=useMemo(()=>{
    const rows=Array.isArray(blocks)?blocks:[];
    return Math.max(0,...rows.map(row=>Number(row.block_order)||0))+1;
  },[blocks]);


  function begin(slot){
    if(!canEdit)return;
    setEditingSlot({...slot,uid:slot.uid||HomeBlock.createUid(),
      entities:HomeBlock.normalizeEntities(slot.entities)});
    setMessage('');
  }
  function beginWithChild(slot){
    if(!canEdit||!allowEntities)return;
    const entities=HomeBlock.normalizeEntities(slot.entities);
    if(entities.length>=HomeBlock.entityLimit)return;
    setEditingSlot({...slot,uid:slot.uid||HomeBlock.createUid(),
      entities:[...entities,{uid:HomeBlock.createUid(),title:'',text:'',order:entities.length+1}]});
    setMessage('');
  }
  function cancel(){setEditingSlot(null);setMessage('');}
  function recommendationTerm(raw){
    return String(raw||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
  }
  function selectSuggestion(text){
    if(typeof onSuggestionClick==='function'){
      const term=recommendationTerm(text);
      if(term)onSuggestionClick(term);
    }
  }
  function renderEntities(entities){
    if(!entities.length)return null;
    return <div className="scope-block-entity-grid">
      {entities.map(entity=><article
        className={HomeBlock.childPresentation(entity.title)==='card'?'scope-block-entity':'loc-bubble scope-block-text-bubble'}
        key={entity.uid}
        role={onSuggestionClick?'link':undefined}
        tabIndex={onSuggestionClick?0:undefined}
        onKeyDown={onSuggestionClick?event=>{if(event.key==='Enter'&&!isInteractiveContentTarget(event.target,event.currentTarget)){event.stopPropagation();selectSuggestion(entity.title||entity.text);}}:undefined}
        onClick={onSuggestionClick?event=>{if(!isInteractiveContentTarget(event.target,event.currentTarget)){event.stopPropagation();selectSuggestion(entity.title||entity.text);}}:undefined}>
        {HomeBlock.childPresentation(entity.title)==='card'?<h4>{entity.title}</h4>:null}
        {entity.text?<div className="scope-rich-surface" dangerouslySetInnerHTML={{__html:entity.text}}/>:null}
      </article>)}
    </div>;
  }
  const movableSlots=!normalizedOrders.length&&allowDelete?slots.filter(slot=>slot.stored):[];
  const SlotTag=slotTag==='header'?'header':'section';
  const contents=<>
    {slots.map(slot=>{
      const active=editingSlot?.uid&&(editingSlot.uid===slot.uid||(!slot.stored&&editingSlot.order===slot.order));
      const movableIndex=movableSlots.findIndex(item=>item.uid===slot.uid);
      const empty=!BlockNoteContent.text.hasBlockNoteFrameContent(slot);
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
        {active?<ScopeBlockEditorSession
          key={editingSlot.uid}
          initial={editingSlot}
          slot={slot}
          scopeId={scopeId}
          pageName={pageName}
          movableSlots={movableSlots}
          movableIndex={movableIndex}
          normalizedOrders={normalizedOrders}
          allowDelete={allowDelete}
          allowEntities={allowEntities}
          allowImages={allowImages}
          editEyebrow={editEyebrow}
          onClose={cancel}
          onDone={notice=>{setEditingSlot(null);setMessage(notice)}}
        />:<>
          {canEdit&&explicitEditButton?<button type="button" className="loc-button scope-search-block-edit" onClick={()=>begin(slot)} aria-label={t('uiExtra.editBlocks.editSuggestion')}><UiText id="uiExtra.editBlocks.edit"/></button>:null}
          {typeof renderDisplay==='function'
            ?renderDisplay(slot)
            :<>
              {slot.eyebrow?<p className="loc-eyebrow">{slot.eyebrow}</p>:null}
              {slot.title?<Heading>{slot.title}</Heading>:null}
              {slot.subtitle?<p className="loc-subtitle scope-block-subtitle">{HomeBlock.plainBlockLine(slot.subtitle)}</p>:null}
              {slot.text?<div className="scope-rich-surface" dangerouslySetInnerHTML={{__html:slot.text}}/>:null}
              {renderEntities(slot.entities)}
            </>}
          {canEdit&&allowEntities&&allowInlineChildAdd&&slot.entities.length<HomeBlock.entityLimit?<button
            type="button"
            className="loc-button scope-search-add-child"
            onClick={()=>beginWithChild(slot)}
            disabled={Boolean(editingSlot)}
          ><UiText id="uiExtra.editBlocks.addChild"/></button>:null}
          {empty&&canEdit&&!explicitEditButton?<p className="scope-status"><UiText id="uiExtra.editBlocks.clickToCreate"/></p>:null}
        </>}
      </SlotTag>;
    })}
    {canEdit&&!normalizedOrders.length&&(!maxBlocks||nextOrder<=maxBlocks)?<button
      type="button"
      className="loc-button scope-add-page-block"
      onClick={()=>begin(normalizeRow(null,nextOrder))}
      disabled={Boolean(editingSlot)}
    ><UiText id="uiExtra.editBlocks.addBlock"/></button>:null}
    {message?<p className="scope-status" role="status">{message}</p>:null}
  </>;
  return containerless?contents:<div className={'scope-editable-block-grid '+className}>{contents}</div>;
}
