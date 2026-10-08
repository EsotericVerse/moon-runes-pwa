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
