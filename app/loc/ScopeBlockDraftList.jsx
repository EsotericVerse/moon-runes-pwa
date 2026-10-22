'use client';

import {useState} from 'react';
import dynamic from 'next/dynamic';
import {useQueryClient} from '@tanstack/react-query';
import UiText,{useUiText} from '../i18n/UiText';
import {registerDefaultSection} from '../i18n/ui-copy';
import {useUiSection} from '../i18n/ui-locale';
import editBlocksZh from '../i18n/sections/uiExtra.editBlocks.zh_tw.js';
import frameEditorZh from '../i18n/sections/uiExtra.frameEditor.zh_tw.js';
registerDefaultSection('uiExtra.editBlocks',editBlocksZh);
registerDefaultSection('uiExtra.frameEditor',frameEditorZh);
import {HomeBlock} from './home-block-model';
import {BlockNoteContent} from './blocknote-content.mjs';
import {resolveHomeImage} from './LocHomeBlockDisplay';
import {appBootstrapKey} from './app-bootstrap';

const BlockNoteEditor=dynamic(()=>import('./BlockNoteEditor'),{loading:()=>null});
const ObjectEditor=dynamic(()=>import('./BlockNoteEditor').then(mod=>mod.ObjectEditor),{loading:()=>null});

const TITLE_LIMIT=64;
const EYEBROW_LIMIT=64;
const SUBTITLE_LIMIT=128;

function isHomeFrameFor(scopeId,pageName,order){
  if(scopeId==='lrunes')return pageName==='hero'&&order===1;
  return pageName==='index'&&order===1&&['loc','lo3rwang'].includes(scopeId);
}

function absoluteImageUrl(src){
  try{return src?new URL(src,window.location.origin).href:'';}catch{return src||'';}
}

function stripInlineImage(value){
  return String(value||'').replace(/<img\b[^>]*>/gi,'');
}

export default function ScopeBlockDraftList({
  slots,scopeId,pageName,allowDelete=true,allowEntities=true,allowImages=true,
  editEyebrow=true,canAddBlock=false,slotClassName='loc-card',editSlotClassName='',
  preserveOrder=false,toolbar=null,onDone,onCancel
}){
  useUiSection('uiExtra.editBlocks');
  useUiSection('uiExtra.frameEditor');
  const t=useUiText();
  const queryClient=useQueryClient();
  const [drafts,setDrafts]=useState(()=>slots.map(slot=>({
    ...slot,entities:HomeBlock.normalizeEntities(slot.entities),_deleted:false
  })));
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const table=`silver.${scopeId}_blocks`;

  async function refreshBlockQueries(){
    const bootstrapKey=appBootstrapKey(scopeId,pageName);
    const displayKey=['scope-blocks',scopeId,pageName];
    await Promise.all([
      queryClient.invalidateQueries({queryKey:bootstrapKey}),
      queryClient.invalidateQueries({queryKey:displayKey})
    ]);
    await Promise.all([
      queryClient.refetchQueries({queryKey:bootstrapKey,type:'active'}),
      queryClient.refetchQueries({queryKey:displayKey,type:'active'})
    ]);
  }

  function patchDraft(uid,patch){
    setDrafts(current=>current.map(draft=>draft.uid===uid?{...draft,...patch}:draft));
  }
  function patchImage(uid,changes,removeEmbedded=true){
    setDrafts(current=>current.map(draft=>{
      if(draft.uid!==uid)return draft;
      const base=draft.image&&typeof draft.image==='object'?draft.image:{};
      const next={...draft,image:{...base,...changes}};
      return removeEmbedded?{...next,
        subtitle:stripInlineImage(next.subtitle),
        text:stripInlineImage(next.text),
        entities:next.entities.map(entity=>({...entity,text:stripInlineImage(entity.text)}))
      }:next;
    }));
  }
  function updateHeroImageMode(uid,value){
    const mode=value==='side'?'side':'background';
    setDrafts(current=>current.map(draft=>{
      if(draft.uid!==uid)return draft;
      const entities=draft.entities.length?[...draft.entities]:[{uid:HomeBlock.createUid(),title:'',text:'',order:1}];
      entities[0]={...entities[0],image_mode:mode};
      return {...draft,entities,image:{...(draft.image||{}),mode}};
    }));
  }
  function canInsertImageIn(draft,html=''){
    return BlockNoteContent.image.frameImageCount(draft)-BlockNoteContent.image.countHtmlImages(html)===0;
  }
  function updateEntity(uid,index,patch){
    setDrafts(current=>current.map(draft=>{
      if(draft.uid!==uid)return draft;
      const entities=draft.entities.map((entity,entityIndex)=>entityIndex===index?{...entity,...patch}:entity);
      return {...draft,entities};
    }));
  }
  function addEntity(uid){
    setDrafts(current=>current.map(draft=>{
      if(draft.uid!==uid||draft.entities.length>=HomeBlock.entityLimit)return draft;
      return {...draft,entities:[...draft.entities,{uid:HomeBlock.createUid(),title:'',text:'',order:draft.entities.length+1}]};
    }));
  }
  function removeEntity(uid,index){
    setDrafts(current=>current.map(draft=>{
      if(draft.uid!==uid)return draft;
      const mode=BlockNoteContent.image.heroImageMode(draft);
      const entities=draft.entities.filter((_,entityIndex)=>entityIndex!==index)
        .map((entity,entityIndex)=>({...entity,order:entityIndex+1}));
      if(draft.order===1&&entities.length){
        entities.forEach(entity=>delete entity.image_mode);
        if(mode==='side')entities[0].image_mode='side';
      }
      return {...draft,entities};
    }));
  }
  function moveEntity(uid,index,direction){
    setDrafts(current=>current.map(draft=>{
      if(draft.uid!==uid)return draft;
      const target=index+direction;
      if(target<0||target>=draft.entities.length)return draft;
      const mode=BlockNoteContent.image.heroImageMode(draft);
      const entities=[...draft.entities];
      [entities[index],entities[target]]=[entities[target],entities[index]];
      const ordered=entities.map((entity,entityIndex)=>({...entity,order:entityIndex+1}));
      if(draft.order===1&&ordered.length){
        ordered.forEach(entity=>delete entity.image_mode);
        if(mode==='side')ordered[0].image_mode='side';
      }
      return {...draft,entities:ordered};
    }));
  }
  function toggleDelete(uid){
    if(!allowDelete)return;
    setDrafts(current=>current.map(draft=>draft.uid===uid?{...draft,_deleted:!draft._deleted}:draft));
  }
  function moveBlock(uid,direction){
    setDrafts(current=>{
      const visible=current.filter(draft=>!draft._deleted);
      const index=visible.findIndex(draft=>draft.uid===uid);
      const target=index+direction;
      if(index<0||target<0||target>=visible.length)return current;
      const reordered=[...visible];
      [reordered[index],reordered[target]]=[reordered[target],reordered[index]];
      const deleted=current.filter(draft=>draft._deleted);
      return [...reordered,...deleted];
    });
  }
  function addBlock(){
    setDrafts(current=>{
      const nextOrder=Math.max(0,...current.map(draft=>Number(draft.order)||0))+1;
      return [...current,{
        uid:HomeBlock.createUid(),stored:false,order:nextOrder,
        eyebrow:'',title:'',subtitle:'',text:'',image:null,entities:[],_deleted:false
      }];
    });
  }

  async function save(){
    setBusy(true);setMessage('');
    const visible=drafts.filter(draft=>!draft._deleted);
    for(const draft of visible){
      if(!BlockNoteContent.text.hasBlockNoteFrameContent(draft)){
        setBusy(false);setMessage(t('uiExtra.editBlocks.emptyContent'));return;
      }
      if(Array.from(String(draft.title||'')).length>TITLE_LIMIT){
        setBusy(false);setMessage(t('uiExtra.frameEditor.titleTooLong',{limit:TITLE_LIMIT}));return;
      }
      if(Array.from(String(draft.eyebrow||'')).length>EYEBROW_LIMIT){
        setBusy(false);setMessage(t('uiExtra.frameEditor.eyebrowTooLong',{limit:EYEBROW_LIMIT}));return;
      }
      if(Array.from(String(draft.subtitle||'')).length>SUBTITLE_LIMIT){
        setBusy(false);setMessage(t('uiExtra.frameEditor.subtitleTooLong',{limit:SUBTITLE_LIMIT}));return;
      }
      const isHomeFrame=isHomeFrameFor(scopeId,pageName,draft.order);
      if(isHomeFrame&&draft.image?.source==='custom'&&!BlockNoteContent.image.normalizeImageSource(draft.image.url)){
        setBusy(false);setMessage(t('uiExtra.frameEditor.imageUrlInvalid'));return;
      }
      const embeddedImages=BlockNoteContent.image.frameImageCount(draft);
      if(!allowImages&&embeddedImages>0){setBusy(false);setMessage(t('uiExtra.editBlocks.textOnly'));return;}
      if(embeddedImages>1){setBusy(false);setMessage(t('uiExtra.editBlocks.oneImage'));return;}
      if(embeddedImages===1&&!BlockNoteContent.image.firstFrameImageUrl(draft)){setBusy(false);setMessage(t('uiExtra.editBlocks.invalidImage'));return;}
    }
    try{
      const {updateRows,insertRows,deleteRows}=await import('./db-client.mjs');
      const normalizeSavedHtml=value=>scopeId==='loc'&&pageName==='index'
        ?HomeBlock.stripLocHomeEditorPlaceholders(value)
        :String(value??'');
      for(const draft of drafts.filter(draft=>draft._deleted&&draft.stored)){
        await deleteRows(table,{filters:[{column:'uid',operator:'eq',value:draft.uid}]});
      }
      for(const [index,draft] of visible.entries()){
        const isHomeFrame=isHomeFrameFor(scopeId,pageName,draft.order);
        const values={
          page_name:pageName,
          block_eyebrow:HomeBlock.plainBlockLine(draft.eyebrow),
          block_title:HomeBlock.plainBlockLine(draft.title),
          block_subtitle:HomeBlock.plainBlockLine(draft.subtitle),
          ...(isHomeFrame?{block_image:draft.image||null}:{}),
          block_text:normalizeSavedHtml(draft.text),
          block_order:preserveOrder?Number(draft.order)||index+1:index+1,
          block_entity:HomeBlock.normalizeEntities(draft.entities).map(({uid,title,text,image_mode},entityIndex)=>({
            uid,
            title:String(title||'').trim(),
            text:normalizeSavedHtml(text),
            ...(pageName==='index'&&draft.order===1&&entityIndex===0&&image_mode==='side'?{image_mode:'side'}:{})
          }))
        };
        if(draft.stored){
          await updateRows(table,values,{filters:[{column:'uid',operator:'eq',value:draft.uid}]});
        }else{
          // Fixed-slot pages can open an empty placeholder when that row does
          // not exist yet. Give the new row a valid block UID before insert;
          // the placeholder itself has no stored UID to reuse.
          const uid=/^[A-Za-z0-9]{8}$/.test(String(draft.uid||''))?draft.uid:HomeBlock.createUid();
          await insertRows(table,[{uid,...values}]);
        }
      }
      await refreshBlockQueries();
      onDone(t('uiExtra.editBlocks.saved'));
    }catch(error){
      setMessage(t('uiExtra.editBlocks.saveFailedPrefix')+String(error?.message||error||t('uiExtra.editBlocks.unknown')));
    }finally{
      setBusy(false);
    }
  }

  function renderDraftEntities(draft){
    return <div className="scope-block-entity-grid">
      {draft.entities.map((entity,index)=><article className={HomeBlock.childPresentation(entity.title)==='card'?'scope-block-entity':'loc-bubble scope-block-text-bubble'} key={entity.uid}>
        <div className="scope-block-entity-actions">
          <button type="button" className="loc-button" disabled={index===0||busy} onClick={()=>moveEntity(draft.uid,index,-1)}>←</button>
          <button type="button" className="loc-button" disabled={index===draft.entities.length-1||busy} onClick={()=>moveEntity(draft.uid,index,1)}>→</button>
          <button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={()=>removeEntity(draft.uid,index)}><UiText id="uiExtra.editBlocks.remove"/></button>
        </div>
        <label className="scope-management-wide-field">
          <span><UiText id="uiExtra.editBlocks.childTitleHint"/></span>
          <input className="scope-search-input" placeholder={t('uiExtra.editBlocks.bubbleHint')} value={entity.title}
            onChange={event=>updateEntity(draft.uid,index,{title:event.target.value})}/>
        </label>
        <BlockNoteEditor
          editorKey={entity.uid+':draft'}
          content={entity.text?{html:entity.text}:''}
          onHtmlChange={html=>updateEntity(draft.uid,index,{text:html})}
          canInsertImage={allowImages&&canInsertImageIn(draft,entity.text)}
        />
      </article>)}
      {draft.entities.length<HomeBlock.entityLimit?<button type="button" className="scope-block-entity-add" onClick={()=>addEntity(draft.uid)} disabled={busy}>
        <UiText id="uiExtra.editBlocks.addChild"/>
      </button>:null}
    </div>;
  }

  function renderDraft(draft,index,visibleDrafts){
    const isHomeFrame=isHomeFrameFor(scopeId,pageName,draft.order);
    const image=isHomeFrame?resolveHomeImage(draft,scopeId):null;
    return <section className={(editSlotClassName||slotClassName)+' scope-editable-block scope-block-draft'} key={draft.uid}>
      <div className="scope-inline-editbar">
        {visibleDrafts.length>1?<button type="button" className="loc-button" disabled={busy||index===0} onClick={()=>moveBlock(draft.uid,-1)}><UiText id="uiExtra.editBlocks.moveUp"/></button>:null}
        {visibleDrafts.length>1?<button type="button" className="loc-button" disabled={busy||index===visibleDrafts.length-1} onClick={()=>moveBlock(draft.uid,1)}><UiText id="uiExtra.editBlocks.moveDown"/></button>:null}
        {allowDelete?<button type="button" className="loc-button scope-danger-button" disabled={busy} onClick={()=>toggleDelete(draft.uid)}><UiText id="uiExtra.editBlocks.remove"/></button>:null}
      </div>
      <ObjectEditor mode="scope" fields={[
        ...(editEyebrow?[{
          key:'eyebrow',label:<UiText id="uiExtra.editBlocks.englishEyebrow"/>,
          value:draft.eyebrow,maxLength:EYEBROW_LIMIT,onChange:value=>patchDraft(draft.uid,{eyebrow:value})
        }]:[]),
        {
          key:'title',label:<UiText id="uiExtra.editBlocks.chineseHeadline"/>,
          value:draft.title,maxLength:TITLE_LIMIT,onChange:value=>patchDraft(draft.uid,{title:value})
        },
        ...(isHomeFrame?[{
          key:'hero-mode',kind:'node',
          node:<fieldset className="scope-hero-image-mode">
            <legend><UiText id="uiExtra.editBlocks.heroImageMode"/></legend>
            <label><input type="radio" name={'hero-image-'+draft.uid} checked={BlockNoteContent.image.heroImageMode(draft)==='background'} onChange={()=>updateHeroImageMode(draft.uid,'background')}/> <UiText id="uiExtra.editBlocks.background"/></label>
            <label><input type="radio" name={'hero-image-'+draft.uid} checked={BlockNoteContent.image.heroImageMode(draft)==='side'} onChange={()=>updateHeroImageMode(draft.uid,'side')}/> <UiText id="uiExtra.editBlocks.beside"/></label>
          </fieldset>
        }]:[]),
        {
          key:'subtitle-line',label:<UiText id="uiExtra.editBlocks.subtitle"/>,
          value:HomeBlock.plainBlockLine(draft.subtitle),maxLength:SUBTITLE_LIMIT,
          onChange:value=>patchDraft(draft.uid,{subtitle:value})
        },
        {
          key:'body',kind:'rich',label:<UiText id="uiExtra.editBlocks.body"/>,
          editorKey:draft.uid+':draft:body',content:draft.text?{html:draft.text}:'',
          onHtmlChange:html=>patchDraft(draft.uid,{text:html}),
          canInsertImage:allowImages&&!isHomeFrame&&canInsertImageIn(draft,draft.text)
        }
      ]}/>
      {isHomeFrame?<fieldset className="scope-frame-image-settings">
        <legend>{t('uiExtra.frameEditor.imageLegend')}</legend>
        <div className="scope-frame-image-preview">
          {image?.src?<img src={image.src} alt={t('uiExtra.frameEditor.imagePreviewAlt')} loading="lazy"/>:<span>{t('uiExtra.frameEditor.imageNone')}</span>}
        </div>
        <div className="scope-frame-image-fields">
          <label className="scope-frame-image-url">{t('uiExtra.frameEditor.imageUrl')}
            <input type="url" value={image?.source==='default'?absoluteImageUrl(image.src):image?.source==='custom'?(draft.image?.url||''):''}
              placeholder="https://"
              onChange={event=>{
                const url=event.target.value;
                const preset=image?.preset?absoluteImageUrl(resolveHomeImage({...draft,image:{source:'default'}},scopeId).src):'';
                patchImage(draft.uid, !url.trim()||url.trim()===preset?{source:'default',url:''}:{source:'custom',url},false);
              }}/>
          </label>
          <button type="button" className="loc-button scope-danger-button" disabled={image?.source==='none'} onClick={()=>patchImage(draft.uid,{source:'none',url:''})}>{t('uiExtra.frameEditor.imageRemove')}</button>
        </div>
      </fieldset>:null}
      {allowEntities?renderDraftEntities(draft):null}
    </section>;
  }

  const visibleDrafts=drafts.filter(draft=>!draft._deleted);
  return <>
    <div className="scope-block-draft-toolbar">
      {toolbar}
      <div className="scope-block-draft-actions">
        <button type="button" className="loc-button primary" disabled={busy} onClick={save}>{busy?t('uiExtra.editBlocks.saving'):t('uiExtra.editBlocks.save')}</button>
        <button type="button" className="loc-button" disabled={busy} onClick={()=>{if(window.confirm(t('uiExtra.editBlocks.cancelConfirm')))onCancel();}}><UiText id="uiExtra.editBlocks.cancel"/></button>
      </div>
    </div>
    {visibleDrafts.map((draft,index)=>renderDraft(draft,index,visibleDrafts))}
    {canAddBlock?<button type="button" className="loc-button scope-add-page-block" onClick={addBlock} disabled={busy}><UiText id="uiExtra.editBlocks.addBlock"/></button>:null}
    {message?<p className={'scope-status'+(message.startsWith(t('uiExtra.editBlocks.saveFailedPrefix'))?' scope-error':'')} role="status">{message}</p>:null}
  </>;
}
