'use client';

import dynamic from 'next/dynamic';
import {normalizeBlocks,plainTextToBlocks} from './blocknote-content.mjs';

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
  className=''
}){
  const normalized=normalizeBlocks(initialContent);
  const initialBlocks=Array.isArray(normalized)?normalized:plainTextToBlocks('');
  const initialHtml=Array.isArray(normalized)?'':String(normalized?.html||'');
  return <div className={'scope-blocknote '+(editable?'is-editable ':'is-readonly ')+className}>
    <BlockNoteCanvas
      initialBlocks={initialBlocks}
      initialHtml={initialHtml}
      editable={editable}
      onChange={onChange}
      onHtmlChange={onHtmlChange}
    />
  </div>;
}
