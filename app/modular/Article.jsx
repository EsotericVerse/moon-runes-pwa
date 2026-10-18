'use client';

import {WorkSummaryCard} from './ui';
import BlockNoteEditor from '../loc/BlockNoteEditor';
import ArticleBodyEditor from '../loc/ArticleBodyEditor';
import {UI_COPY} from '../i18n/ui-copy';
import {blocksToPlainText} from '../loc/blocknote-content.mjs';
import UiText from '../i18n/UiText';
import {isInteractiveContentTarget} from '../loc/inline-edit-interaction.mjs';


// Shared article(uid) list module for Search and Culture.
export function ArticleInlineEditor({draft,onChange,showHidden=false,editorExtra=null}){
  if(!draft)return null;
  return <div className="scope-editor scope-search-article-editor">
    <div className="scope-editor-blocknote"><span>{UI_COPY.common.body}</span>
      <ArticleBodyEditor
        editorKey={'article:'+String(draft.editorKey||'')}
        content={draft.bodyHtml??draft.bodyBlocks}
        onBlocksChange={blocks=>onChange(current=>({...current,bodyBlocks:blocks,body:blocksToPlainText(blocks)}))}
        onHtmlChange={html=>onChange(current=>({...current,bodyHtml:html}))}
      />
    </div>
    {showHidden?<div className="scope-editor-options">
      <label><input type="checkbox" checked={draft.hidden===true} onChange={event=>onChange(current=>({...current,hidden:event.target.checked,attrs:current.attrs?{...current.attrs,searchable:!event.target.checked}:current.attrs}))}/>{UI_COPY.common.hiddenFromSearch}</label>
    </div>:null}
    {editorExtra}
  </div>;
}

export default function Article({uid,title,source='',scopeId='',date='',body='',hidden=false,relationLinks=[],links=[],destinations=[],editable=false,editing=false,onEdit,editorDraft=null,onDraftChange,onSave,onDelete,onCancel,editBusy=false,editError='',showHidden=false,editorExtra=null,styleTag=false,styleTagKicker=null,styleIntroText='',children=null}){
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
  return <WorkSummaryCard title={title} titleEditor={titleEditor} kicker={styleTag?styleTagKicker:null} source={source} scopeId={scopeId} date={editingReady?'':date} actions={editorActions}
    body={editingReady||richBody||styleTag?'':body} hidden={hidden} relationLinks={relationLinks} links={links}
    destinations={destinations} className={styleTag?'scope-article-style-tag-hit':''} onClickCapture={onClickCapture}>
    {styleTag&&!editingReady&&styleIntroText?<div className="scope-style-tag-search-intro">{styleIntroText}</div>:null}
    {richBody&&!editingReady?<div className="scope-article-block-display"><BlockNoteEditor editable={false} initialContent={body}/></div>:null}
    {editingReady?<ArticleInlineEditor draft={editorDraft} onChange={onDraftChange} showHidden={showHidden} editorExtra={editorExtra}/>:null}
    {children}
  </WorkSummaryCard>;
}
