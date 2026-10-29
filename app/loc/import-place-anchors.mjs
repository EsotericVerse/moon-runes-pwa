import {importGeoKey} from './import-geocoordinates.mjs';

// The position identifies the anchor. Its name and UID are not comparison keys.
const VALID_UID=/^[A-Za-z0-9]{4}$/;
function incomingLocations(records){
  const places=new Map();let missing=0;
  for(const record of records||[]){
    const title=String(record?.location??'').trim();
    const key=importGeoKey(record?.__importCoordinates);
    if(!title||title.length>120||/[\u0000-\u001f]/u.test(title)||!key){missing++;continue;}
    if(!places.has(key))places.set(key,{title,address:JSON.parse(key)});
  }
  return {places,missing};
}
export async function prepareImportPlaceAnchors(records,{
  scopeId,relation,pageSize=750,allowMissing=false
}={}){
  const {places,missing}=incomingLocations(records);
  const byCoordinate=new Map();
  if(!places.size||scopeId==='local'||scopeId==='loc'||!scopeId)
    return {byCoordinate,created:0,reused:0,skipped:missing+places.size};
  if(!/^[a-z][a-z0-9]{0,14}$/.test(scopeId))throw Error('空間定錨 Scope 無效');
  if(typeof relation!=='function')throw Error('空間定錨資料庫不存在');
  const table='silver.'+scopeId+'_trace',existing=new Map();
  for(let offset=0;;offset+=pageSize){
    const {data,error}=await relation(table)
      .select('uid,title,address').eq('trace_type','space_anchor')
      .order('uid',{ascending:true}).range(offset,offset+pageSize-1);
    if(error){
      if(allowMissing&&['42P01','PGRST205'].includes(String(error.code||'')))
        return {byCoordinate,created:0,reused:0,skipped:missing+places.size};
      throw Error('讀取空間定錨失敗：'+(error.message||error));
    }
    for(const anchor of data||[]){
      const key=importGeoKey(anchor?.address);
      if(key&&VALID_UID.test(String(anchor?.uid||''))&&!existing.has(key))
        existing.set(key,String(anchor.uid));
    }
    if((data||[]).length<pageSize)break;
  }
  let created=0,reused=0;
  const pending=[];
  for(const [key,place] of places){
    if(existing.has(key)){byCoordinate.set(key,existing.get(key));reused++;}
    else pending.push([key,place]);
  }
  for(let offset=0;offset<pending.length;offset+=80){
    const slice=pending.slice(offset,offset+80);
    const rows=slice.map(([,place])=>({
      trace_type:'space_anchor',title:place.title,
      description:{text:'',address:null},address:place.address,
      times:[],anchor_list:[],hidden_depth:-1
    }));
    const {data,error}=await relation(table).insert(rows).select('uid,address');
    if(error)throw Error('新增空間定錨失敗：'+(error.message||error));
    if(!Array.isArray(data)||data.length!==rows.length)
      throw Error('新增空間定錨筆數不符');
    const returned=new Map();
    for(const row of data){
      const key=importGeoKey(row.address);
      if(key&&VALID_UID.test(String(row.uid||''))&&!returned.has(key))
        returned.set(key,String(row.uid));
    }
    for(const [key] of slice){
      const uid=returned.get(key);
      if(!uid)throw Error('新增定錨點沒有回傳對應座標與 UID');
      byCoordinate.set(key,uid);created++;
    }
  }
  return {byCoordinate,created,reused,skipped:missing};
}
export function importedPlaceId({incoming,existing,byCoordinate}){
  const key=importGeoKey(incoming?.__importCoordinates);
  const uid=key?byCoordinate?.get(key):null;
  return VALID_UID.test(String(uid||''))&&String(existing?.place_id||'').trim()!==uid?uid:null;
}
