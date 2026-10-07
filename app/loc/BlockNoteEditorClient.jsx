'use client';

import {useEffect,useRef} from 'react';
import {useCreateBlockNote} from '@blocknote/react';
import {BlockNoteView} from '@blocknote/mantine';

export default function BlockNoteEditorClient({
  initialBlocks=[],
  initialHtml='',
  editable=true,
  onChange=null,
  onHtmlChange=null
}){
  const editor=useCreateBlockNote({initialContent:initialBlocks});
  const hydratedLegacyHtml=useRef(false);

  useEffect(()=>{
    if(hydratedLegacyHtml.current)return;
    hydratedLegacyHtml.current=true;
    if(initialHtml){
      const blocks=editor.tryParseHTMLToBlocks(initialHtml);
      editor.replaceBlocks(editor.document,blocks);
    }
    onHtmlChange?.(editor.blocksToHTMLLossy(editor.document));
  },[editor,initialHtml,onHtmlChange]);

  const emit=()=>{
    const blocks=editor.document;
    onChange?.(blocks);
    onHtmlChange?.(editor.blocksToHTMLLossy(blocks));
  };

  return <BlockNoteView
    editor={editor}
    editable={editable}
    onChange={editable?emit:undefined}
  />;
}
