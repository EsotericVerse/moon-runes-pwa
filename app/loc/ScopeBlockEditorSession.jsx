'use client';

// One autonomous editing session for every Scope home, feature hero and
// search suggestion block. Mounted only after an authorized edit action.
import {useState} from 'react';
import dynamic from 'next/dynamic';
import {useQueryClient} from '@tanstack/react-query';
import UiText,{useUiText} from '../i18n/UiText';
import {HomeBlock} from './home-block-model';
import {BlockNoteContent} from './blocknote-content.mjs';
import {resolveHomeImage} from './LocHomeBlockDisplay';

const BlockNoteEditor=dynamic(()=>import('./BlockNoteEditor'),{loading:()=>null});
const ObjectEditor=dynamic(()=>import('./BlockNoteEditor').then(mod=>mod.ObjectEditor),{loading:()=>null});

export default function ScopeBlockEditorSession({
  initial,scopeId,pageName,slot,movableSlots=[],movableIndex=-1,
  normalizedOrders=[],allowDelete=true,allowEntities=true,allowImages=true,
  editEyebrow=true,onClose,onDone
}){
  const t=useUiText();
  const queryClient=useQueryClient();
  const [draft,setDraft]=useState(()=>({...initial,entities:HomeBlock.normalizeEntities(initial.entities)}));
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const table=`silver.${scopeId}_blocks`;
  const cancel=()=>onClose();
  const isHomeFrame=pageName==='index'&&['loc','lo3rwang'].includes(scopeId);
  const image= isHomeFrame?resolveHomeImage(draft,scopeId):null;
  const titleLimit=160;
  const englishLimit=192;
  const subtitleLimit=384;
  const subtitleValue=html=>{
    const raw=String(html||'');
    if(typeof DOMParser==='undefined')return raw.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,' ').trim();
    return new DOMParser().parseFromString(raw,'text/html').body.textContent?.replace(/\s+/g,' ').trim()||'';
  };
  const subtitleHtml=value=>'<p>'+String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')+'</p>';
  const stripInlineImage=value=>String(value||'').replace(/<img\b[^>]*>/gi,'');
  // Only an explicit image management action migrates old embedded images.
  function configureImage(changes,removeEmbedded=true){
    setDraft(current=>{
      const base=current.image&&typeof current.image==='object'?current.image:{};
      const next={...current,image:{...base,...changes}};
      return removeEmbedded?{...next,
        subtitle:stripInlineImage(next.subtitle),
        text:stripInlineImage(next.text),
        entities:next.entities.map(entity=>({...entity,text:stripInlineImage(entity.text)}))
      }:next;
    });
  }
  function updateHeroImageMode(value){
    const mode=value==='side'?'side':'background';
    setDraft(current=>{
      if(!current)return current;
      const entities=current.entities.length?[...current.entities]:[
        {uid:HomeBlock.createUid(),title:'',text:'',order:1}
      ];
      entities[0]={...entities[0],image_mode:mode};
      return {...current,entities,image:{...(current.image||{}),mode}};
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
      if(!current||current.entities.length>=HomeBlock.entityLimit)return current;
      return {
        ...current,
        entities:[...current.entities,{uid:HomeBlock.createUid(),title:'',text:'',order:current.entities.length+1}]
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
      const {moveScopeBlock}=await import('./db-client.mjs');
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
      if(!BlockNoteContent.text.hasBlockNoteFrameContent(draft))throw new Error(t('uiExtra.editBlocks.emptyContent'));
      if(Array.from(String(draft.title||'')).length>titleLimit)throw new Error('中文標題不得超過 '+titleLimit+' 字。');
      if(Array.from(String(draft.eyebrow||'')).length>englishLimit)throw new Error('英文標題不得超過 '+englishLimit+' 字。');
      if(Array.from(String(draft.subtitle||'')).length>subtitleLimit)throw new Error('標題說明不得超過 '+subtitleLimit+' 字。');
      if(isHomeFrame&&draft.image?.source==='custom'&&!BlockNoteContent.image.normalizeImageSource(draft.image.url))throw new Error('請輸入有效的圖片網址。');
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
        ...(isHomeFrame?{block_image:draft.image||null}:{}),
        block_text:normalizeSavedHtml(draft.text),
        block_order:Number(draft.order)||1,
        block_entity:HomeBlock.normalizeEntities(draft.entities).map(({uid,title,text,image_mode},index)=>({
          uid,
          title:String(title||'').trim(),
          text:normalizeSavedHtml(text),
          ...(pageName==='index'&&draft.order===1&&index===0&&image_mode==='side'?{image_mode:'side'}:{})
        }))
      };
      const {updateRows,insertRows}=await import('./db-client.mjs');
      if(draft.stored){
        await updateRows(table,values,{filters:[{column:'uid',operator:'eq',value:draft.uid}]});
      }else{
        await insertRows(table,[{uid:draft.uid,...values}]);
      }
      await queryClient.invalidateQueries({queryKey:['scope-blocks',scopeId,pageName]});
      await queryClient.refetchQueries({queryKey:['scope-blocks',scopeId,pageName],type:'active'});
      onDone(t('uiExtra.editBlocks.saved'));
    }catch(error){
      setMessage(t('uiExtra.editBlocks.saveFailedPrefix')+String(error?.message||error||t('uiExtra.editBlocks.unknown')));
    }finally{
      setBusy(false);
    }
  }

  async function remove(){
    if(!draft)return;
    if(!draft.stored){
      onClose();
      return;
    }
    setBusy(true);setMessage('');
    try{
      const {deleteRows}=await import('./db-client.mjs');
      await deleteRows(table,{filters:[{column:'uid',operator:'eq',value:draft.uid}]});
      await queryClient.invalidateQueries({queryKey:['scope-blocks',scopeId,pageName]});
      onDone(t('uiExtra.editBlocks.deleted'));
    }catch(error){
      setMessage(error?.message||t('uiExtra.editBlocks.deleteFailed'));
    }finally{
      setBusy(false);
    }
  }

  function renderEditableEntities(entities){
    return <div className="scope-block-entity-grid">
      {entities.map((entity,index)=><article className={HomeBlock.childPresentation(entity.title)==='card'?'scope-block-entity':'loc-bubble scope-block-text-bubble'} key={entity.uid}>

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

      </article>)}
      {entities.length<HomeBlock.entityLimit?<button type="button" className="scope-block-entity-add" onClick={addEntity} disabled={busy}>
        <UiText id="uiExtra.editBlocks.addChild"/>
      </button>:null}
    </div>;
  }
  return <>
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
              value:draft.eyebrow,maxLength:englishLimit,onChange:value=>setDraft(current=>({...current,eyebrow:value}))
            }]:[]),
            {
              key:'title',label:<UiText id="uiExtra.editBlocks.chineseHeadline"/>,
              value:draft.title,maxLength:titleLimit,onChange:value=>setDraft(current=>({...current,title:value}))
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
              key:'subtitle-line',label:<UiText id="uiExtra.editBlocks.subtitle"/>,
              value:subtitleValue(draft.subtitle),maxLength:subtitleLimit-7,
              onChange:value=>setDraft(current=>({...current,subtitle:subtitleHtml(value)}))
            },
            {
              key:'body',kind:'rich',label:<UiText id="uiExtra.editBlocks.body"/>,
              editorKey:draft.uid+':body:edit',content:draft.text?{html:draft.text}:'',
              onHtmlChange:html=>setDraft(current=>({...current,text:html})),
              canInsertImage:allowImages&&!isHomeFrame&&canInsertImageIn(draft.text)
            }
          ]}/>
          {isHomeFrame?<fieldset className="scope-frame-image-settings">
            <legend>框架圖片設定</legend>
            <div className="scope-frame-image-preview">
              {image?.src?<img src={image.src} alt="目前框架圖片預覽" loading="lazy"/>:<span>目前不顯示圖片</span>}
            </div>
            <div className="scope-frame-image-fields">
              <label>圖片來源
                <select value={image?.source||'none'} onChange={event=>{
                  const source=event.target.value;
                  configureImage({source,url:source==='custom'?(image?.customUrl||image?.src||''):''});
                }}>
                  <option value="default" disabled={!image?.preset}>原有預設圖片</option>
                  <option value="custom">自訂圖片網址</option>
                  <option value="none">不顯示圖片</option>
                </select>
              </label>
              <label className="scope-frame-image-url">目前圖片網址
                <input type="url" value={image?.source==='default'?image?.src||'':draft.image?.source==='custom'?draft.image.url||'':image?.source==='custom'?image?.src||'':''}
                  disabled={image?.source!=='custom'} placeholder="https://"
                  onChange={event=>configureImage({source:'custom',url:event.target.value},false)}/>
              </label>
              <label>圖片位置
                <select value={image?.position||'right'} onChange={event=>configureImage({position:event.target.value},false)} disabled={!image?.src}>
                  <option value="left">左側</option><option value="right">右側</option>
                  {draft.order!==1?<><option value="top">上方</option><option value="bottom">下方</option></>:null}
                </select>
              </label>
              {draft.order!==1?<label>圖片寬度（px）
                <input type="number" min="160" max="680" step="20" value={image?.width||420}
                  disabled={!image?.src} onChange={event=>configureImage({width:Number(event.target.value)},false)}/>
              </label>:null}
              <button type="button" className="loc-button scope-danger-button" disabled={image?.source==='none'} onClick={()=>configureImage({source:'none',url:''})}>移除圖片</button>
            </div>
          </fieldset>:null}
          {allowEntities?renderEditableEntities(draft.entities):null}
  </>;
}
