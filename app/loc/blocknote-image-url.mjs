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
