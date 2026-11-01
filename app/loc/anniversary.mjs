// Annual anniversaries are virtual suggestions shown only while creating a
// Time anchor. They do not create rows, modify source anchors, or appear as
// permanently persisted recurring events.
const parseDay=value=>{
  const day=String(value||'').slice(0,10);
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if(!match)return null;
  const year=+match[1],month=+match[2],date=+match[3];
  const d=new Date(Date.UTC(year,month-1,date));
  if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==date)
    return null;
  return {day,year,month,date};
};
export function anniversarySuggestionsForDate(date,anchors=[]){
  const target=parseDay(date);
  if(!target)return [];
  const list=Array.isArray(anchors)?anchors:[];
  if(list.some(item=>item?.type==='anchor'&&parseDay(item.address)?.day===target.day))
    return [];
  return list.filter(item=>item?.type==='anchor').flatMap(item=>{
    const original=parseDay(item.address);
    if(!original||original.year>=target.year||
       original.month!==target.month||original.date!==target.date)return [];
    const years=target.year-original.year;
    const title=String(item.title||'').trim();
    return [{date:target.day,years,sourceUid:String(item.uid||''),
      sourceDate:original.day,sourceTitle:title,
      title:title?title+' · '+years+' 週年':years+' 週年紀念'}];
  }).sort((a,b)=>b.years-a.years||a.sourceDate.localeCompare(b.sourceDate))
    .slice(0,20);
}
