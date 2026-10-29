// Generic Keywords Class -> Group -> Item -> [{uid,times}] inverted result.
// Rune66's eight groups of eight are content, never an engine-wide restriction.
const ALPHABET='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CLASS_UID=/^[A-Za-z0-9]{4}$/;
const ARTICLE_UID=/^[A-Za-z0-9]{8}$/;
export const isKeywordClassUid=uid=>typeof uid==='string'&&CLASS_UID.test(uid);
export function generateKeywordClassUid(existing=[],random=buf=>globalThis.crypto.getRandomValues(buf)){
  const used=new Set(existing);
  for(let attempt=0;attempt<128;attempt++){
    let uid='';
    const bytes=random(new Uint8Array(16));
    if(!(bytes instanceof Uint8Array))throw new TypeError('Invalid random source');
    for(const byte of bytes){
      if(byte>=248)continue;
      uid+=ALPHABET[byte%62];
      if(uid.length===4)break;
    }
    if(isKeywordClassUid(uid)&&!used.has(uid))return uid;
  }
  throw new Error('No available Keywords Class UID');
}
function validUid(uid){
  if(typeof uid!=='string'||!ARTICLE_UID.test(uid))throw new Error('Invalid case-sensitive Galaxy UID');
  return uid;
}
function validTimes(times){
  if(!Number.isSafeInteger(times)||times<=0)throw new Error('Invalid keyword times');
  return times;
}
function catalogIndex(rows,classGroup){
  const groups=new Map(),legacyIds=new Map();
  for(const row of rows){
    if(row.class_name&&row.class_name!==classGroup)throw new Error('Mixed Keywords Classes');
    const group=String(row.class_group??'').trim();
    const item=String(row.item_name??'').trim();
    if(!group||!item)throw new Error('Group and Item names are required');
    if(!groups.has(group))groups.set(group,new Map());
    const items=groups.get(group);
    if(items.has(item))throw new Error('Duplicate Item within one Group');
    items.set(item,new Map());
    // Input adapter only: item_no is never part of the saved result.
    if(row.item_no!=null){
      const id=Number(row.item_no);
      if(!Number.isSafeInteger(id)||id<0||legacyIds.has(id))throw new Error('Invalid legacy Item number');
      legacyIds.set(id,{group,item});
    }
  }
  return {groups,legacyIds};
}
function countEntries(record,index){
  const raw=record?.group_lists;
  if(record?.item_counts&&typeof record.item_counts==='object'&&!Array.isArray(record.item_counts)){
    return Object.entries(record.item_counts).flatMap(([group,items])=>{
      if(!items||typeof items!=='object'||Array.isArray(items))throw new Error('Invalid item_counts');
      return Object.entries(items).map(([item,times])=>({group,item,times:Number(times)}));
    });
  }
  let values=[];
  if(Array.isArray(record?.rune_counts)){
    values=record.rune_counts.map(v=>[Number(v.rune_id),Number(v.count)]);
  }else if(raw==null||raw===false||raw==='false'||raw===''){
    values=[];
  }else if(typeof raw==='string'){
    values=raw.split(',').map(part=>{
      const match=/^([0-9]+):([0-9]+)$/.exec(part.trim());
      if(!match)throw new Error('Invalid legacy group_lists');
      return [Number(match[1]),Number(match[2])];
    });
  }else if(typeof raw==='object'&&!Array.isArray(raw)){
    values=Object.entries(raw).map(([id,times])=>[Number(id),Number(times)]);
  }else{
    throw new Error('Invalid classification result');
  }
  return values.map(([id,times])=>{
    const path=index.legacyIds.get(id);
    if(!path)throw new Error('Unknown legacy Keyword Item: '+id);
    return {...path,times};
  });
}
function apply(index,classifications){
  for(const record of classifications){
    const uid=validUid(record.uid); // Preserve Base62 case; never normalize.
    // Reclassification removes stale hits for this UID only.
    for(const items of index.groups.values())
      for(const hits of items.values())hits.delete(uid);
    const seen=new Set();
    for(const {group,item,times} of countEntries(record,index)){
      const hitMap=index.groups.get(group)?.get(item);
      if(!hitMap)throw new Error('Unknown Keywords Group/Item: '+group+'/'+item);
      const key=JSON.stringify([group,item]);
      if(seen.has(key))throw new Error('Duplicate Item classification');
      seen.add(key);
      hitMap.set(uid,validTimes(times));
    }
  }
}
function serialized(classUid,classGroup,index){
  const group=Object.fromEntries([...index.groups].map(([name,items])=>[
    name,{item:Object.fromEntries([...items].map(([item,hits])=>[
      item,[...hits].sort(([a],[b])=>a<b?-1:a>b?1:0)
        .map(([uid,times])=>({uid,times}))
    ]))}
  ]));
  return {class_uid:classUid,class_group:classGroup,group};
}
export function buildKeywordUidlistClass({classUid,classGroup,catalogRows=[],classifications=[]}={}){
  if(!isKeywordClassUid(classUid))throw new Error('Class UID must be four Base62 characters');
  if(typeof classGroup!=='string'||!classGroup.trim())throw new Error('Class name is required');
  const index=catalogIndex(catalogRows,classGroup);
  apply(index,classifications);
  return serialized(classUid,classGroup,index);
}
export function patchKeywordUidlistClass(existing,classifications=[],catalogRows=[]){
  if(!isKeywordClassUid(existing?.class_uid))throw new Error('Invalid stored Class UID');
  const classGroup=existing.class_group;
  const index=catalogIndex(catalogRows,classGroup);
  for(const [name,group] of Object.entries(existing.group||{})){
    const items=index.groups.get(name);
    if(!items)throw new Error('Previous Group missing from catalog: '+name);
    if(!group||typeof group!=='object'||!group.item||typeof group.item!=='object')
      throw new Error('Invalid stored Group');
    for(const [itemName,hits] of Object.entries(group.item)){
      const map=items.get(itemName);
      if(!map||!Array.isArray(hits))throw new Error('Previous Item missing or malformed: '+itemName);
      for(const hit of hits){
        const uid=validUid(hit?.uid),times=validTimes(hit?.times);
        if(map.has(uid))throw new Error('Duplicate Galaxy UID in Item');
        map.set(uid,times);
      }
    }
  }
  apply(index,classifications);
  return serialized(existing.class_uid,classGroup,index);
}
export function summarizeKeywordUidlist(hits=[]){
  if(!Array.isArray(hits))throw new Error('uidlist must be an array');
  let count=0;
  for(const {uid,times} of hits){validUid(uid);count+=validTimes(times);}
  return {article_count:hits.length,hit_count:count};
}
