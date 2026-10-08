// BlockNote's document (JSON blocks) is canonical. HTML is only a legacy
// interoperability format; it must never turn an empty paragraph into U+FFFC.
const objectOnlyText=/^(?=[\s\uFFFC]*\uFFFC)[\s\uFFFC]+$/u;
const objectOnlyHtml=/(?:\uFFFC|&#0*65532;|&#x0*fffc;)/i;
const blankHtmlParagraph=/<p\b([^>]*)>(\s*(?:(?:\uFFFC|&#0*65532;|&#x0*fffc;)\s*)+|\s*)<\/p>/gi;

function orphanObjectParagraph(block){
  if(!block||block.type!=='paragraph'||!Array.isArray(block.content)||!block.content.length)return false;
  if(!block.content.every(part=>typeof part==='string'||(part?.type==='text'&&typeof part.text==='string')))return false;
  const content=block.content.map(part=>typeof part==='string'?part:part.text).join('');
  return objectOnlyText.test(content);
}

export function canonicalBlockNoteBlocks(blocks){
  if(!Array.isArray(blocks))return blocks;
  let changed=false;
  const updated=blocks.map(block=>{
    if(orphanObjectParagraph(block)){
      changed=true;
      return {...block,content:[]};
    }
    if(Array.isArray(block?.children)&&block.children.length){
      const children=canonicalBlockNoteBlocks(block.children);
      if(children!==block.children){changed=true;return {...block,children};}
    }
    return block;
  });
  return changed?updated:blocks;
}

export function canonicalBlockNoteHtml(html){
  // Preserve every blank paragraph as a visible blank line, including
  // legacy U+FFFC and genuinely empty <p>. Do not touch inline/media content.
  return String(html??'').replace(blankHtmlParagraph,(match,attrs,body)=>{
    if(body.trim()&&!objectOnlyHtml.test(body))return match;
    return '<p'+attrs+'><br></p>';
  });
}
