'use client';

import {useEffect,useRef} from 'react';
import {useCreateBlockNote} from '@blocknote/react';
import {BlockNoteView} from '@blocknote/mantine';
import {canonicalBlockNoteBlocks,canonicalBlockNoteHtml} from './blocknote-serialization.mjs';
import {imageBlockForUrl,isEmptyImageTarget} from './blocknote-image-url.mjs';

export default function BlockNoteEditorClient({
  initialBlocks=[],
  initialHtml='',
  editable=true,
  onChange=null,
  onHtmlChange=null
}){
  const editor=useCreateBlockNote({
    initialContent:canonicalBlockNoteBlocks(initialBlocks),
    domAttributes:{editor:{'aria-label':editable?'文字編輯器':'文字內容'}}
  });
  const hydratedLegacyHtml=useRef(false);
  const htmlEmitVersion=useRef(0);

  useEffect(()=>{
    if(hydratedLegacyHtml.current)return;
    hydratedLegacyHtml.current=true;
    if(!initialHtml)return;
    let mounted=true;
    // HTML imports can be asynchronous; never pass a Promise to replaceBlocks.
    const apply=blocks=>{
      if(mounted)editor.replaceBlocks(editor.document,canonicalBlockNoteBlocks(blocks));
    };
    try{
      const parsed=editor.tryParseHTMLToBlocks(canonicalBlockNoteHtml(initialHtml));
      if(typeof parsed?.then==='function')parsed.then(apply).catch(error=>console.error('BlockNote HTML import failed',error));
      else apply(parsed);
    }catch(error){
      console.error('BlockNote HTML import failed',error);
    }
    return ()=>{mounted=false;};
  },[editor,initialHtml]);

  const emit=()=>{
    // BlockNote JSON is the editing source of truth. Empty paragraphs must
    // remain empty blocks, never literal ProseMirror U+FFFC characters.
    const blocks=canonicalBlockNoteBlocks(editor.document);
    onChange?.(blocks);
    if(!onHtmlChange)return;
    const version=++htmlEmitVersion.current;
    const exported=editor.blocksToHTMLLossy(blocks);
    // Handle sync (current BlockNote) and async HTML exporters safely.
    const deliver=html=>{
      if(version===htmlEmitVersion.current)onHtmlChange(canonicalBlockNoteHtml(html));
    };
    if(typeof exported==='string')deliver(exported);
    else Promise.resolve(exported).then(deliver).catch(error=>{
      console.error('BlockNote HTML export failed',error);
    });
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

  function insertImageUrl(event){
    event?.preventDefault?.();
    const entered=globalThis.prompt?.('圖片網址（直接圖片連結，不上傳檔案）','https://');
    if(entered===null||entered===undefined)return;
    const image=imageBlockForUrl(entered);
    if(!image){
      globalThis.alert?.('請輸入有效的 http:// 或 https:// 圖片網址。');
      return;
    }
    try{
      const current=editor.getTextCursorPosition?.()?.block||editor.document?.at(-1);
      if(isEmptyImageTarget(current)){
        // Empty bubble => a single image block, with no orphan text paragraph.
        editor.updateBlock(current,image);
      }else if(current){
        editor.insertBlocks([image],current,'after');
      }else{
        editor.replaceBlocks(editor.document,[image]);
      }
      emit();
    }catch(error){
      console.error('BlockNote image URL insert failed',error);
      globalThis.alert?.('圖片連結插入失敗，請重新嘗試。');
    }
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
      <button type="button" className="loc-button" onMouseDown={event=>event.preventDefault()} onClick={insertImageUrl}>圖片網址</button>
    </div>:null}
    <BlockNoteView
      editor={editor}
      editable={editable}
      onChange={editable?emit:undefined}
    />
  </>;
}
