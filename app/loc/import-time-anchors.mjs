import {parseImportCreatedTime} from './import-batch.mjs';

// Importing a known check-in creates its calendar-day Time anchor independently
// from the spatial anchor's full-precision visit timestamps.
const NAME_LIMIT=120;
const HEX=/^[0-9A-F]{4}$/;

export function importCheckinDates(records=[]){
  const dates=new Set();
  for(const record of records){
    const name=String(record?.__importPlaceName||record?.location||'').trim();
    if(!name||name.length>NAME_LIMIT)continue;
    const instants=Array.isArray(record?.__importVisitTimes)
      ?record.__importVisitTimes
      :[record?.date||record?.createtime||record?.timestamp];
    for(const value of instants){
      const explicitDay=String(value||'').trim();
      if(/^\d{4}-\d{2}-\d{2}$/.test(explicitDay)){
        dates.add(explicitDay);
        continue;
      }
      const instant=parseImportCreatedTime(value);
      if(instant)dates.add(new Intl.DateTimeFormat('sv-SE',{
        timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(new Date(instant)));
    }
  }
  return [...dates].sort();
}

export async function prepareImportTimeAnchors(records,{
  scopeId,timeTable,relation,pageSize=750,onProgress
}={}){
  const dates=importCheckinDates(records);
  const empty={created:0,reused:0,skipped:dates.length};
  if(!dates.length||!scopeId||scopeId==='local'||scopeId==='loc')return empty;
  if(!/^[a-z][a-z0-9]{0,14}$/.test(scopeId))throw Error('日期定錨 Scope 無效');
  if(typeof relation!=='function')throw Error('日期定錨資料庫不存在');
  // The scope registry owns the physical Time relation; never guess its suffix.
  const table=String(timeTable||'').trim();
  if(!/^silver\.[a-z][a-z0-9_]*$/.test(table)||!table.startsWith('silver.'+scopeId+'_'))
    throw Error('日期定錨尚未解析正確的 Scope Time 資料表');
  const occupied=new Set(),existingDays=new Set();
  onProgress?.({phase:'核對既有日期定錨',completed:0,total:0});
  for(let offset=0;;offset+=pageSize){
    const {data,error}=await relation(table).select('uid,type,address')
      .order('uid',{ascending:true}).range(offset,offset+pageSize-1);
    if(error)throw Error('讀取日期定錨失敗：'+(error.message||error));
    const rows=data||[];
    for(const row of rows){
      occupied.add(String(row.uid||''));
      if(row.type==='anchor'&&row.address)
        existingDays.add(String(row.address).slice(0,10));
    }
    onProgress?.({phase:'核對既有日期定錨',completed:offset+rows.length,total:0});
    if(rows.length<pageSize)break;
  }
  const missing=dates.filter(date=>!existingDays.has(date));
  let reused=dates.length-missing.length,created=0,cursor=1;
  const nextUid=()=>{
    while(cursor<=65535){
      const uid=cursor.toString(16).toUpperCase().padStart(4,'0');
      cursor++;
      if(HEX.test(uid)&&!occupied.has(uid)){occupied.add(uid);return uid;}
    }
    throw Error('四碼日期定錨 UID 已用盡');
  };
  for(let offset=0;offset<missing.length;offset+=80){
    const chunk=missing.slice(offset,offset+80);
    const rows=chunk.map(date=>({
      uid:nextUid(),type:'anchor',title:date,description:'',
      address:date,anchor_ids:[],hidden_depth:0
    }));
    const {data,error}=await relation(table).insert(rows).select('uid,address');
    if(error)throw Error('新增日期定錨失敗：'+(error.message||error));
    if(!Array.isArray(data)||data.length!==rows.length)
      throw Error('新增日期定錨回傳筆數不符');
    created+=rows.length;
    onProgress?.({phase:'新增缺少的日期定錨',completed:offset+rows.length,total:missing.length});
  }
  return {created,reused,skipped:0,table};
}
