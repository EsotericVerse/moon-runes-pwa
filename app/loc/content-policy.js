'use client';

export function normalizeGalaxyContent(value){
  return String(value??'').trim();
}

export function normalizeRelationIds(value){
  const values=Array.isArray(value)?value:String(value||'').split(/[,，]/);
  const ids=[...new Set(values.map(item=>String(item||'').trim()).filter(Boolean))];
  return ids.length?ids:null;
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

export function analysisContentFilters(filters=[]){
  return [
    ...(Array.isArray(filters)?filters:[]),
    {column:'statistics_able',operator:'eq',value:true},
    {column:'content',operator:'neq',value:''}
  ];
}
