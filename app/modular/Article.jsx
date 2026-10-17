'use client';

import {WorkSummaryCard} from './ui';
import BlockNoteEditor from '../loc/BlockNoteEditor';
import ArticleBodyEditor from '../loc/ArticleBodyEditor';
import {UI_COPY} from '../i18n/ui-copy';
import {blocksToPlainText} from '../loc/blocknote-content.mjs';

function isInteractiveTarget(target){
  return Boolean(target?.closest?.('a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]'));
}

// Shared article(uid) list module for Search and Culture.
export function ArticleInlineEditor({draft,onChange,onSave,onCancel,busy=false,error='',showHidden=false}){
  if(!draft)return null;
  return <div className="scope-editor scope-search-article-editor">
    <div className="scope-article-editor-actions">
      <button type="button" className="loc-button primary" disabled={busy} onClick={onSave}>{busy?UI_COPY.common.saving:UI_COPY.common.save}</button>
      <button type="button" className="loc-button" disabled={busy} onClick={onCancel}>{UI_COPY.common.cancel}</button>
      {error?<span className="scope-inline-save-status scope-error" role="alert">{error}</span>:null}
    </div>
    <label>{UI_COPY.common.title}<input value={draft.title||''} onChange={event=>onChange(current=>({...current,title:event.target.value}))}/></label>
    <div className="scope-editor-blocknote"><span>{UI_COPY.common.body}</span>
      <ArticleBodyEditor
        editorKey={'article:'+String(draft.editorKey||'')}
        content={draft.bodyHtml??draft.bodyBlocks}
        onBlocksChange={blocks=>onChange(current=>({...current,bodyBlocks:blocks,body:blocksToPlainText(blocks)}))}
        onHtmlChange={html=>onChange(current=>({...current,bodyHtml:html}))}
      />
    </div>
    {showHidden?<div className="scope-editor-options">
      <label><input type="checkbox" checked={draft.hidden===true} onChange={event=>onChange(current=>({...current,hidden:event.target.checked}))}/>{UI_COPY.common.hiddenFromSearch}</label>
    </div>:null}
  </div>;
}

export default function Article({uid,title,source='',scopeId='',date='',body='',hidden=false,relationLinks=[],links=[],destinations=[],editable=false,editing=false,onEdit,editorDraft=null,onDraftChange,onSave,onCancel,editBusy=false,editError='',showHidden=false,styleTag=false,styleTagKicker=null,styleIntroText='',children=null}){
  const richBody=typeof body==='string'&&/<[a-z][^>]*>/i.test(body);
  const onClickCapture=editable&&!editing&&typeof onEdit==='function'?event=>{
    if(!isInteractiveTarget(event.target))onEdit(uid);
  }:undefined;
  const editingReady=editing&&Boolean(editorDraft);
  return <WorkSummaryCard title={title} kicker={styleTag?styleTagKicker:null} source={source} scopeId={scopeId} date={date}
    body={editingReady||richBody||styleTag?'':body} hidden={hidden} relationLinks={relationLinks} links={links}
    destinations={destinations} className={styleTag?'scope-article-style-tag-hit':''} onClickCapture={onClickCapture}>
    {styleTag&&!editingReady&&styleIntroText?<div className="scope-style-tag-search-intro">{styleIntroText}</div>:null}
    {richBody&&!editingReady?<div className="scope-article-block-display"><BlockNoteEditor editable={false} initialContent={body}/></div>:null}
    {editingReady?<ArticleInlineEditor draft={editorDraft} onChange={onDraftChange} onSave={onSave} onCancel={onCancel} busy={editBusy} error={editError} showHidden={showHidden}/>:null}
    {children}
  </WorkSummaryCard>;
}
