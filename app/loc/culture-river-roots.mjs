// Compact, public-only first view. Detail remains on the server until expanded.
import {assignedSource} from './member-intersection-model.mjs';
export function summarizeCultureRiverRoots(rows=[],taxonomy={}){
  const daily=new Map(),groups=new Map();
  for(const row of rows){
    if(row?.kind!=='source'&&row?.kind!=='media')continue;
    const category=String(row.category||'').trim(),day=String(row.day||'').slice(0,10),count=Number(row.item_count)||0;
    if(count<=0)continue;
    const isMedia=row.kind==='media';if(isMedia&&!category)continue;
    // Count only records with an actual date in the selected interval.
    // Undated results must not create clickable but empty child lanes.
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day))continue;
    const raw=isMedia?'媒體 · '+category:category;
    const root=isMedia?'media':assignedSource(category,taxonomy.aliases||[],taxonomy.categories||[])==='unclassified'?'custom':'system';
    const key=(isMedia?'media:':'source:')+category;
    const group=groups.get(key)||{
      category_key:'source:'+raw,category_type:isMedia?'media':'source',source_name:raw,
      display_label:raw,item_count:0,source_names:isMedia?[]:[category],media_types:isMedia?[category]:[]
    };
    group.item_count+=count;groups.set(key,group);
    const bucketKey=root+'\u0000'+day;
    daily.set(bucketKey,(daily.get(bucketKey)||0)+count);
  }
  return {
    rootBuckets:[...daily].map(([key,item_count])=>{
      const [category,start_date]=key.split('\u0000');return {category,start_date,item_count};
    }).sort((a,b)=>a.start_date.localeCompare(b.start_date)||a.category.localeCompare(b.category)),
    groups:[...groups.values()].sort((a,b)=>b.item_count-a.item_count||a.source_name.localeCompare(b.source_name))
  };
}

export function selectCultureRiverChildren(rows=[],taxonomy={},roots=[]){
  const wanted=new Set(roots);
  return rows.filter(row=>{
    if(row?.kind==='media')return wanted.has('media');
    if(row?.kind!=='source')return false;
    const root=assignedSource(String(row.category||'').trim(),taxonomy.aliases||[],taxonomy.categories||[])==='unclassified'?'custom':'system';
    return wanted.has(root);
  });
}

/**
 * Reuse ONE time-bounded DB aggregate for the initial parent lanes and
 * clicked children. The first paint consumes rootBuckets/groups only; the
 * compact numericRows remain in SWR until the user expands a parent.
 *
 * No article text, extra SQL request, or remote ISR cache is involved.
 */
export function buildCultureRiverRootPayload({text=[],media=[]}={},taxonomy={}){
  const numericRows=[
    ...(Array.isArray(text)?text:[]).map(row=>({
      kind:'source',day:String(row?.day||''),category:String(row?.category||''),
      item_count:Number(row?.item_count)||0
    })),
    ...(Array.isArray(media)?media:[]).map(row=>({
      kind:'media',day:String(row?.day||''),category:String(row?.category||''),
      item_count:Number(row?.item_count)||0
    }))
  ];
  return {...summarizeCultureRiverRoots(numericRows,taxonomy),numericRows};
}
