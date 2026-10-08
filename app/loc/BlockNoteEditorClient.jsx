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
  const editor=useCreateBlockNote({
    initialContent:initialBlocks,
    domAttributes:{editor:{'aria-label':editable?'文字編輯器':'文字內容'}}
  });
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

  function editLink(event){
    event?.preventDefault?.();
    const current=editor.getSelectedLinkUrl?.()||'';
    const selected=editor.getSelectedText?.()||'';
    if(!selected&&!current){
      globalThis.alert?.('請先選取要加上超連結的文字。');
      return;
    }
    const next=globalThis.prompt?.('超連結網址',current||'https://');
    if(next===null||next===undefined)return;
    editor.createLink(String(next).trim());
    emit();
  }

  function removeLink(event){
    event?.preventDefault?.();
    editor.createLink('');
    emit();
  }

  return <>
    {editable?<div className="scope-blocknote-linkbar">
      <button type="button" className="loc-button" onMouseDown={event=>event.preventDefault()} onClick={editLink}>連結</button>
      <button type="button" className="loc-button" onMouseDown={event=>event.preventDefault()} onClick={removeLink}>移除連結</button>
    </div>:null}
    <BlockNoteView
      editor={editor}
      editable={editable}
      onChange={editable?emit:undefined}
    />
  </>;
}
