'use client';

import {useRef} from 'react';

function textFromInline(content){
  if(typeof content==='string')return content;
  if(Array.isArray(content))return content.map(textFromInline).join('');
  if(!content||typeof content!=='object')return '';
  if(typeof content.text==='string')return content.text;
  return textFromInline(content.content||'');
}

export function plainTextToBlocks(value=''){
  return String(value??'').replace(/\r/g,'').split('\n').map(line=>({type:'paragraph',content:line}));
}

export function normalizeBlocks(value,fallback=''){
  if(Array.isArray(value))return value.length?value:plainTextToBlocks(fallback);
  if(value&&typeof value==='object'&&Array.isArray(value.blocks))return value.blocks.length?value.blocks:plainTextToBlocks(fallback);
  if(value&&typeof value==='object'&&typeof value.html==='string')return {html:value.html};
  if(typeof value==='string'&&value.trim().startsWith('<'))return {html:value};
  return plainTextToBlocks(value||fallback||'');
}

export function blocksToPlainText(value){
  const normalized=normalizeBlocks(value);
  if(!Array.isArray(normalized)){
    const html=String(normalized?.html||'');
    if(typeof DOMParser==='undefined')return html.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,' ').trim();
    const parsed=new DOMParser().parseFromString(html,'text/html');
    return String(parsed.body.textContent||'').trim();
  }
  const out=[];
  function walk(items){
    for(const block of items){
      const text=textFromInline(block?.content).trim();
      if(text)out.push(text);
      if(Array.isArray(block?.children))walk(block.children);
    }
  }
  walk(normalized);
  return out.join('\n');
}

function escapeHtml(value){
  return String(value||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function initialHtmlOf(value){
  const normalized=normalizeBlocks(value);
  if(!Array.isArray(normalized))return String(normalized?.html||'');
  return normalized.map(block=>'<p>'+escapeHtml(textFromInline(block?.content))+'</p>').join('');
}

// Native HTML editor. Page display never mounts this component; the source HTML
// is preserved until a user actually edits it. No hydration callbacks.
export default function RichBlockEditor({initialContent,editable=true,onChange=null,onHtmlChange=null,className=''}){
  const initial=useRef(null);
  if(initial.current===null)initial.current=initialHtmlOf(initialContent);
  function emit(event){
    const html=event.currentTarget.innerHTML;
    const text=event.currentTarget.innerText||event.currentTarget.textContent||'';
    onChange?.(plainTextToBlocks(text));
    onHtmlChange?.(html);
  }
  return <div className={'scope-rich-editor '+(editable?'is-editable ':'is-readonly ')+className}>
    <div
      className="scope-rich-surface"
      contentEditable={editable}
      suppressContentEditableWarning
      role={editable?'textbox':undefined}
      aria-label={editable?'文字編輯器':undefined}
      aria-multiline={editable||undefined}
      onInput={editable?emit:undefined}
      dangerouslySetInnerHTML={{__html:initial.current}}
    />
  </div>;
}
