'use client';

import dynamic from 'next/dynamic';
import {looksLikeMarkdown,normalizeBlocks,plainTextToBlocks} from './blocknote-content.mjs';

// BlockNote itself is browser-only; keep this as the single public editor entrypoint.
const BlockNoteCanvas=dynamic(()=>import('./BlockNoteEditorClient'),{
  ssr:false,
  loading:()=>null
});

export default function BlockNoteEditor({
  initialContent,
  editable=true,
  onChange=null,
  onHtmlChange=null,
  canInsertImage=true,
  className=''
}){
  const normalized=normalizeBlocks(initialContent);
  const initialBlocks=Array.isArray(normalized)?normalized:plainTextToBlocks('');
  const initialHtml=Array.isArray(normalized)?'':String(normalized?.html||'');
  const initialMarkdown=!initialHtml&&looksLikeMarkdown(initialContent)?String(initialContent):'';
  return <div className={'scope-blocknote '+(editable?'is-editable ':'is-readonly ')+className}>
    <BlockNoteCanvas
      initialBlocks={initialBlocks}
      initialHtml={initialHtml}
      initialMarkdown={initialMarkdown}
      editable={editable}
      onChange={onChange}
      onHtmlChange={onHtmlChange}
      canInsertImage={canInsertImage}
    />
  </div>;
}
