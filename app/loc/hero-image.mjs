// One place for the hero/frame image contract shared by every editor and display.

// block_image is a text column: the DB returns JSON text, writes go in as JSON.
export function parseBlockImage(value){
  if(value&&typeof value==='object'&&!Array.isArray(value))return value;
  if(typeof value!=='string'||!value.trim())return null;
  const raw=value.trim();
  try{
    const parsed=JSON.parse(raw);
    if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed;
  }catch{}
  // Early Scope blocks saved an image as a raw URL/relative /pics path.
  // Keep those records readable without changing their stored contents.
  if(/^https?:\/\/[^\s<>"']+$/i.test(raw)||/^\/pics\/[A-Za-z0-9_./%()\-]+$/i.test(raw))
    return {source:'custom',url:raw};
  return null;
}

export function heroImageUrl(row){
  return String(parseBlockImage(row?.block_image)?.url||'');
}

export function absoluteImageUrl(src){
  try{return src?new URL(src,window.location.origin).href:'';}catch{return src||'';}
}

// Blocks whose image is edited as a frame image: LOC/Author home blocks and
// the LunaRunes hero/game heroes.
export function isHomeFrameFor(scopeId,pageName,order){
  const n=Number(order);
  if(!(n>=1))return false;
  if(scopeId==='lrunes')return ['hero','game'].includes(pageName);
  return pageName==='index'&&['loc','lo3rwang'].includes(scopeId);
}
