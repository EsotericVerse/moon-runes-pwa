// Canonical TEXT format: "rune_id:hit_count,rune_id:hit_count".
// "false" means excluded from analysis; "" means analyzed with no hits.
const ITEM=/^(0|[1-9]\d*):([1-9]\d*)$/;

export function parseGroupLists(value){
  if(value===false||value==='false'||value==null)return false;
  if(value&&typeof value==='object'&&!Array.isArray(value))return value;
  const raw=String(value).trim();
  if(!raw)return {};
  // Backward-compatible reads during migration; new writes are always TEXT.
  if(raw.startsWith('{')){
    try{
      const legacy=JSON.parse(raw);
      return legacy&&typeof legacy==='object'&&!Array.isArray(legacy)?legacy:{};
    }catch{return {};}
  }
  const result={};
  for(const item of raw.split(',')){
    const match=ITEM.exec(item.trim());
    if(!match)return {};
    result[match[1]]=Number(match[2]);
  }
  return result;
}

export function formatGroupLists(value){
  const parsed=parseGroupLists(value);
  if(parsed===false)return 'false';
  return Object.entries(parsed)
    .filter(([id,count])=>/^(0|[1-9]\d*)$/.test(id)&&Number.isSafeInteger(Number(count))&&Number(count)>0)
    .sort((a,b)=>Number(a[0])-Number(b[0]))
    .map(([id,count])=>id+':'+Number(count))
    .join(',');
}

export function parseGroupListsAttr(value){
  const raw=String(value??'').trim();
  if(raw==='false'||raw==='')return raw;
  const seen=new Set(),items=[];
  for(const part of raw.split(',')){
    const match=ITEM.exec(part.trim());
    if(!match)throw new Error('Invalid group_lists TEXT');
    const id=Number(match[1]),count=Number(match[2]);
    if(!Number.isSafeInteger(id)||!Number.isSafeInteger(count)||seen.has(id))
      throw new Error('Invalid group_lists TEXT');
    seen.add(id);
    items.push([id,count]);
  }
  return items.sort((a,b)=>a[0]-b[0]).map(([id,count])=>id+':'+count).join(',');
}
