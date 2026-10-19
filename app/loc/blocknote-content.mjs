// Canonical BlockNote content conversion helpers; no React/editor dependency.
function textFromInline(content){
  if(typeof content==='string')return content;
  if(Array.isArray(content))return content.map(textFromInline).filter(Boolean).join(' ');
  if(!content||typeof content!=='object')return '';
  if(typeof content.text==='string')return content.text;
  const parts=[];
  if(content.content!==undefined)parts.push(textFromInline(content.content));
  if(Array.isArray(content.rows))parts.push(textFromInline(content.rows));
  if(Array.isArray(content.cells))parts.push(textFromInline(content.cells));
  return parts.filter(Boolean).join(' ');
}

export function plainTextToBlocks(value=''){
  const lines=String(value??'').replace(/\r/g,'').split('\n');
  return (lines.length?lines:['']).map(line=>({type:'paragraph',content:line}));
}

export function looksLikeMarkdown(value=''){
  const text=String(value??'');
  return /(?:^|\n)\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|(?:---|\*\*\*|___)\s*(?:\n|$))|(?:\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/m.test(text);
}

export function normalizeBlocks(value,fallback=''){
  if(Array.isArray(value))return value.length?value:plainTextToBlocks(fallback);
  if(value&&typeof value==='object'&&Array.isArray(value.blocks))return value.blocks.length?value.blocks:plainTextToBlocks(fallback);
  if(value&&typeof value==='object'&&typeof value.html==='string')return {html:value.html};
  if(typeof value==='string'&&value.trim().startsWith('<'))return {html:value};
  return plainTextToBlocks(value||fallback||'');
}

export function blocksToPlainText(value){
  const normalized=normalizeBlocks(value);
  if(!Array.isArray(normalized)){
    const html=String(normalized?.html||'');
    if(typeof window==='undefined')return html.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
    const parsed=new DOMParser().parseFromString(html,'text/html');
    return String(parsed.body.innerText||parsed.body.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
  }
  const out=[];
  const walk=items=>{
    for(const block of Array.isArray(items)?items:[]){
      const text=textFromInline(block?.content).replace(/\s+/g,' ').trim();
      if(text)out.push(text);
      const caption=String(block?.props?.caption||block?.props?.name||'').trim();
      if(caption)out.push(caption);
      if(Array.isArray(block?.children)&&block.children.length)walk(block.children);
    }
  };
  walk(normalized);
  return out.join('\n').trim();
}

// Normalize legacy HTML and ProseMirror object-only paragraphs using the same
// shared BlockNote document conversion module.
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

// Shared, URL-only images for BlockNote; never store file bytes or data URIs.
export function normalizeImageSource(value=''){
  const input=String(value??'').trim();
  if(!input||/[\u0000-\u001f\u007f]/u.test(input))return '';
  try{
    const url=new URL(input);
    if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password)return '';
    return url.href;
  }catch{
    return '';
  }
}

export function imageBlockForUrl(value=''){
  const url=normalizeImageSource(value);
  return url?{type:'image',props:{url,caption:'',showPreview:true}}:null;
}

export function isEmptyImageTarget(block){
  if(!block||block.type!=='paragraph')return false;
  const content=block.content;
  if(typeof content==='string')return !content.trim();
  if(!Array.isArray(content))return !content;
  return content.length===0||content.every(piece=>
    typeof piece==='string'?!piece.trim():
      piece?.type==='text'&&!String(piece.text||'').trim()
  );
}

const imageTag=/<img\b[^>]*>/gi;
const imageSource=/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

export function countHtmlImages(value=''){
  return (String(value??'').match(imageTag)||[]).length;
}

export function frameImageCount(slot){
  return countHtmlImages(slot?.subtitle)+countHtmlImages(slot?.text)+
    (Array.isArray(slot?.entities)?slot.entities.reduce((n,item)=>n+countHtmlImages(item?.text),0):0);
}

export function firstFrameImageUrl(slot){
  const html=[slot?.subtitle,slot?.text,...(Array.isArray(slot?.entities)?slot.entities.map(item=>item?.text):[])];
  for(const value of html){
    for(const tag of String(value||'').match(imageTag)||[]){
      const source=tag.match(imageSource);
      const url=normalizeImageSource(source?.[1]||source?.[2]||source?.[3]||'');
      if(url)return url;
    }
  }
  return '';
}

export function heroImageMode(slot){
  return slot?.entities?.[0]?.image_mode==='side'?'side':'background';
}

// Remove only the image itself from hero reading copy. The image is rendered
// once, by its frame, either behind the text or beside it.
export function stripHeroImageTag(value=''){
  return String(value??'').replace(imageTag,'')
    .replace(/<p\b[^>]*>\s*(?:<br\s*\/?\s*>)?\s*<\/p>/gi,'');
}

/** One pure BlockNote document model, with composable text and image capabilities. */
export const BlockNoteContent=Object.freeze({
  text:Object.freeze({plainTextToBlocks,looksLikeMarkdown,normalizeBlocks,blocksToPlainText,
    canonicalBlockNoteBlocks,canonicalBlockNoteHtml}),
  image:Object.freeze({normalizeImageSource,imageBlockForUrl,isEmptyImageTarget,
    countHtmlImages,frameImageCount,firstFrameImageUrl,heroImageMode,stripHeroImageTag})
});
