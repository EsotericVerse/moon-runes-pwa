// Import check-ins are article metadata. Reuse an existing Scope anchor by
// unambiguous normalized name; never infer coordinates or Timeline visits.
export const importPlaceKey=value=>String(value??'').normalize('NFKC')
  .replace(/\s+/gu,' ').trim().toLocaleLowerCase('und');

const VALID_UID=/^[A-Za-z0-9]{4}$/;
function canonicalNames(rows){
  const names=new Map();
  for(const row of rows||[]){
    const name=String(row?.location??'').trim();
    if(!name||name.length>120||/[\u0000-\u001F]/u.test(name))continue;
    const key=importPlaceKey(name);
    if(key&&!names.has(key))names.set(key,name);
  }
  return names;
}

// A null result is intentionally different from a nonexistent row: a
// duplicate anchor name is ambiguous and must not be resolved arbitrarily.
function anchorIndex(anchors){
  const map=new Map();
  for(const row of anchors||[]){
    const key=importPlaceKey(row?.title);
    if(!key||!VALID_UID.test(String(row?.uid||'')))continue;
    if(!map.has(key))map.set(key,String(row.uid));
    else if(map.get(key)!==String(row.uid))map.set(key,null);
  }
  return map;
}

export async function prepareImportPlaceAnchors(records,{
  scopeId,relation,pageSize=750,allowMissing=false
}={}){
  const names=canonicalNames(records);
  const byName=new Map();
  if(!names.size||scopeId==='local'||scopeId==='loc'||!scopeId)
    return {byName,created:0,reused:0,skipped:names.size};
  if(!/^[a-z][a-z0-9]{0,14}$/.test(scopeId))
    throw new Error('空間定錨 Scope 無效');
  if(typeof relation!=='function')throw new Error('空間定錨資料庫不存在');
  const table='silver.'+scopeId+'_trace';
  const anchors=[];
  for(let offset=0;;offset+=pageSize){
    const {data,error}=await relation(table)
      .select('uid,title').eq('trace_type','space_anchor')
      .order('uid',{ascending:true}).range(offset,offset+pageSize-1);
    if(error){
      const missing=['42P01','PGRST205'].includes(String(error.code||''));
      if(missing&&allowMissing)return {byName,created:0,reused:0,skipped:names.size};
      throw new Error('讀取空間定錨失敗：'+(error.message||error));
    }
    const page=data||[];
    anchors.push(...page);
    if(page.length<pageSize)break;
  }
  const existing=anchorIndex(anchors);
  let created=0,reused=0,skipped=0;
  const pending=[];
  for(const [key,name] of names){
    if(existing.has(key)){
      const uid=existing.get(key);
      if(uid){byName.set(key,uid);reused++;}
      else skipped++;
      continue;
    }
    pending.push([key,name]);
  }
  // Reuse the Trace editor's bounded bulk insert path. In particular, do not
  // issue one PostgreSQL network request per imported check-in label.
  for(let offset=0;offset<pending.length;offset+=80){
    const slice=pending.slice(offset,offset+80);
    const rows=slice.map(([,name])=>({
      trace_type:'space_anchor',title:name,
      description:{text:'',address:null},address:null,times:[],
      anchor_list:[],hidden_depth:-1
    }));
    const {data,error}=await relation(table).insert(rows).select('uid,title');
    if(error)throw new Error('新增空間定錨失敗：'+(error.message||error));
    if(!Array.isArray(data)||data.length!==rows.length)
      throw new Error('空間定錨新增筆數不符');
    const returned=anchorIndex(data);
    for(const [key] of slice){
      const uid=returned.get(key);
      if(!VALID_UID.test(String(uid||'')))throw new Error('空間定錨沒有回傳有效 UID');
      byName.set(key,uid);
      created++;
    }
  }
  return {byName,created,reused,skipped};
}

export function importedPlaceId({incoming,existing,byName}){
  if(String(existing?.place_id||'').trim())return null;
  const name=String(existing?.location||'').trim()||String(incoming?.location||'').trim();
  const uid=byName?.get(importPlaceKey(name));
  return VALID_UID.test(String(uid||''))?uid:null;
}
