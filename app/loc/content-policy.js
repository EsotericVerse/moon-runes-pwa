'use client';

const MOJIBAKE_HINT=/[ÃÂâæåçèéïð]|[\u0080-\u009f]/u;

function mojibakeScore(value){
  const text=String(value??'');
  return (text.match(/[ÃÂâæåçèéïð]/gu)||[]).length
    +(text.match(/[\u0080-\u009f]/gu)||[]).length*2
    +(text.match(/�/gu)||[]).length*4;
}

export function repairMojibakeText(value){
  const source=String(value??'');
  if(!source||!MOJIBAKE_HINT.test(source))return source;
  const chars=Array.from(source);
  if(chars.some(char=>char.codePointAt(0)>255))return source;
  try{
    const bytes=Uint8Array.from(chars,char=>char.codePointAt(0));
    const repaired=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    return repaired!==source&&mojibakeScore(repaired)<mojibakeScore(source)?repaired:source;
  }catch{
    return source;
  }
}

export function hasIrrecoverableEncoding(value){
  return String(value??'').includes('�');
}

export function isPureUrlContent(value){
  return /^https?:\/\/\S+$/iu.test(String(value??'').trim());
}

export function normalizeGalaxyContent(value){
  return repairMojibakeText(value).trim();
}

export function normalizeRelationIds(value){
  const values=Array.isArray(value)?value:String(value||'').split(/[,，]/);
  const ids=[...new Set(values.map(item=>String(item||'').trim()).filter(Boolean))];
  return ids.length?ids:null;
}


export function requireGalaxyContent(value){
  const content=normalizeGalaxyContent(value);
  if(!content)throw new Error('Galaxy 文字作品必須有正文；純媒體請寫入 Galaxy Media。');
  if(hasIrrecoverableEncoding(content))throw new Error('正文含不可逆的編碼錯誤字元，請先還原原始文字再寫入。');
  if(isPureUrlContent(content))throw new Error('純 URL 不算文字正文；請寫入 Galaxy Media。');
  return content;
}

export function resolveGalaxyTitle(title,content){
  const explicit=repairMojibakeText(title).trim();
  if(explicit)return explicit;
  const text=normalizeGalaxyContent(content).replace(/\s+/g,' ');
  return Array.from(text).filter((_,index)=>index<12).join('');
}


export function publicContentFilters(filters=[]){
  return [
    ...(Array.isArray(filters)?filters:[]),
    {column:'content',operator:'neq',value:''}
  ];
}

export function analysisContentFilters(filters=[]){
  return [
    ...(Array.isArray(filters)?filters:[]),
    {column:'statistics_able',operator:'eq',value:true},
    {column:'content',operator:'neq',value:''}
  ];
}
