'use client';

import {useCreateBlockNote} from '@blocknote/react';
import {BlockNoteView} from '@blocknote/mantine';

export function plainTextToBlocks(value=''){
  const lines=String(value??'').replace(/\r/g,'').split('\n');
  const content=lines.length?lines:[''];
  return content.map(line=>({type:'paragraph',content:line}));
}

export function normalizeBlocks(value,fallback=''){
  if(Array.isArray(value)&&value.length)return value;
  return plainTextToBlocks(fallback);
}

function inlineText(content){
  if(typeof content==='string')return content;
  if(!Array.isArray(content))return '';
  return content.map(item=>{
    if(typeof item==='string')return item;
    if(item&&typeof item==='object'){
      if(typeof item.text==='string')return item.text;
      if(typeof item.content==='string')return item.content;
    }
    return '';
  }).join('');
}

export function blocksToPlainText(blocks=[]){
  const out=[];
  const walk=items=>{
    for(const block of Array.isArray(items)?items:[]){
      const text=inlineText(block?.content).trimEnd();
      if(text)out.push(text);
      if(Array.isArray(block?.children)&&block.children.length)walk(block.children);
    }
  };
  walk(blocks);
  return out.join('\n').trim();
}

export default function RichBlockEditor({
  initialContent,
  editable=true,
  onChange=null,
  className=''
}){
  const editor=useCreateBlockNote({initialContent:normalizeBlocks(initialContent)});
  return <div className={'scope-blocknote '+className}>
    <BlockNoteView
      editor={editor}
      editable={editable}
      onChange={onChange?()=>onChange(editor.document):undefined}
    />
  </div>;
}
