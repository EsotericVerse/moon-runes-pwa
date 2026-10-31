import {importGeoKey} from './import-geocoordinates.mjs';

// A place is identified by its explicit name AND, when supplied, its exact
// coordinate pair. Same-named places at different coordinates must never be
// merged; coordinates are stored only in Trace.address, never in Galaxy.
const VALID_UID=/^[A-Za-z0-9]{4}$/;
const nameKey=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('und');
const safeTitle=value=>{
  const title=String(value??'').trim();
  return title&&title.length<=120&&!/[\u0000-\u001f]/u.test(title)?title:'';
};
const recordPlaceName=record=>safeTitle(record?.__importPlaceName||record?.location);
const spatialKey=(name,coordinates)=>JSON.stringify([name,coordinates]);
export const importPlaceNameKey=nameKey;

function incomingLocations(records){
  const names=new Map();let missing=0;
  for(const record of records||[]){
    const title=recordPlaceName(record);
    const name=nameKey(title);
    if(!name){missing++;continue;}
    const coordinates=importGeoKey(record?.__importCoordinates);
    const key=spatialKey(name,coordinates);
    const postal=String(record?.__importPlaceAddress??'').trim().slice(0,320);
    const previous=names.get(key);
    if(!previous)names.set(key,{name,title,postal,coordinates,
      address:coordinates?JSON.parse(coordinates):null});
    else if(!previous.postal&&postal)previous.postal=postal;
  }
  return {names,missing};
}
export async function prepareImportPlaceAnchors(records,{
  scopeId,relation,pageSize=750,allowMissing=false,createMissing=true,onProgress
}={}){
  const {names,missing}=incomingLocations(records);
  const byCoordinate=new Map(),byName=new Map();
  const unavailable=()=>({byCoordinate,byName,created:0,reused:0,
    skipped:missing+names.size,unmatchedCoordinates:names.size});
  if(!names.size||scopeId==='local'||scopeId==='loc'||!scopeId)
    return unavailable();
  if(!/^[a-z][a-z0-9]{0,14}$/.test(scopeId))throw Error('空間定錨 Scope 無效');
  if(typeof relation!=='function')throw Error('空間定錨資料庫不存在');
  const table='silver.'+scopeId+'_trace';
  const existingBySpatialKey=new Map(),existingByName=new Map(),timesByUid=new Map();
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
      const uid=String(anchor?.uid||'');
      if(!name||!VALID_UID.test(uid))continue;
      const coordinates=importGeoKey(anchor?.address);
      const saved={uid,coordinates};
      if(!existingByName.has(name))existingByName.set(name,[]);
      existingByName.get(name).push(saved);
      if(coordinates&&!existingBySpatialKey.has(spatialKey(name,coordinates)))
        existingBySpatialKey.set(spatialKey(name,coordinates),saved);
      timesByUid.set(uid,Array.isArray(anchor.times)?anchor.times:[]);
    }
    onProgress?.({phase:'讀取現有空間定錨',completed:offset+(data||[]).length,total:0});
    if((data||[]).length<pageSize)break;
  }
  let reused=0,created=0;
  const pending=[],ambiguousNames=new Set();
  const register=(place,uid)=>{
    if(place.coordinates)byCoordinate.set(spatialKey(place.name,place.coordinates),uid);
    if(ambiguousNames.has(place.name))return;
    const prior=byName.get(place.name);
    if(prior&&prior!==uid){byName.delete(place.name);ambiguousNames.add(place.name);}
    else byName.set(place.name,uid);
  };
  // Locate exact known coordinates first. Name-only visits can reuse a single
  // unambiguous named anchor, but never choose between different coordinates.
  const ordered=[...names.values()].sort((a,b)=>Number(Boolean(b.coordinates))-Number(Boolean(a.coordinates)));
  const nameOnlyAliases=[];
  for(const place of ordered){
    const candidates=existingByName.get(place.name)||[];
    const matched=place.coordinates
      ?existingBySpatialKey.get(spatialKey(place.name,place.coordinates))
      :candidates.length===1?candidates[0]:null;
    if(matched){register(place,matched.uid);reused++;continue;}
    if(!place.coordinates){
      if(candidates.length>1)continue;
      const peers=ordered.filter(p=>p.name===place.name&&p.coordinates);
      if(!candidates.length&&peers.length===1){
        nameOnlyAliases.push({name:place.name,coordinates:peers[0].coordinates});
        continue;
      }
      if(peers.length>1)continue;
    }
    if(createMissing)pending.push(place);
  }
  // A single ZIP can contain several genuinely different places with the
  // same name. Keep each coordinate and its distinct Trace UID.
  for(let offset=0;offset<pending.length;offset+=80){
    const chunk=pending.slice(offset,offset+80);
    const rows=chunk.map(place=>({
      trace_type:'space_anchor',title:place.title,
      description:{text:'',address:place.postal||null},
      address:place.address,times:[],anchor_list:[],hidden_depth:0
    }));
    const {data,error}=await relation(table).insert(rows).select('uid,title,address');
    if(error)throw Error('新增空間定錨失敗：'+(error.message||error));
    if(!Array.isArray(data)||data.length!==rows.length)
      throw Error('新增空間定錨回傳筆數不符；請重新核對再重試');
    // The insert returns rows in the same order for the database gateway.
    for(let i=0;i<chunk.length;i++){
      const anchor=data[i],place=chunk[i];
      const uid=String(anchor?.uid||'');
      if(!VALID_UID.test(uid)||nameKey(anchor?.title)!==place.name||
          importGeoKey(anchor?.address)!==place.coordinates)
        throw Error('新增空間定錨名稱、座標或 UID 不符；請重新核對');
      register(place,uid);
      timesByUid.set(uid,[]);
      created++;
    }
    onProgress?.({phase:'建立原始座標定錨',completed:offset+chunk.length,total:pending.length});
  }
  for(const alias of nameOnlyAliases){
    const uid=byCoordinate.get(spatialKey(alias.name,alias.coordinates));
    if(uid){register(alias,uid);reused++;}
  }
  const unmatchedCoordinates=names.size-reused-created;
  return {byCoordinate,byName,created,reused,timesByUid,table,
    skipped:missing+unmatchedCoordinates,unmatchedCoordinates};
}
export function importedPlaceId({incoming,existing,byName,byCoordinate}={}){
  if(String(existing?.place_id||'').trim())return null;
  const name=nameKey(recordPlaceName(incoming));
  if(!name)return null;
  const coordinates=importGeoKey(incoming?.__importCoordinates);
  const uid=coordinates?byCoordinate?.get(spatialKey(name,coordinates)):byName?.get(name);
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
