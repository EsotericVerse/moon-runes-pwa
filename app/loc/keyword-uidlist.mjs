// Keywords results: one row per Item, uidlist = [{uid,times}].
// The result's class_group identifies the root Class, e.g. 符文66.
// Legacy catalog.class_group still identifies the subgroup, e.g. 靈魂.
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
      if(byte>=248)continue; // unbiased Base62
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
function countsOf(row){
  const raw=row?.group_lists;
  const pairs=Array.isArray(row?.rune_counts)
    ?row.rune_counts.map(x=>[Number(x.rune_id),Number(x.count)])
    :raw==null||raw===false||raw==='false'||raw===''?[]
    :typeof raw==='string'?raw.split(',').map(part=>{
      const m=/^([0-9]+):([0-9]+)$/.exec(part.trim());
      if(!m)throw new Error('Invalid group_lists');
      return [Number(m[1]),Number(m[2])];
    }):Object.entries(raw).map(([n,t])=>[Number(n),Number(t)]);
  const hits=new Map();
  for(const [no,times] of pairs){
    if(!Number.isSafeInteger(no)||no<0||hits.has(no))throw new Error('Invalid or duplicate keyword item');
    hits.set(no,validTimes(times));
  }
  return hits;
}
function initialize({classUid,classGroup,catalogRows}){
  if(!isKeywordClassUid(classUid))throw new Error('Class UID must have four Base62 characters');
  if(typeof classGroup!=='string'||!classGroup.trim())throw new Error('Class name is required');
  const items=new Map();
  for(const row of catalogRows){
    if(row.class_name&&row.class_name!==classGroup)throw new Error('Mixed Keywords Classes');
    const itemNo=Number(row.item_no);
    if(!Number.isSafeInteger(itemNo)||itemNo<0||items.has(itemNo))throw new Error('Invalid item_no');
    items.set(itemNo,{class_uid:classUid,class_group:classGroup,item_no:itemNo,item_name:String(row.item_name??''),hits:new Map()});
  }
  return items;
}
function apply(items,classified){
  for(const record of classified){
    const uid=validUid(record.uid); // UID is case-sensitive, never normalize it.
    for(const item of items.values())item.hits.delete(uid);
    for(const [itemNo,times] of countsOf(record)){
      if(!items.has(itemNo))throw new Error('Unknown keyword item: '+itemNo);
      items.get(itemNo).hits.set(uid,times);
    }
  }
}
function rowsOf(items){
  return [...items.values()].sort((a,b)=>a.item_no-b.item_no).map(item=>({
    class_uid:item.class_uid,class_group:item.class_group,item_no:item.item_no,item_name:item.item_name,
    uidlist:[...item.hits].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([uid,times])=>({uid,times}))
  }));
}
export function buildKeywordUidlistRows({classUid,classGroup,catalogRows=[],classifications=[]}={}){
  const items=initialize({classUid,classGroup,catalogRows});
  apply(items,classifications);
  return rowsOf(items);
}
export function patchKeywordUidlistRows(existingRows=[],changed=[]){
  if(!existingRows.length){
    if(changed.length)throw new Error('Cannot patch absent Keywords Items');
    return [];
  }
  const first=existingRows[0];
  const items=initialize({classUid:first.class_uid,classGroup:first.class_group,catalogRows:existingRows.map(x=>({
    class_name:first.class_group,item_no:x.item_no,item_name:x.item_name
  }))});
  for(const row of existingRows){
    if(row.class_uid!==first.class_uid||row.class_group!==first.class_group)throw new Error('Mixed Keywords Classes');
    const hits=items.get(Number(row.item_no)).hits;
    for(const entry of row.uidlist||[]){
      const uid=validUid(entry.uid),times=validTimes(entry.times);
      if(hits.has(uid))throw new Error('Duplicate Galaxy UID in Item');
      hits.set(uid,times);
    }
  }
  apply(items,changed);
  return rowsOf(items);
}
export function summarizeKeywordUidlist(row){
  let total=0;
  for(const entry of row?.uidlist||[]){validUid(entry.uid);total+=validTimes(entry.times);}
  return {article_count:row?.uidlist?.length||0,hit_count:total};
}
