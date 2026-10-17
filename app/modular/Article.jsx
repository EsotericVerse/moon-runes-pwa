'use client';

import {WorkSummaryCard} from './ui';
import BlockNoteEditor from '../loc/BlockNoteEditor';

function isInteractiveTarget(target){
  return Boolean(target?.closest?.('a,button,input,select,textarea,summary,[role="button"],[contenteditable="true"]'));
}

// Shared article(uid) list module for Search and Culture.
export default function Article({uid,title,source='',scopeId='',date='',body='',hidden=false,relationLinks=[],links=[],destinations=[],editable=false,editing=false,onEdit,children=null}){
  const richBody=typeof body==='string'&&/<[a-z][^>]*>/i.test(body);
  const onClickCapture=editable&&!editing&&typeof onEdit==='function'?event=>{
    if(!isInteractiveTarget(event.target))onEdit(uid);
  }:undefined;
  return <WorkSummaryCard title={title} source={source} scopeId={scopeId} date={date}
    body={editing||richBody?'':body} hidden={hidden} relationLinks={relationLinks} links={links}
    destinations={destinations} onClickCapture={onClickCapture}>
    {richBody&&!editing?<div className="scope-article-block-display"><BlockNoteEditor editable={false} initialContent={body}/></div>:null}
    {children}
  </WorkSummaryCard>;
}
