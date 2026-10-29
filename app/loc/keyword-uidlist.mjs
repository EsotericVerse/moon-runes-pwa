// A Keywords Class has one short UID and one map: item["name"] = [{uid,times}].
// The legacy catalog may still have item_no, but this result never persists it.
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
function catalogIndex(catalogRows,classGroup){
  const itemNames=new Set(),oldNumbers=new Map();
  for(const row of catalogRows){
    if(row.class_name&&row.class_name!==classGroup)throw new Error('Mixed Keywords Classes');
    const name=String(row.item_name??'').trim();
    if(!name||itemNames.has(name))throw new Error('Missing or duplicate Item name');
    itemNames.add(name);
    // Read-only adapter for existing classification engine: no item count ceiling.
    if(row.item_no!=null){
      const no=Number(row.item_no);
      if(!Number.isSafeInteger(no)||no<0||oldNumbers.has(no))throw new Error('Invalid legacy Item number');
      oldNumbers.set(no,name);
    }
  }
  return {itemNames,oldNumbers};
}
function countsOf(record,index){
  const raw=record?.group_lists;
  let entries=[];
  if(record?.item_counts&&typeof record.item_counts==='object'&&!Array.isArray(record.item_counts)){
    entries=Object.entries(record.item_counts);
  }else if(Array.isArray(record?.rune_counts)){
    entries=record.rune_counts.map(x=>[index.oldNumbers.get(Number(x.rune_id)),Number(x.count)]);
  }else if(raw==null||raw===false||raw==='false'||raw===''){
    entries=[];
  }else if(typeof raw==='string'){
    entries=raw.split(',').map(part=>{
      const m=/^([0-9]+):([0-9]+)$/.exec(part.trim());
      if(!m)throw new Error('Invalid legacy group_lists');
      return [index.oldNumbers.get(Number(m[1])),Number(m[2])];
    });
  }else if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
    entries=Object.entries(raw).map(([id,times])=>[index.oldNumbers.get(Number(id)),Number(times)]);
  }else{
    throw new Error('Invalid keyword hit format');
  }
  const counts=new Map();
  for(const [name,value] of entries){
    if(!name||!index.itemNames.has(name)||counts.has(name))throw new Error('Unknown or duplicate Keyword Item');
    counts.set(name,validTimes(Number(value)));
  }
  return counts;
}
function itemMap(index){
  return new Map([...index.itemNames].map(name=>[name,new Map()]));
}
function loadExisting(items,record){
  if(!record?.item||typeof record.item!=='object'||Array.isArray(record.item))throw new Error('Invalid stored Keyword Items');
  for(const [name,list] of Object.entries(record.item)){
    const current=items.get(name);
    if(!current)throw new Error('Stored Item is not in current catalog');
    if(!Array.isArray(list))throw new Error('uidlist must be an array');
    for(const hit of list){
      const uid=validUid(hit?.uid),times=validTimes(hit?.times);
      if(current.has(uid))throw new Error('Duplicate Galaxy UID in Item');
      current.set(uid,times);
    }
  }
}
function applyChanged(items,index,classifications){
  for(const record of classifications){
    const uid=validUid(record.uid); // Identifiers are case-sensitive, unmodified.
    for(const current of items.values())current.delete(uid);
    for(const [name,times] of countsOf(record,index))items.get(name).set(uid,times);
  }
}
function serialize(classUid,classGroup,items){
  const item=Object.fromEntries([...items].map(([name,hits])=>[
    name,[...hits].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([uid,times])=>({uid,times}))
  ]));
  return {class_uid:classUid,class_group:classGroup,item};
}
// Full analysis of one Class, regardless of Item count.
export function buildKeywordUidlistClass({classUid,classGroup,catalogRows=[],classifications=[]}={}){
  if(!isKeywordClassUid(classUid))throw new Error('Class UID must have four Base62 characters');
  if(typeof classGroup!=='string'||!classGroup.trim())throw new Error('Class name is required');
  const index=catalogIndex(catalogRows,classGroup),items=itemMap(index);
  applyChanged(items,index,classifications);
  return serialize(classUid,classGroup,items);
}
// Incremental analysis must not erase UIDs from untouched articles.
export function patchKeywordUidlistClass(existing,classifications=[],catalogRows=[]){
  if(!isKeywordClassUid(existing?.class_uid))throw new Error('Invalid stored Class UID');
  const classGroup=existing.class_group;
  const index=catalogIndex(catalogRows,classGroup),items=itemMap(index);
  loadExisting(items,existing);
  applyChanged(items,index,classifications);
  return serialize(existing.class_uid,classGroup,items);
}
export function summarizeKeywordUidlist(itemHits=[]){
  if(!Array.isArray(itemHits))throw new Error('Item hits must be an array');
  let times=0;
  for(const hit of itemHits){validUid(hit.uid);times+=validTimes(hit.times);}
  return {article_count:itemHits.length,hit_count:times};
}
