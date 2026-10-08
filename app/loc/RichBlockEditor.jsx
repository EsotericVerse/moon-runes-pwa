'use client';

import dynamic from 'next/dynamic';

const BlockNoteEditorClient=dynamic(()=>import('./BlockNoteEditorClient'),{
  ssr:false,
  loading:()=>null
});

function textFromInline(content){
  if(typeof content==='string')return content;
  if(Array.isArray(content))return content.map(textFromInline).filter(Boolean).join(' ');
  if(!content||typeof content!=='object')return '';
  if(typeof content.text==='string')return content.text;
  const parts=[];
  if(content.content!==undefined)parts.push(textFromInline(content.content));
  if(Array.isArray(content.rows))parts.push(textFromInline(content.rows));
  if(Array.isArray(content.cells))parts.push(textFromInline(content.cells));
  return parts.filter(Boolean).join(' ');
}

export function plainTextToBlocks(value=''){
  const lines=String(value??'').replace(/\r/g,'').split('\n');
  return (lines.length?lines:['']).map(line=>({type:'paragraph',content:line}));
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
    if(typeof window==='undefined')return html.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
    const parsed=new DOMParser().parseFromString(html,'text/html');
    return String(parsed.body.innerText||parsed.body.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
  }
  const out=[];
  const walk=items=>{
    for(const block of Array.isArray(items)?items:[]){
      const text=textFromInline(block?.content).replace(/\s+/g,' ').trim();
      if(text)out.push(text);
      const caption=String(block?.props?.caption||block?.props?.name||'').trim();
      if(caption)out.push(caption);
      if(Array.isArray(block?.children)&&block.children.length)walk(block.children);
    }
  };
  walk(normalized);
  return out.join('\n').trim();
}

export default function RichBlockEditor({
  initialContent,
  editable=true,
  onChange=null,
  onHtmlChange=null,
  className=''
}){
  const normalized=normalizeBlocks(initialContent);
  const initialBlocks=Array.isArray(normalized)?normalized:plainTextToBlocks('');
  const initialHtml=Array.isArray(normalized)?'':String(normalized?.html||'');
  return <div className={'scope-blocknote '+(editable?'is-editable ':'is-readonly ')+className}>
    <BlockNoteEditorClient
      initialBlocks={initialBlocks}
      initialHtml={initialHtml}
      editable={editable}
      onChange={onChange}
      onHtmlChange={onHtmlChange}
    />
  </div>;
}
