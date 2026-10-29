// Portable Keywords inverted classification: each existing keyword_id owns its
// article uidlist. A Class has a separate four-character Base62 class_uid.
// Neither Class nor Item identity depends on Rune66 numbering or fixed groups.
const DIGITS='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const CLASS=/^[A-Za-z0-9]{4}$/;
const ARTICLE=/^[A-Za-z0-9]{8}$/;
const ITEM=/^[1-9][0-9]*$/;
export function isKeywordClassUid(uid){return typeof uid==='string'&&CLASS.test(uid);}
export function generateKeywordClassUid(existing=[],random=buffer=>globalThis.crypto.getRandomValues(buffer)){
  const used=new Set(existing);
  for(let attempt=0;attempt<128;attempt++){
    const bytes=random(new Uint8Array(16));
    if(!(bytes instanceof Uint8Array))throw new TypeError('Invalid random source');
    let id='';
    for(const n of bytes){
      if(n>=248)continue;
      id+=DIGITS[n%62];
      if(id.length===4)break;
    }
    if(id.length===4&&!used.has(id))return id;
  }
  throw new Error('Cannot allocate a unique Keywords Class UID');
}
function keywordId(value){
  const id=String(value??'');
  if(!ITEM.test(id)||BigInt(id)>9223372036854775807n)throw new Error('Invalid keyword_id');
  return id;
}
function articleUid(value){
  if(typeof value!=='string'||!ARTICLE.test(value))throw new Error('Invalid case-sensitive Galaxy UID');
  return value;
}
function times(value){
  if(!Number.isSafeInteger(value)||value<=0)throw new Error('times must be positive');
  return value;
}
function indexes(catalogRows,classUid){
  if(!isKeywordClassUid(classUid))throw new Error('Class UID must have four Base62 characters');
  const rows=new Map();
  for(const item of catalogRows){
    if(item.class_uid&&item.class_uid!==classUid)throw new Error('Mixed Keyword Classes');
    const id=keywordId(item.keyword_id);
    if(rows.has(id))throw new Error('Duplicate keyword_id');
    const class_group=String(item.class_group??'').trim();
    const item_name=String(item.item_name??'').trim();
    if(!class_group||!item_name)throw new Error('Group and Item name are required');
    rows.set(id,{keyword_id:id,class_uid:classUid,class_group,item_name,uidlist:new Map()});
  }
  return rows;
}
function update(rows,classified){
  for(const record of classified){
    const uid=articleUid(record?.uid);
    // A reanalyzed article must lose stale hits in this Class, never others.
    for(const item of rows.values())item.uidlist.delete(uid);
    const hits=record.hits||[];
    if(!Array.isArray(hits))throw new Error('hits must be an array');
    const seen=new Set();
    for(const hit of hits){
      const id=keywordId(hit.keyword_id);
      if(!rows.has(id)||seen.has(id))throw new Error('Unknown or duplicate keyword_id');
      seen.add(id);
      rows.get(id).uidlist.set(uid,times(hit.times));
    }
  }
}
function serialize(rows){
  return [...rows.values()].map(item=>({
    keyword_id:item.keyword_id,class_uid:item.class_uid,class_group:item.class_group,item_name:item.item_name,
    uidlist:[...item.uidlist.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([uid,times])=>({uid,times}))
  }));
}
export function buildKeywordUidlistRows({classUid,catalogRows=[],classifications=[]}={}){
  const rows=indexes(catalogRows,classUid);
  update(rows,classifications);
  return serialize(rows);
}
export function patchKeywordUidlistRows({classUid,catalogRows=[],storedRows=[],classifications=[]}={}){
  const rows=indexes(catalogRows,classUid);
  for(const row of storedRows){
    const id=keywordId(row.keyword_id);
    const current=rows.get(id);
    if(!current||row.class_uid!==classUid)throw new Error('Stored Item belongs to another Class');
    if(!Array.isArray(row.uidlist))throw new Error('Invalid uidlist');
    for(const hit of row.uidlist){
      const uid=articleUid(hit.uid);
      if(current.uidlist.has(uid))throw new Error('Duplicate UID within Item');
      current.uidlist.set(uid,times(hit.times));
    }
  }
  update(rows,classifications);
  return serialize(rows);
}
export function summarizeKeywordUidlist(uidlist=[]){
  if(!Array.isArray(uidlist))throw new Error('Invalid uidlist');
  let count=0;
  for(const hit of uidlist){articleUid(hit.uid);count+=times(hit.times);}
  return {article_count:uidlist.length,hit_count:count};
}
