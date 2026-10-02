import {selectDailyCategoryCounts,selectSourceDaily} from './aggregate-query';
import {resolveScopeTables,selectManagedScopes} from './scope-table-mapping';

const SOURCE_BUCKET_ORDER=['Facebook','Threads','IG','Others'];

function dateOnly(value){return String(value||'').slice(0,10);}

function sourceBucket(value=''){
  const source=String(value||'').trim().toLowerCase();
  if(source.includes('facebook')||source==='fb')return 'Facebook';
  if(source.includes('threads'))return 'Threads';
  if(source.includes('instagram')||source.includes('reels')||source==='ig')return 'IG';
  return 'Others';
}

async function scopeSourceTrendRows(scopeId,{startDate='',endDate=''}={}){
  const tables=await resolveScopeTables(scopeId);
  const [textDaily,mediaDaily]=await Promise.all([
    selectSourceDaily({scopeId,startDate,endDate}),
    selectDailyCategoryCounts(tables.galaxyMedia,'media_type',{startDate,endDate})
  ]);
  const combined=new Map();
  for(const row of textDaily){
    const day=dateOnly(row.day);
    if(!day)continue;
    const bucket=sourceBucket(row.source_name);
    const key=day+'|'+bucket;
    combined.set(key,(combined.get(key)||0)+(Number(row.item_count)||0));
  }
  for(const row of mediaDaily){
    const day=dateOnly(row.day);
    if(!day)continue;
    const bucket=sourceBucket(row.category);
    const key=day+'|'+bucket;
    combined.set(key,(combined.get(key)||0)+(Number(row.item_count)||0));
  }
  return [...combined.entries()].map(([key,item_count])=>{
    const split=key.indexOf('|');
    return {
      day:key.slice(0,split),
      source:key.slice(split+1),
      item_count:Number(item_count)||0
    };
  }).sort((a,b)=>a.day.localeCompare(b.day)||SOURCE_BUCKET_ORDER.indexOf(a.source)-SOURCE_BUCKET_ORDER.indexOf(b.source));
}

export async function selectScopeSourceTrendRows(scopeId,{startDate='',endDate=''}={}){
  const id=String(scopeId||'').trim();
  if(!id)throw new Error('資料設定無效');
  const range={startDate:dateOnly(startDate),endDate:dateOnly(endDate)};
  const rows=id==='loc'
    ?(await Promise.all((await selectManagedScopes()).filter(scope=>scope.id!=='loc').map(scope=>scopeSourceTrendRows(scope.id,range)))).flat()
    :await scopeSourceTrendRows(id,range);
  const merged=new Map();
  for(const row of rows){
    const key=row.day+'|'+row.source;
    merged.set(key,(merged.get(key)||0)+(Number(row.item_count)||0));
  }
  return [...merged.entries()].map(([key,item_count])=>{
    const split=key.indexOf('|');
    return {
      day:key.slice(0,split),
      source:key.slice(split+1),
      item_count:Number(item_count)||0
    };
  }).sort((a,b)=>a.day.localeCompare(b.day)||SOURCE_BUCKET_ORDER.indexOf(a.source)-SOURCE_BUCKET_ORDER.indexOf(b.source));
}
