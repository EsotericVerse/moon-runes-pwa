'use client';

import dynamic from 'next/dynamic';
import {blocksToPlainText,looksLikeMarkdown,normalizeBlocks,plainTextToBlocks} from './blocknote-content.mjs';

// BlockNote itself is browser-only; keep this as the single public editor entrypoint.
const BlockNoteCanvas=dynamic(()=>import('./BlockNoteEditorClient'),{
  ssr:false,
  loading:()=>null
});

export default function BlockNoteEditor({
  editorKey,
  initialContent,
  content,
  editable=true,
  onChange=null,
  onBlocksChange=null,
  onPlainTextChange=null,
  onHtmlChange=null,
  canInsertImage=true,
  className=''
}){
  const source=initialContent===undefined?content:initialContent;
  const normalized=normalizeBlocks(source);
  const initialBlocks=Array.isArray(normalized)?normalized:plainTextToBlocks('');
  const initialHtml=Array.isArray(normalized)?'':String(normalized?.html||'');
  const initialMarkdown=!initialHtml&&looksLikeMarkdown(source)?String(source):'';
  const handleChange=blocks=>{
    onChange?.(blocks);
    onBlocksChange?.(blocks);
    onPlainTextChange?.(blocksToPlainText(blocks));
  };
  return <div className={'scope-blocknote '+(editable?'is-editable ':'is-readonly ')+className}>
    <BlockNoteCanvas
      key={editorKey}
      initialBlocks={initialBlocks}
      initialHtml={initialHtml}
      initialMarkdown={initialMarkdown}
      editable={editable}
      onChange={onChange||onBlocksChange||onPlainTextChange?handleChange:null}
      onHtmlChange={onHtmlChange}
      canInsertImage={canInsertImage}
    />
  </div>;
}
