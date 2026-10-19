'use client';

import {WorkSummaryCard} from './ui';
import BlockNoteEditor from '../loc/BlockNoteEditor';
import {UI_COPY} from '../i18n/ui-copy';
import {blocksToPlainText} from '../loc/blocknote-content.mjs';
import UiText,{useUiText} from '../i18n/UiText';
import {isInteractiveContentTarget} from '../loc/inline-edit-interaction.mjs';
import {galaxyMediaHref} from './feature-navigation';


// Shared article(uid) list module for Search and Culture.
export function ArticleInlineEditor({draft,onChange,showHidden=false,attributeFields=null,showBodyEditor=true,attributeTitle='',mediaScopeId=''}){
  const t=useUiText();
  if(!draft)return null;
  const resolvedAttributeTitle=attributeTitle||t('uiExtra.searchUI.attributeTitle');
  return <div className="scope-editor scope-search-article-editor">
    {showBodyEditor?<div className="scope-editor-blocknote"><span>{UI_COPY.common.body}</span>
      <BlockNoteEditor
        editorKey={'article:'+String(draft.editorKey||'')}
        content={draft.bodyHtml??draft.bodyBlocks}
        onBlocksChange={blocks=>onChange(current=>({...current,bodyBlocks:blocks,body:blocksToPlainText(blocks)}))}
        onHtmlChange={html=>onChange(current=>({...current,bodyHtml:html}))}
      />
    </div>:null}
    {showHidden?<div className="scope-editor-options">
      <label><input type="checkbox" checked={draft.hidden===true} onChange={event=>onChange(current=>({...current,hidden:event.target.checked,attrs:current.attrs?{...current.attrs,searchable:!event.target.checked}:current.attrs}))}/>{UI_COPY.common.hiddenFromSearch}</label>
    </div>:null}
    {Array.isArray(attributeFields)&&attributeFields.length?<section className="scope-search-attr-panel" aria-label={resolvedAttributeTitle}>
      <h3 className="scope-search-attr-heading">{resolvedAttributeTitle}</h3>
      <div className="scope-search-attr-grid">
        {attributeFields.map(({key,kind='text',readOnly=false})=>{
          const current=key==='title'?draft.title:draft.attrs?.[key];
          const editValue=key==='content'?t('uiExtra.searchUI.attrShown'):current;
          const setValue=value=>onChange(previous=>key==='title'?{...previous,title:value}:{...previous,attrs:{...(previous.attrs||{}),[key]:value}});
          return <label className={'scope-search-attr-item'+(!readOnly?' is-editable':'')} key={key}>
            <span className="scope-search-attr-name">{key}</span>
            {readOnly?<span className="scope-search-attr-value">{String(editValue??'')}</span>
              :kind==='boolean'?<span className="scope-search-attr-boolean">
                <input type="checkbox" checked={current===true} onChange={event=>setValue(event.target.checked)}/>
                <span>{current===true?'true':'false'}</span>
              </span>
              :kind==='array'||kind==='multiline'?<textarea rows={2} aria-label={key}
                value={String(current??'')} onChange={event=>setValue(event.target.value)}/>
              :<input aria-label={key} type={kind==='date'?'datetime-local':kind==='number'?'number':'text'}
                value={String(current??'')} onChange={event=>setValue(event.target.value)}/>} 
            {key==='media_link'&&mediaScopeId?String(current||'').split(/[\n,]+/).map(id=>id.trim()).filter(Boolean).map(id=><a key={id} href={galaxyMediaHref(mediaScopeId,id)} className="scope-search-media-edit-link">{t('uiExtra.searchUI.editMedia',{id})}</a>):null}
          </label>;
        })}
      </div>
    </section>:null}
  </div>;
}

export default function Article({uid,title,source='',scopeId='',date='',body='',hidden=false,relationLinks=[],links=[],destinations=[],editable=false,editing=false,onEdit,editorDraft=null,onDraftChange,onSave,onDelete,onCancel,editBusy=false,editError='',showHidden=false,attributeFields=null,styleTag=false,styleTagKicker=null,styleIntroText='',children=null,showBodyEditor=true,attributeTitle='',mediaScopeId=''}){
  const t=useUiText();
  const richBody=typeof body==='string'&&/<[a-z][^>]*>/i.test(body);
  const onClickCapture=editable&&!editing&&typeof onEdit==='function'?event=>{
    if(!isInteractiveContentTarget(event.target))onEdit(uid);
  }:undefined;
  const editingReady=editing&&Boolean(editorDraft);
  const editorActions=editingReady?<div className="scope-article-editor-actions">
    <button type="button" className="loc-button primary" disabled={editBusy} onClick={onSave}>{editBusy?UI_COPY.common.saving:UI_COPY.common.save}</button>
    {editable&&onDelete?<button type="button" className="loc-button scope-danger-button" disabled={editBusy} onClick={onDelete}><UiText id="uiExtra.editBlocks.remove"/></button>:null}
    <button type="button" className="loc-button" disabled={editBusy} onClick={onCancel}>{UI_COPY.common.cancel}</button>
    {editError?<span className="scope-inline-save-status scope-error" role="alert">{editError}</span>:null}
  </div>:null;
  const titleEditor=editingReady?<input className="scope-article-edit-title" aria-label={UI_COPY.common.title} value={editorDraft.title||''} onChange={event=>onDraftChange(current=>({...current,title:event.target.value}))}/>:null;
  // The same saved media relationship links externally in view mode, but opens
  // the existing scoped Galaxy Media attribute editor while an article is edited.
  const mediaEditLinks=editingReady&&mediaScopeId?links
    .filter(link=>String(link?.id||'').startsWith('media:'))
    .map(link=>({id:'edit:'+link.id,label:link.label||t('uiExtra.searchUI.mediaAttributes'),href:galaxyMediaHref(mediaScopeId,String(link.id).slice(6))}))
    .filter(link=>link.href):[];
  const visibleLinks=mediaEditLinks.length?links.filter(link=>!String(link?.id||'').startsWith('media:')):links;
  const visibleRelations=mediaEditLinks.length?[...relationLinks,...mediaEditLinks]:relationLinks;
  return <WorkSummaryCard title={title} titleEditor={titleEditor} kicker={styleTag?styleTagKicker:null} source={source} scopeId={scopeId} date={editingReady?'':date} actions={editorActions}
    body={editingReady||richBody||styleTag?'':body} hidden={hidden} relationLinks={visibleRelations} links={visibleLinks}
    destinations={destinations} className={styleTag?'scope-article-style-tag-hit':''} onClickCapture={onClickCapture}>
    {styleTag&&!editingReady&&styleIntroText?<div className="scope-style-tag-search-intro">{styleIntroText}</div>:null}
    {richBody&&!editingReady?<div className="scope-article-block-display"><BlockNoteEditor editable={false} initialContent={body}/></div>:null}
    {editingReady?<ArticleInlineEditor draft={editorDraft} onChange={onDraftChange} showHidden={showHidden} attributeFields={attributeFields} showBodyEditor={showBodyEditor} attributeTitle={attributeTitle} mediaScopeId={mediaScopeId}/>:null}
    {children}
  </WorkSummaryCard>;
}
