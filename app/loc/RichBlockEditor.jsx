'use client';

import {useEffect,useRef} from 'react';

const ALLOWED_TAGS=new Set(['P','BR','STRONG','B','EM','I','U','S','H2','H3','UL','OL','LI','BLOCKQUOTE','DIV','SPAN','A','DETAILS','SUMMARY']);
const ALLOWED_CLASSES=new Set(['loc-rich-bubble','loc-rich-box','home-status-details','home-status-reference']);

function escapeHtml(value=''){
  return String(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function legacyBlocksToHtml(blocks=[]){
  return (Array.isArray(blocks)?blocks:[]).map(block=>{
    if(typeof block==='string')return '<p>'+escapeHtml(block)+'</p>';
    const type=String(block?.type||'paragraph');
    const raw=typeof block?.content==='string'
      ?block.content
      :Array.isArray(block?.content)
        ?block.content.map(item=>typeof item==='string'?item:String(item?.text||'')).join('')
        :'';
    const text=escapeHtml(raw);
    if(type==='heading'){
      const level=Number(block?.props?.level)===2?2:3;
      return '<h'+level+'>'+text+'</h'+level+'>';
    }
    if(type==='bulletListItem')return '<ul><li>'+text+'</li></ul>';
    if(type==='numberedListItem')return '<ol><li>'+text+'</li></ol>';
    return '<p>'+text+'</p>';
  }).join('');
}

export function plainTextToBlocks(value=''){
  const html=String(value??'')
    .replace(/\r/g,'')
    .split('\n')
    .map(line=>line?'<p>'+escapeHtml(line)+'</p>':'<p><br></p>')
    .join('');
  return {html};
}

export function normalizeBlocks(value,fallback=''){
  if(value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.html==='string')return {html:value.html};
  if(Array.isArray(value))return {html:legacyBlocksToHtml(value)};
  if(typeof value==='string'&&value.trim().startsWith('<'))return {html:value};
  return plainTextToBlocks(value||fallback||'');
}

function sanitizeHtml(value=''){
  if(typeof window==='undefined')return String(value||'');
  const doc=new DOMParser().parseFromString('<div>'+String(value||'')+'</div>','text/html');
  const root=doc.body.firstElementChild;
  const clean=node=>{
    for(const child of [...node.children]){
      if(!ALLOWED_TAGS.has(child.tagName)){
        child.replaceWith(...child.childNodes);
        continue;
      }
      for(const attr of [...child.attributes]){
        const name=attr.name.toLowerCase();
        const keepClass=name==='class'&&attr.value.split(/\s+/).every(cls=>ALLOWED_CLASSES.has(cls));
        const keepHref=child.tagName==='A'&&name==='href'&&/^(?:https?:|mailto:|#|\?|\/(?!\/))/i.test(attr.value);
        if(!keepClass&&!keepHref)child.removeAttribute(attr.name);
      }
      if(child.tagName==='A')child.setAttribute('rel','noreferrer');
      clean(child);
    }
  };
  clean(root);
  return root.innerHTML;
}

export function blocksToPlainText(value){
  const doc=normalizeBlocks(value);
  if(typeof window==='undefined')return String(doc.html||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const parsed=new DOMParser().parseFromString(doc.html||'','text/html');
  return String(parsed.body.innerText||parsed.body.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
}

export default function RichBlockEditor({
  initialContent,
  editable=true,
  onChange=null,
  className=''
}){
  const editorRef=useRef(null);
  const normalized=normalizeBlocks(initialContent);

  useEffect(()=>{
    if(editorRef.current&&editorRef.current.innerHTML!==normalized.html){
      editorRef.current.innerHTML=sanitizeHtml(normalized.html);
    }
  },[normalized.html]);

  const emit=()=>{
    if(!onChange||!editorRef.current)return;
    onChange({html:sanitizeHtml(editorRef.current.innerHTML)});
  };

  const command=(name,value=null)=>{
    editorRef.current?.focus();
    document.execCommand(name,false,value);
    emit();
  };

  const insertBox=kind=>{
    editorRef.current?.focus();
    const klass=kind==='bubble'?'loc-rich-bubble':'loc-rich-box';
    document.execCommand('insertHTML',false,'<div class="'+klass+'"><p>輸入文字…</p></div><p><br></p>');
    emit();
  };

  return <div className={'scope-rich-editor '+(editable?'is-editable ':'is-readonly ')+className}>
    {editable?<div className="scope-rich-toolbar" role="toolbar" aria-label="文字編輯工具">
      <button type="button" onClick={()=>command('bold')}><strong>B</strong></button>
      <button type="button" onClick={()=>command('italic')}><em>I</em></button>
      <button type="button" onClick={()=>command('formatBlock','h2')}>H2</button>
      <button type="button" onClick={()=>command('insertUnorderedList')}>• List</button>
      <button type="button" onClick={()=>insertBox('bubble')}>文字泡泡</button>
      <button type="button" onClick={()=>insertBox('box')}>文字框</button>
    </div>:null}
    <div
      ref={editorRef}
      className={'scope-rich-surface '+(editable?'is-editable':'is-readonly')}
      contentEditable={editable}
      suppressContentEditableWarning
      onInput={emit}
      aria-label={editable?'文字編輯器':'文字內容'}
    />
  </div>;
}
