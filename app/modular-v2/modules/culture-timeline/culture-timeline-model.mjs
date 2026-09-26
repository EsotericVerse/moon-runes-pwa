const DENSITY_LEVELS=Object.freeze([
  Object.freeze({minimum:1001,key:'focus-6',label:'1001 篇以上',brightness:1.4,glow:0.9}),
  Object.freeze({minimum:501,key:'focus-5',label:'501–1000 篇',brightness:1.32,glow:0.78}),
  Object.freeze({minimum:101,key:'focus-4',label:'101–500 篇',brightness:1.25,glow:0.66}),
  Object.freeze({minimum:51,key:'focus-3',label:'51–100 篇',brightness:1.18,glow:0.54}),
  Object.freeze({minimum:26,key:'focus-2',label:'26–50 篇',brightness:1.11,glow:0.42}),
  Object.freeze({minimum:11,key:'focus-1',label:'11–25 篇',brightness:1.05,glow:0.3})
]);

export function densityLevelForCount(value){
  const count=Number(value)||0;
  return DENSITY_LEVELS.find(level=>count>=level.minimum)||null;
}

export function densityStyleForCount(value){
  const count=Number(value)||0;
  const level=densityLevelForCount(count);
  if(!level)return null;
  const blur=Math.min(28,6+Math.log2(count/10)*3);
  return {...level,blur:`${blur.toFixed(1)}px`};
}

function utcWeekStart(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return null;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  const localDate=new Date(Date.UTC(Number(values.year),Number(values.month)-1,Number(values.day)));
  const weekday=(localDate.getUTCDay()+6)%7;
  localDate.setUTCDate(localDate.getUTCDate()-weekday);
  return localDate;
}

export function formatCultureDateTime(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return String(value||'');
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

export function decodeCultureText(value){
  const text=String(value||'');
  if(!/[\u0080-\u00ff]/u.test(text))return text;
  const codepoints=Array.from(text,char=>char.codePointAt(0));
  if(codepoints.some(point=>point>255))return text;
  try{
    return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(codepoints));
  }catch{
    return text;
  }
}

export function groupWorksByWeekAndSource(rows=[]){
  const groups=new Map();
  for(const work of Array.isArray(rows)?rows:[]){
    const timestamp=work?.created_at||work?.start_date||work?.date;
    const start=utcWeekStart(timestamp);
    if(!start)continue;
    const source=String(work?.source_name||'').trim()||'未標示來源';
    const startDate=start.toISOString().slice(0,10);
    const id=`${source}:${startDate}`;
    if(!groups.has(id)){
      const end=new Date(start);end.setUTCDate(end.getUTCDate()+7);
      const endDate=end.toISOString().slice(0,10);
      groups.set(id,{id,source,group_label:source,week_start:startDate,week_end:endDate,start_date:startDate,end_date:endDate,work_count:0,works:[]});
    }
    const group=groups.get(id);
    group.work_count+=1;
    group.works.push(work);
  }
  return [...groups.values()].map(group=>({
    ...group,
    display_label:`${group.source} ${group.work_count} 篇`,
    title:`${group.week_start.slice(0,10)} – ${group.week_end.slice(0,10)} · ${group.source} · ${group.work_count} 篇`
  })).sort((a,b)=>b.week_start.localeCompare(a.week_start)||a.source.localeCompare(b.source));
}

export const DENSITY_LEVELS_V2=DENSITY_LEVELS;
