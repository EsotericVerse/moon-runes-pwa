'use client';

export function normalizeGalaxyContent(value){
  return String(value??'').trim();
}

export function hasValidGalaxyContent(value){
  return normalizeGalaxyContent(value).length>0;
}

export function requireGalaxyContent(value){
  const content=normalizeGalaxyContent(value);
  if(!content)throw new Error('Galaxy 文字作品必須有正文；純媒體請寫入 Galaxy Media。');
  return content;
}

export function resolveGalaxyTitle(title,content){
  const explicit=String(title??'').trim();
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
