// Data-driven, Scope-local cross-tag statistics for Galaxy Media.
// The only predefined genres are optional initial selections, not a taxonomy.
import {mediaDay,mediaStyleTags} from './statistics-facets.mjs';

const keyOf=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase();
const isPopDefault=key=>/^(mandopop|mando pop|mandarin pop|j-pop|j pop|jpop|japanese pop|k-pop|k pop|kpop|korean pop)$/u.test(key);

export function mediaCrossTagCatalog(rows=[]){
  const media=new Map();
  const catalog=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const id=String(row?.media_id||'').trim();
    if(!id)continue;
    const tags=mediaStyleTags(row.meta_tags);
    if(!tags.length)continue;
    let entry=media.get(id);
    if(!entry){
      entry={id,day:mediaDay(row.createtime),title:String(row.title||''),url:String(row.url||''),tags:new Set()};
      media.set(id,entry);
    }
    for(const label of tags){
      const key=keyOf(label);
      if(!key||entry.tags.has(key))continue;
      entry.tags.add(key);
      if(!catalog.has(key))catalog.set(key,{key,label,count:0});
      catalog.get(key).count++;
    }
  }
  const options=[...catalog.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  return {options,media:[...media.values()]};
}
export function defaultMediaCrossAxes(catalog){
  const options=catalog?.options||[];
  const left=options.filter(item=>isPopDefault(item.key)).map(item=>item.key);
  const selected=new Set(left);
  return {left,right:options.filter(item=>!selected.has(item.key)).map(item=>item.key)};
}
export function mediaCrossIntersections(catalog,left=[],right=[]){
  const labels=new Map((catalog?.options||[]).map(x=>[x.key,x.label]));
  const leftSet=new Set(left.filter(x=>labels.has(x)));
  const rightSet=new Set(right.filter(x=>labels.has(x)));
  const pairMap=new Map();
  for(const item of catalog?.media||[]){
    const x=[...item.tags].filter(tag=>leftSet.has(tag));
    const y=[...item.tags].filter(tag=>rightSet.has(tag));
    for(const a of x)for(const b of y){
      if(a===b)continue;
      const id=a+'\u0000'+b;
      let result=pairMap.get(id);
      if(!result){
        result={key:id,left:a,right:b,leftLabel:labels.get(a),rightLabel:labels.get(b),count:0,days:new Map(),media:[]};
        pairMap.set(id,result);
      }
      result.count++;
      if(item.day)result.days.set(item.day,(result.days.get(item.day)||0)+1);
      result.media.push({id:item.id,title:item.title,url:item.url,day:item.day});
    }
  }
  return [...pairMap.values()].sort((a,b)=>b.count-a.count||a.leftLabel.localeCompare(b.leftLabel)||a.rightLabel.localeCompare(b.rightLabel));
}
