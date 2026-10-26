// Canonical Time interval references. Store only Time UIDs in anchor_ids text[],
// using one entry per interval: UID, UID-UID, or UID-0 for an open end.
// A separator never implies that unreferenced time belongs to the period.
const UID=/^[0-9A-F]{4}$/;
const PERIOD_TOKEN=/^([0-9A-F]{4})(?:-([0-9A-F]{4}|0))?$/;

export function isTimeUid(value){return UID.test(String(value||''));}
export function allocateTimeUid(rows=[]){
  const taken=new Set(rows.map(row=>String(row?.uid||'')));
  for(let i=1;i<=65535;i++){
    const uid=i.toString(16).toUpperCase().padStart(4,'0');
    if(!taken.has(uid))return uid;
  }
  throw new Error('本 Scope 的四碼時間 UID 已用盡');
}
export function encodeTimeSegment(start,end=''){
  const a=String(start||'').toUpperCase(),b=String(end||'').toUpperCase();
  if(!isTimeUid(a)||b&&!isTimeUid(b)&&b!=='0')throw new Error('無效的時間定錨點 UID');
  return b?a+'-'+b:a;
}
export function decodeTimeSegments(value,{legacy=false,type='period'}={}){
  const input=Array.isArray(value)?value.map(v=>String(v||'').trim()).filter(Boolean):[];
  if(!input.length)return [];
  if(legacy&&input.every(t=>!PERIOD_TOKEN.test(t))){
    if(input.length===1)return [{start:input[0],end:'',raw:input[0]}];
    if(type==='event'&&input.length>2)
      return input.slice(1).map((t,i)=>({start:input[i],end:t,raw:input[i]+'-'+t}));
    return [{start:input[0],end:input[1]==='0'?'0':input[1],raw:input.join(',')}];
  }
  return input.map(token=>{
    const match=PERIOD_TOKEN.exec(token);
    if(!match)return {start:'',end:'',raw:token,malformed:true};
    return {start:match[1],end:match[2]||'',raw:token};
  });
}
function dateOf(value){const s=String(value||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';}
export function previousTimeDay(value){
  const s=dateOf(value);if(!s)return '';
  const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);
}
export function resolveTimeSegments(tokens,anchors,{period=true,today=''}={}){
  const known=anchors instanceof Map?anchors:new Map((anchors||[]).map(row=>[String(row.uid||''),row]));
  return decodeTimeSegments(tokens).map((range,index)=>{
    const first=known.get(range.start),last=range.end&&range.end!=='0'?known.get(range.end):null;
    const start=dateOf(first?.time_date),end=dateOf(last?.time_date);
    const openEnd=range.end==='0';
    const missing=[range.start,...(range.end&&range.end!=='0'?[range.end]:[])].filter(id=>!known.has(id));
    const invalid=Boolean(range.malformed||missing.length||(range.end&&range.end!=='0'&&start&&end&&end<=start));
    // A deleted endpoint invalidates only its edge, not the period or other ranges.
    // A still-existing endpoint remains a point; never bridge to another segment.
    const from=start||end||'';
    const to=invalid?from:
      (openEnd?dateOf(today)||null:
        end?(period?previousTimeDay(end):end):from);
    return {index,anchor_ids:range.end?[range.start,range.end]:[range.start],
      start_date:from||null,end_date:to||null,open_end:openEnd,
      point:!range.end||invalid,invalid,missing_anchor_ids:missing,
      start_anchor_id:range.start,end_anchor_id:range.end&&range.end!=='0'?range.end:null};
  });
}
export function timeSegmentContainsDate(range,day,{today=''}={}){
  if(!range?.start_date)return false;
  // Deleting one endpoint leaves the surviving endpoint as a real point.
  if(range.invalid)return Boolean(range.point&&dateOf(day)===dateOf(range.start_date));
  const d=dateOf(day),start=dateOf(range.start_date);
  const end=range.open_end?dateOf(today):dateOf(range.end_date);
  return Boolean(d&&start&&d>=start&&(!end||d<=end));
}
export function timePeriodContainsDate(period,day,{today=''}={}){
  return (period?.ranges||[]).some(range=>timeSegmentContainsDate(range,day,{today}));
}
export function timePeriodSortDate(period){
  return (period?.ranges||[]).map(x=>x.start_date).filter(Boolean).sort()[0]||'9999-12-31';
}
export function timePeriodsWithValidRanges(rows=[]){
  return rows.filter(row=>row.ranges?.some(range=>range.start_date&&!range.invalid));
}

export function timeDateWindows(ranges=[],today=''){
  const windows=(Array.isArray(ranges)?ranges:[])
    .filter(range=>range?.start_date)
    .map(range=>({
      startDate:dateOf(range.start_date),
      endDate:dateOf(range.open_end?today:range.end_date)||dateOf(range.start_date)
    }))
    .filter(range=>range.startDate&&range.endDate&&range.endDate>=range.startDate)
    .sort((a,b)=>a.startDate.localeCompare(b.startDate)||a.endDate.localeCompare(b.endDate));
  const merged=[];
  for(const window of windows){
    const previous=merged.at(-1);
    if(previous&&window.startDate<=previous.endDate){
      if(window.endDate>previous.endDate)previous.endDate=window.endDate;
    }else merged.push({...window});
  }
  return merged;
}
