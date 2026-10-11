// Daily rune portable format shared by iOS native and website. No implicit correction.
export const DAILY_TRANSFER_FORMAT='loc.lrunes.daily.v1';
export const DAILY_TRANSFER_MAX_BYTES=24*1024*1024;
export const DAILY_TRANSFER_BATCH=100;
const KINDS=new Set(['main','supplement','history_1','history_2']);
const DIRECTIONS=new Set(['正位','半正位','半逆位','逆位']);
export const dailyTransferKey=row=>row.record_date+'|'+row.draw_kind;
const isDate=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const d=new Date(value+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;
};
export function normalizeDailyTransferRow(source){
  const r=source&&typeof source==='object'&&!Array.isArray(source)?source:{};
  const record_date=r.record_date;
  const draw_kind=r.draw_kind;
  const rune_number=r.rune_number;
  const direction=r.direction;
  if(!isDate(record_date)||!KINDS.has(draw_kind)||!Number.isInteger(rune_number)||
    rune_number<1||rune_number>66||!DIRECTIONS.has(direction))
    throw new Error('每日符文日期、類別、符文編號或位向無效；原始資料沒有修改。');
  const phase=r.recorded_phase==null?'':r.recorded_phase;
  if(typeof phase!=='string'||phase.length>70)throw new Error('月相欄位不符合規格。');
  return {record_date,draw_kind,rune_number,direction,recorded_phase:phase};
}
export function makeDailyTransfer(rows){
  const normalized=rows.map(normalizeDailyTransferRow);
  const keys=new Set();
  for(const r of normalized){const key=dailyTransferKey(r);if(keys.has(key))throw new Error('來源資料具有相同日期與類別的重複紀錄：'+key);keys.add(key);}
  return {format:DAILY_TRANSFER_FORMAT,exported_at:new Date().toISOString(),records:normalized};
}
export function parseDailyTransfer(data){
  const parsed=typeof data==='string'?JSON.parse(data):data;
  if(!parsed||parsed.format!==DAILY_TRANSFER_FORMAT||!Array.isArray(parsed.records))
    throw new Error('只接受 LunaRunes 每日符文 v1 備份，不猜測其他 JSON。');
  if(parsed.records.length>50000)throw new Error('來源資料超過 50,000 筆，拒絕一次匯入。');
  return makeDailyTransfer(parsed.records).records;
}
export function planDailyTransfer(incoming,existing){
  const seen=new Map(existing.map(row=>[dailyTransferKey(row),normalizeDailyTransferRow(row)]));
  const fresh=[],conflicts=[],identical=[];
  for(const row of incoming.map(normalizeDailyTransferRow)){
    const key=dailyTransferKey(row),prev=seen.get(key);
    if(!prev){fresh.push(row);continue;}
    if(prev.rune_number===row.rune_number&&prev.direction===row.direction&&prev.recorded_phase===row.recorded_phase)
      identical.push(row);
    else conflicts.push({key,existing:prev,incoming:row});
  }
  return {total:incoming.length,newCount:fresh.length,duplicateCount:identical.length,
    conflictCount:conflicts.length,batches:Math.ceil(fresh.length/DAILY_TRANSFER_BATCH),
    fresh,conflicts};
}
