'use client';

import BlockNoteEditor from './BlockNoteEditor';
import {blocksToPlainText} from './blocknote-content.mjs';

// Shared WYSIWYG editor for article lists and the article publisher.
export default function ArticleBodyEditor({editorKey,content,onBlocksChange,onHtmlChange,onPlainTextChange,canInsertImage=true}){
  const handleChange=blocks=>{
    onBlocksChange?.(blocks);
    onPlainTextChange?.(blocksToPlainText(blocks));
  };
  return <BlockNoteEditor
    key={editorKey}
    initialContent={content}
    onChange={onPlainTextChange?handleChange:onBlocksChange}
    onHtmlChange={onHtmlChange}
    canInsertImage={canInsertImage}
  />;
}
