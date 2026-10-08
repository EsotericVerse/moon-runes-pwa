/**
 * Snap native vis-timeline range manipulation back to canonical Time anchors.
 * Period/event dates are derived from anchor_ids[], never stored as independent dates.
 */
function dateKey(value){
  const date=value instanceof Date?value:new Date(value);
  return Number.isNaN(date.getTime())?'':date.toISOString().slice(0,10);
}
function previousDay(date){
  const parsed=new Date(date+'T00:00:00Z');
  parsed.setUTCDate(parsed.getUTCDate()-1);
  return parsed.toISOString().slice(0,10);
}
function anchorEntries(items){
  return (Array.isArray(items)?items:[])
    .filter(item=>item?.entry_type==='anchor'&&item?.resource_id&&item?.date_status!=='year_only'&&item?.start_date)
    .map(item=>({id:String(item.resource_id),day:dateKey(item.start_date)}))
    .filter(item=>item.day)
    .sort((a,b)=>a.day.localeCompare(b.day)||a.id.localeCompare(b.id));
}
function nearestAnchor(target,anchors,mode){
  const score=item=>Math.abs(Date.parse((mode==='end'?previousDay(item.day):item.day)+'T00:00:00Z')-Date.parse(target+'T00:00:00Z'));
  return [...anchors].sort((a,b)=>score(a)-score(b)||a.day.localeCompare(b.day)||a.id.localeCompare(b.id))[0]||null;
}
export function snapTimelineRangeToAnchors(item,row,timeRows=[]){
  if(!['period','event'].includes(row?.entryType))throw new Error('只有時期／事件可以調整範圍。');
  if(row.openStart||row.openEnd)throw new Error('開放端請先在定錨點編輯器中指定邊界。');
  const original=Array.isArray(row?.raw?.anchor_ids)?row.raw.anchor_ids.map(String):[];
  if(original.length<2||original[0]==='0'||original.at(-1)==='0')throw new Error('範圍沒有完整定錨點，請先編輯定錨關聯。');
  const anchors=anchorEntries(timeRows);
  const byId=new Map(anchors.map(anchor=>[anchor.id,anchor]));
  const oldStart=byId.get(original[0]);
  const oldEnd=byId.get(original.at(-1));
  if(!oldStart||!oldEnd)throw new Error('起訖定錨點不是完整日期，不能拖曳調整。');
  const requestedStart=dateKey(item?.start);
  const requestedEnd=dateKey(item?.end);
  if(!requestedStart||!requestedEnd)throw new Error('無法解析時間軸的新範圍。');
  const nextStart=requestedStart===oldStart.day?oldStart:nearestAnchor(requestedStart,anchors,'start');
  const nextEnd=requestedEnd===previousDay(oldEnd.day)?oldEnd:nearestAnchor(requestedEnd,anchors,'end');
  if(!nextStart||!nextEnd)throw new Error('目前沒有可以吸附的定錨點。');
  const nextIds=[nextStart.id,...original.slice(1,-1),nextEnd.id];
  if(new Set(nextIds).size!==nextIds.length)throw new Error('定錨點不能重複；請選擇其他範圍。');
  const selected=nextIds.map(id=>byId.get(id));
  if(selected.some(item=>!item))throw new Error('此範圍含有無法精確定位的定錨點，請從編輯器調整。');
  if(selected.some((item,index)=>index>0&&item.day<=selected[index-1].day)){
    throw new Error('拖曳後的定錨點順序不正確，請換一個邊界。');
  }
  return {
    anchor_ids:nextIds,
    changed:nextIds.some((id,index)=>id!==original[index]),
    item:{...item,start:nextStart.day,end:previousDay(nextEnd.day)}
  };
}
