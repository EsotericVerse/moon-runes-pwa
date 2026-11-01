// Reversible mapping for one Scope's Anchor table. No database side effects.
const kinds=new Set(['time','trace','keywords','media']);
const uidPattern=/^[A-Za-z0-9]{4}$|^[A-Za-z0-9]{8}$/;
const has=(x,key)=>Object.prototype.hasOwnProperty.call(x,key);
function maybe(target,source,sourceKey,targetKey=sourceKey){
  if(has(source,sourceKey))target[targetKey]=source[sourceKey];
}
function checkedLinks(value){
  if(value==null)return [];
  if(!Array.isArray(value)||value.some(x=>typeof x!=='string'))
    throw new TypeError('Anchor links must be an array of strings');
  return [...value];
}
export function toAnchorRecord(kind,row){
  if(!kinds.has(kind))throw new TypeError('Unknown anchor kind');
  const uid=String(row?.uid??'').trim();
  if(!uidPattern.test(uid))throw new TypeError('Anchor UID must be four or eight case-sensitive Base62 characters');
  const type=kind==='trace'?row.trace_type:row.type;
  if(!type||typeof type!=='string')throw new TypeError('Anchor type is required');
  const result={uid,kind,type,links:[],attrs:{}};
  const nameKey=kind==='keywords'?'name':'title';
  maybe(result,row,nameKey,'title');
  maybe(result,row,kind==='keywords'?'desc':'description','description');
  maybe(result,row,'invisible');
  if(kind==='time'){
    result.links=checkedLinks(row.anchor_ids);
    maybe(result,row,'address','date');
    maybe(result.attrs,row,'range');
  }else if(kind==='trace'){
    result.links=checkedLinks(row.anchor_list);
    for(const field of ['route_list','address','times'])maybe(result.attrs,row,field);
  }else if(kind==='keywords'){
    result.links=checkedLinks(row.lists);
    maybe(result.attrs,row,'uid_lists');
  }else{
    for(const field of ['url','meta_tags','createtime','location'])maybe(result,row,field);
  }
  return result;
}
export function fromAnchorRecord(record){
  if(!kinds.has(record?.kind))throw new TypeError('Unknown anchor kind');
  if(!uidPattern.test(String(record?.uid??'')))throw new TypeError('Invalid anchor UID');
  const row={uid:record.uid};
  maybe(row,record,'type',record.kind==='trace'?'trace_type':'type');
  maybe(row,record,'title',record.kind==='keywords'?'name':'title');
  maybe(row,record,'description',record.kind==='keywords'?'desc':'description');
  maybe(row,record,'invisible');
  const attrs=record.attrs||{};
  if(record.kind==='time'){
    maybe(row,record,'date','address');
    row.anchor_ids=checkedLinks(record.links);
    maybe(row,attrs,'range');
  }else if(record.kind==='trace'){
    row.anchor_list=checkedLinks(record.links);
    for(const field of ['route_list','address','times'])maybe(row,attrs,field);
  }else if(record.kind==='keywords'){
    row.lists=checkedLinks(record.links);
    maybe(row,attrs,'uid_lists');
  }else{
    for(const field of ['url','meta_tags','createtime','location'])maybe(row,record,field);
  }
  return row;
}
export function validateAnchorCollection(rows){
  const seen=new Set();
  for(const row of rows){
    if(!kinds.has(row.kind)||!uidPattern.test(String(row.uid||'')))throw new TypeError('Invalid anchor row');
    if(seen.has(row.uid))throw new Error('UID collision across Anchor kinds: '+row.uid);
    seen.add(row.uid);
  }
  return {count:rows.length,unique:seen.size};
}