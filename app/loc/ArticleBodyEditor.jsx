'use client';

import BlockNoteEditor from './BlockNoteEditor';

// Shared WYSIWYG editor for article lists and the article publisher.
export default function ArticleBodyEditor({editorKey,content,onBlocksChange,onHtmlChange,canInsertImage=true}){
  return <BlockNoteEditor
    key={editorKey}
    initialContent={content}
    onChange={onBlocksChange}
    onHtmlChange={onHtmlChange}
    canInsertImage={canInsertImage}
  />;
}
