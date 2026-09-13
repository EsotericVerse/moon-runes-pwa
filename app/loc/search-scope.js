'use client';

function values(value){
  if(Array.isArray(value))return value.map(String).filter(Boolean);
  if(value==null||value==='')return [];
  return String(value).split(',').map(item=>item.trim()).filter(Boolean);
}

export function readSearchScope(searchParams,profile){
  const fields=Array.isArray(profile?.fields)?profile.fields:[];
  const scope={};
  for(const field of fields){
    const collected=searchParams?.getAll?.(field)||[];
    const parsed=values(collected.length?collected:searchParams?.get?.(field));
    if(parsed.length)scope[field]=[...new Set(parsed)];
  }
  return scope;
}

export function partitionSegmentsByScope(segments,scope){
  const requested=Object.entries(scope||{}).filter(([,wanted])=>Array.isArray(wanted)&&wanted.length);
  if(!requested.length)return {matched:[...(segments||[])],unknown:[],excluded:[]};
  const matched=[];const unknown=[];const excluded=[];
  for(const segment of segments||[]){
    let hasUnknown=false;let mismatch=false;
    for(const [field,wanted] of requested){
      const available=Array.isArray(segment?.scope?.[field])?segment.scope[field]:[];
      if(!available.length){hasUnknown=true;continue;}
      if(!wanted.some(value=>available.includes(value))){mismatch=true;break;}
    }
    if(mismatch)excluded.push(segment);
    else if(hasUnknown)unknown.push(segment);
    else matched.push(segment);
  }
  return {matched,unknown,excluded};
}
