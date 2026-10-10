import {assignedSource} from './member-intersection-model.mjs';

const day=value=>String(value||'').slice(0,10);
function bucket(d,unit){
  if(unit==='month')return d.slice(0,7);
  if(unit==='week'){
    const v=new Date(d+'T00:00:00Z');
    v.setUTCDate(v.getUTCDate()-((v.getUTCDay()+6)%7));
    return v.toISOString().slice(0,10);
  }
  return d;
}
export function administrativeSourceTrend(raw=[],taxonomy={},{startDate='',endDate='',unit='day'}={}){
  const start=day(startDate),end=day(endDate);
  const categories=(taxonomy.categories||[]).filter(c=>c.enabled!==false);
  const aliases=taxonomy.aliases||[];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end){
    return {rows:[],series:[],distribution:[],total:0};
  }
  const keys=new Map(categories.map(c=>[c.category_code,c.display_name]));
  if(!keys.has('others'))keys.set('others','Others');
  const data=new Map(),totals=new Map(),rawRecords=Array.isArray(raw)?raw:[];
  for(let date=new Date(start+'T00:00:00Z'),last=new Date(end+'T00:00:00Z');date<=last;date.setUTCDate(date.getUTCDate()+1)){
    const today=date.toISOString().slice(0,10),group=bucket(today,unit);
    if(!data.has(group))data.set(group,{period:group,start_date:today,end_date:today,total:0});
    data.get(group).end_date=today;
  }
  for(const record of rawRecords){
    const date=day(record.day),count=Math.max(0,Number(record.item_count)||0);
    if(date<start||date>end||!count)continue;
    const group=bucket(date,unit),item=data.get(group);
    if(!item)continue;
    if(record.kind==='total')item.total+=count;
    if(record.kind!=='source')continue;
    const category=assignedSource(record.category,aliases,categories);
    const key='category_'+category;
    item[key]=(item[key]||0)+count;
    totals.set(category,(totals.get(category)||0)+count);
  }
  const present=[...keys].filter(([id])=>totals.get(id)>0);
  const series=present.map(([id,label])=>({key:'category_'+id,label}));
  const distribution=present.map(([id,label])=>({name:label,value:totals.get(id)}));
  const rows=[...data.values()].map(point=>({
    ...point,...Object.fromEntries(series.map(s=>[s.key,Number(point[s.key])||0]))
  }));
  return {rows,series,distribution,total:rows.reduce((n,row)=>n+row.total,0)};
}
