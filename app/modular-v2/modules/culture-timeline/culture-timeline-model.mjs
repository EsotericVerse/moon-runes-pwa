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

export function densityStyleForRatio(value){
  const ratio=Math.max(0,Math.min(1,Number(value)||0));
  if(!ratio)return null;
  return {
    key:'relative-density',
    label:'分類內相對密度',
    brightness:1+ratio*.4,
    glow:.12+ratio*.78,
    blur:`${(4+ratio*20).toFixed(1)}px`
  };
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

function decodeLatin1Utf8Chunk(value){
  const chunk=String(value||'');
  if(!chunk||!/[\u0080-\u00ff]/u.test(chunk))return chunk;
  const codepoints=Array.from(chunk,char=>char.codePointAt(0));
  if(codepoints.some(point=>point>255))return chunk;
  try{
    return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(codepoints));
  }catch{
    return chunk;
  }
}

function decodeLatin1Utf8Pass(value){
  const text=String(value||'');
  let output='';
  let latin1='';
  for(const char of text){
    if(char.codePointAt(0)<=255){
      latin1+=char;
      continue;
    }
    output+=decodeLatin1Utf8Chunk(latin1)+char;
    latin1='';
  }
  return output+decodeLatin1Utf8Chunk(latin1);
}

export function decodeCultureText(value){
  let text=String(value||'');
  for(let pass=0;pass<2;pass+=1){
    const decoded=decodeLatin1Utf8Pass(text);
    if(decoded===text)break;
    text=decoded;
  }
  return text;
}

export function groupWorksByWeek(rows=[],field='source_name'){
  const groups=new Map();
  for(const work of Array.isArray(rows)?rows:[]){
    const timestamp=work?.createtime||work?.created_at||work?.start_date||work?.date;
    const start=utcWeekStart(timestamp);
    if(!start)continue;
    const category=String(work?.[field]||'').trim();
    if(!category)continue;
    const startDate=start.toISOString().slice(0,10);
    const id=`${field}:${category}:${startDate}`;
    if(!groups.has(id)){
      const weekEnd=new Date(start);weekEnd.setUTCDate(weekEnd.getUTCDate()+7);
      groups.set(id,{
        id,category,group_label:category,
        week_start:startDate,week_end:weekEnd.toISOString().slice(0,10),
        start_date:startDate,end_date:weekEnd.toISOString().slice(0,10),
        item_count:0,works:[]
      });
    }
    const group=groups.get(id);
    group.item_count+=1;
    group.works.push(work);
  }
  const maxima=new Map();
  let globalMaximum=0;
  for(const group of groups.values()){
    maxima.set(group.category,Math.max(maxima.get(group.category)||0,group.item_count));
    globalMaximum=Math.max(globalMaximum,group.item_count);
  }
  return [...groups.values()].map(group=>({
    ...group,
    density_ratio:group.item_count/Math.max(1,maxima.get(group.category)||1),
    global_density_ratio:group.item_count/Math.max(1,globalMaximum),
    display_label:`${group.category} ${group.item_count} 項`,
    title:`${group.week_start} – ${group.week_end} · ${group.category} · ${group.item_count} 項`
  })).sort((a,b)=>a.group_label.localeCompare(b.group_label)||a.week_start.localeCompare(b.week_start));
}

export function groupWorksByWeekAndSource(rows=[]){
  return groupWorksByWeek(rows,'source_name');
}

export const DENSITY_LEVELS_V2=DENSITY_LEVELS;
