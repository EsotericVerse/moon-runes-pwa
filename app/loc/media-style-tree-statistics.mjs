// Reuse the existing Keyword Library Class → Group → Item → Keywords contract.
// Statistics work only with published media metadata, never song lyrics or audio.
import {mediaDay,mediaStyleTags} from './statistics-facets.mjs';

const normalize=value=>String(value??'').trim().normalize('NFKC').toLocaleLowerCase();

export function styleTreeClasses(treeRows=[]){
  return [...new Set((Array.isArray(treeRows)?treeRows:[])
    .map(row=>String(row?.class_name||'').trim()).filter(Boolean))].sort();
}

export function mediaStyleTreeDaily(mediaRows=[],treeRows=[],level='class',classFilter=''){
  if(!['class','group','item'].includes(level))throw new Error('Unsupported Style Tree dimension');
  const rows=Array.isArray(treeRows)?treeRows:[];
  const catalog=rows.map(row=>{
    const className=String(row?.class_name||'').trim();
    const group=String(row?.class_group||'').trim();
    const item=String(row?.item_name||'').trim();
    const terms=[...(Array.isArray(row?.keywords)?row.keywords:[]),item];
    const keys=new Set(terms.map(normalize).filter(Boolean));
    return {className,group,item,keys};
  }).filter(row=>row.className&&row.group&&row.item&&row.keys.size
    &&(!classFilter||normalize(row.className)===normalize(classFilter)));
  const totals=new Map();
  for(const media of Array.isArray(mediaRows)?mediaRows:[]){
    const day=mediaDay(media?.createtime);
    if(!day)continue;
    const tags=new Set(mediaStyleTags(media?.meta_tags).map(normalize));
    if(!tags.size)continue;
    const labels=new Set();
    for(const row of catalog){
      if(![...row.keys].some(key=>tags.has(key)))continue;
      labels.add(level==='class'?row.className
        :level==='group'?row.className+' / '+row.group
          :row.className+' / '+row.group+' / '+row.item);
    }
    for(const category of labels){
      const key=day+'\u0000'+normalize(category);
      const record=totals.get(key);
      if(record)record.item_count++;
      else totals.set(key,{day,category,item_count:1});
    }
  }
  return [...totals.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.category.localeCompare(b.category));
}
