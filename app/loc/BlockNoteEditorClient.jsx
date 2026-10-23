'use client';
import FieldText from '../i18n/FieldText';

import {useEffect,useRef,useState} from 'react';
import {useCreateBlockNote} from '@blocknote/react';
import {BlockNoteView} from '@blocknote/mantine';
import {canonicalBlockNoteBlocks,canonicalBlockNoteHtml,BlockNoteContent} from './blocknote-content.mjs';

export default function BlockNoteEditorClient({
  initialBlocks=[],
  initialHtml='',
  initialMarkdown='',
  editable=true,
  canInsertImage=true,
  onChange=null,
  onHtmlChange=null
}){
  const editor=useCreateBlockNote({
    initialContent:canonicalBlockNoteBlocks(initialBlocks),
    domAttributes:{editor:{'aria-label':editable?'文字編輯器':'文字內容'}}
  });
  const hydratedLegacyHtml=useRef(false);
  const htmlEmitVersion=useRef(0);
  const lastEmittedBlocks=useRef('');
  const [imageWidthTarget,setImageWidthTarget]=useState(null);

  useEffect(()=>{
    if(hydratedLegacyHtml.current)return;
    hydratedLegacyHtml.current=true;
    if(!initialHtml&&!initialMarkdown)return;
    let mounted=true;
    // HTML imports can be asynchronous; never pass a Promise to replaceBlocks.
    const apply=blocks=>{
      if(mounted)editor.replaceBlocks(editor.document,canonicalBlockNoteBlocks(blocks));
    };
    try{
      const parsed=initialHtml
        ?editor.tryParseHTMLToBlocks(canonicalBlockNoteHtml(initialHtml))
        :editor.tryParseMarkdownToBlocks(initialMarkdown);
      if(typeof parsed?.then==='function')parsed.then(apply).catch(error=>console.error('BlockNote HTML import failed',error));
      else apply(parsed);
    }catch(error){
      console.error('BlockNote HTML import failed',error);
    }
    return ()=>{mounted=false;};
  },[editor,initialHtml,initialMarkdown]);

  const emit=()=>{
    // BlockNote JSON is the editing source of truth. Empty paragraphs must
    // remain empty blocks, never literal ProseMirror U+FFFC characters.
    const blocks=canonicalBlockNoteBlocks(editor.document);
    const fingerprint=JSON.stringify(blocks);
    if(fingerprint===lastEmittedBlocks.current)return;
    lastEmittedBlocks.current=fingerprint;
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
    let insertionTarget=null;
    try{
      insertionTarget=editor.getTextCursorPosition?.()?.block||null;
    }catch{}
    const entered=globalThis.prompt?.('圖片網址（直接圖片連結，不上傳檔案）','https://');
    if(entered===null||entered===undefined)return;
    const image=BlockNoteContent.image.imageBlockForUrl(entered);
    if(!image){
      globalThis.alert?.('請輸入有效的 http:// 或 https:// 圖片網址。');
      return;
    }
    try{
      const findImage=blocks=>{
        for(const block of blocks||[]){
          if(block.type==='image')return block;
          const child=findImage(block.children);
          if(child)return child;
        }
        return null;
      };
      const existing=findImage(editor.document);
      if(existing){
        editor.updateBlock(existing,image);
      }else if(!canInsertImage){
        globalThis.alert?.('這個文字框架已有一張圖片。請先移除原圖，再插入其他位置。');
        return;
      }else if(!insertionTarget){
        globalThis.alert?.('請先點選要放置圖片的文字位置，再插入圖片。');
        return;
      }else{
        const current=insertionTarget;
        if(BlockNoteContent.image.isEmptyImageTarget(current)){
          editor.updateBlock(current,image);
        }else if(current){
          editor.insertBlocks([image],current,'after');
        }else{
          editor.replaceBlocks(editor.document,[image]);
        }
      }
      const insertedImage=findImage(editor.document);
      if(insertedImage)setImageWidthTarget({
        id:insertedImage.id,width:Number(insertedImage.props.previewWidth)||480
      });
      emit();
    }catch(error){
      console.error('BlockNote image URL insert failed',error);
      globalThis.alert?.('圖片連結插入失敗，請重新嘗試。');
    }
  }

  // A selected BlockNote image keeps its native previewWidth prop; no second
  // sizing field is stored outside the editor's own document.
  function refreshImageWidthTarget(){
    try{
      const selection=editor.getSelection();
      const block=selection?.blocks?.length===1?selection.blocks[0]:
        selection?.blocks?.length?null:editor.getTextCursorPosition().block;
      setImageWidthTarget(block?.type==='image'
        ?{id:block.id,width:Number(block.props.previewWidth)||480}:null);
    }catch{
      setImageWidthTarget(null);
    }
  }

  function resizeSelectedImage(value){
    const width=Number(value);
    if(!Number.isInteger(width)||width<160||width>800||!imageWidthTarget)return;
    const block=editor.getBlock(imageWidthTarget.id);
    if(block?.type!=='image')return;
    editor.updateBlock(block,{props:{previewWidth:width}});
    setImageWidthTarget({id:block.id,width});
    emit();
  }

  function removeLink(event){
    event?.preventDefault?.();
    editor.createLink('');
    emit();
  }

  return <>
    {editable?<div className="scope-blocknote-linkbar">
      <button type="button" className="loc-button" onMouseDown={event=>event.preventDefault()} onClick={editLink}><FieldText text="連結"/></button>
      <button type="button" className="loc-button" onMouseDown={event=>event.preventDefault()} onClick={removeLink}><FieldText text="移除連結"/></button>
      {canInsertImage?<button type="button" className="loc-button" onMouseDown={event=>event.preventDefault()} onClick={insertImageUrl}><FieldText text="圖片網址"/></button>:null}
      {imageWidthTarget?<label className="scope-blocknote-image-width">
        <FieldText text="圖片寬度（px）"/>
        <select aria-label="圖片寬度（px）" value={imageWidthTarget.width}
          onChange={event=>resizeSelectedImage(event.target.value)}>
          {imageWidthTarget.width<160||imageWidthTarget.width>800||imageWidthTarget.width%20!==0
            ?<option value={imageWidthTarget.width}>{imageWidthTarget.width}</option>:null}
          {Array.from({length:33},(_,index)=>160+index*20).map(width=>
            <option key={width} value={width}>{width}</option>)}
        </select>
      </label>:null}
    </div>:null}
    <BlockNoteView
      editor={editor}
      editable={editable}
      onChange={editable?()=>{
        emit();
        if(imageWidthTarget){
          const block=editor.getBlock(imageWidthTarget.id);
          if(block?.type==='image'){
            const width=Number(block.props.previewWidth)||480;
            if(width!==imageWidthTarget.width)setImageWidthTarget({id:block.id,width});
          }else setImageWidthTarget(null);
        }
      }:undefined}
      onSelectionChange={editable?refreshImageWidthTarget:undefined}
      onClickCapture={editable?event=>{
        const node=event.target.closest?.('.bn-editor img');
        const blockId=node?.closest('[data-id]')?.getAttribute('data-id');
        const block=blockId?editor.getBlock(blockId):null;
        if(block?.type==='image'){
          setImageWidthTarget({id:block.id,width:Number(block.props.previewWidth)||480});
        }
      }:undefined}
    />
  </>;
}
