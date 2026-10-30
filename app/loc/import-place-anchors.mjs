import {importGeoKey} from './import-geocoordinates.mjs';

// Trace identity is the place name: an existing anchor with the same name is the
// same place, whatever its coordinates. New anchors require an explicit source
// place name and a separate, opt-in createMissing action.
const VALID_UID=/^[A-Za-z0-9]{4}$/;
const nameKey=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('und');
const safeTitle=value=>{
  const title=String(value??'').trim();
  return title&&title.length<=120&&!/[\u0000-\u001f]/u.test(title)?title:'';
};
const recordPlaceName=record=>safeTitle(record?.__importPlaceName||record?.location);
export const importPlaceNameKey=nameKey;
// Galaxy stores the location name, not coordinates, so the name is the identity.
// Coordinates are only copied onto a brand-new anchor.
function incomingLocations(records){
  const names=new Map();let missing=0;
  for(const record of records||[]){
    const title=recordPlaceName(record);
    const name=nameKey(title);
    if(!name){missing++;continue;}
    const key=importGeoKey(record?.__importCoordinates);
    const postal=String(record?.__importPlaceAddress??'').trim().slice(0,320);
    const previous=names.get(name);
    if(!previous)names.set(name,{title,postal,address:key?JSON.parse(key):null});
    else if(!previous.address&&key)names.set(name,{title:previous.title,postal:previous.postal||postal,address:JSON.parse(key)});
  }
  return {names,missing};
}
export async function prepareImportPlaceAnchors(records,{
  scopeId,relation,pageSize=750,allowMissing=false,createMissing=false,onProgress
}={}){
  const {names,missing}=incomingLocations(records);
  const byCoordinate=new Map(),byName=new Map();
  const unavailable=()=>({byCoordinate,byName,created:0,reused:0,
    skipped:missing+names.size,unmatchedCoordinates:names.size});
  if(!names.size||scopeId==='local'||scopeId==='loc'||!scopeId)
    return unavailable();
  if(!/^[a-z][a-z0-9]{0,14}$/.test(scopeId))throw Error('空間定錨 Scope 無效');
  if(typeof relation!=='function')throw Error('空間定錨資料庫不存在');
  const table='silver.'+scopeId+'_trace',existingByName=new Map(),timesByUid=new Map();
  onProgress?.({phase:'讀取現有空間定錨',completed:0,total:0});
  for(let offset=0;;offset+=pageSize){
    const {data,error}=await relation(table)
      .select('uid,title,address,times').eq('trace_type','space_anchor')
      .order('uid',{ascending:true}).range(offset,offset+pageSize-1);
    if(error){
      if(allowMissing&&!createMissing&&['42P01','PGRST205'].includes(String(error.code||'')))
        return unavailable();
      throw Error('讀取空間定錨失敗：'+(error.message||error));
    }
    for(const anchor of data||[]){
      const name=nameKey(anchor?.title);
      if(name&&VALID_UID.test(String(anchor?.uid||''))&&!existingByName.has(name))
        existingByName.set(name,String(anchor.uid));
      if(VALID_UID.test(String(anchor?.uid||'')))
        timesByUid.set(String(anchor.uid),Array.isArray(anchor.times)?anchor.times:[]);
    }
    onProgress?.({phase:'讀取現有空間定錨',completed:offset+(data||[]).length,total:0});
    if((data||[]).length<pageSize)break;
  }
  let reused=0,created=0;
  const pending=[];
  for(const [name,place] of names){
    const uid=existingByName.get(name);
    if(uid){byName.set(name,uid);reused++;continue;}
    if(createMissing&&place.address)pending.push([name,place]);
  }
  for(let offset=0;offset<pending.length;offset+=80){
    const chunk=pending.slice(offset,offset+80);
    const rows=chunk.map(([,place])=>({
      trace_type:'space_anchor',title:place.title,
      description:{text:'',address:place.postal||null},
      address:place.address,times:[],anchor_list:[],hidden_depth:0
    }));
    const {data,error}=await relation(table).insert(rows).select('uid,title');
    if(error)throw Error('新增空間定錨失敗：'+(error.message||error));
    if(!Array.isArray(data)||data.length!==rows.length)
      throw Error('新增空間定錨回傳筆數不符；請重新核對再重試');
    const expected=new Set(chunk.map(([name])=>name));
    for(const anchor of data){
      const name=nameKey(anchor?.title);
      const uid=String(anchor?.uid||'');
      if(!expected.has(name)||!VALID_UID.test(uid)||byName.has(name))
        throw Error('新增空間定錨名稱或 UID 不符；請重新核對');
      byName.set(name,uid);
      timesByUid.set(uid,[]);
      created++;
    }
    onProgress?.({phase:'建立原始座標定錨',completed:offset+chunk.length,total:pending.length});
  }
  const unmatchedCoordinates=names.size-byName.size;
  return {byCoordinate,byName,created,reused,timesByUid,table,
    skipped:missing+unmatchedCoordinates,unmatchedCoordinates};
}
export function importedPlaceId({incoming,existing,byName}){
  if(String(existing?.place_id||'').trim())return null;
  const name=nameKey(recordPlaceName(incoming));
  const uid=name?byName?.get(name):null;
  return VALID_UID.test(String(uid||''))?uid:null;
}

// Each anchor keeps the creation time of every check-in made there in its
// `times` array. Merge the newly imported articles' times into the saved ones:
// the same instant is stored once, the result is sorted, and an anchor with
// nothing new is not written.
export async function recordImportPlaceVisits(visits,{relation,table,timesByUid}={}){
  if(!visits?.length)return {updated:0,added:0};
  if(typeof relation!=='function'||!table)throw Error('定錨打卡時間寫入設定不存在');
  const byUid=new Map();
  for(const visit of visits){
    const uid=String(visit?.uid||'');
    const stamp=Date.parse(String(visit?.time??''));
    if(!VALID_UID.test(uid)||!Number.isFinite(stamp))continue;
    if(!byUid.has(uid))byUid.set(uid,new Set());
    byUid.get(uid).add(stamp);
  }
  let updated=0,added=0;
  for(const [uid,incoming] of byUid){
    const saved=new Set();
    for(const when of timesByUid?.get(uid)||[]){
      const stamp=Date.parse(String(when||''));
      if(Number.isFinite(stamp))saved.add(stamp);
    }
    const fresh=[...incoming].filter(stamp=>!saved.has(stamp));
    if(!fresh.length)continue;
    const merged=[...new Set([...saved,...fresh])].sort((a,b)=>a-b).map(stamp=>new Date(stamp).toISOString());
    const {error}=await relation(table).update({times:merged}).eq('uid',uid).eq('trace_type','space_anchor');
    if(error)throw Error('寫入定錨打卡時間失敗：'+(error.message||error));
    timesByUid?.set(uid,merged);
    updated++;added+=fresh.length;
  }
  return {updated,added};
}
