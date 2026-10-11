// Cross-Scope Statistics consent is controlled only at (Scope, Admin group source).
// Personal source labels are not separate consent switches.
// Backward-compatible defaults: absence of an explicit choice retains previously
// public LOC statistics; only an explicit false removes that group's contribution.
import {assignedSource} from './member-intersection-model.mjs';

export function sharedGroupCodes(scopeId,permissions=[],categories=[]){
  if(!scopeId)return new Set();
  const available=(categories||[]).filter(row=>row.enabled!==false)
    .map(row=>String(row.category_code||'')).filter(Boolean);
  const declined=new Set((permissions||[]).filter(row=>row.scope_id===scopeId&&row.share_enabled===false)
    .map(row=>String(row.category_code||'')));
  return new Set(available.filter(code=>!declined.has(code)));
}
export function canParticipateInCrossStatistics(scopeId,permissions=[],categories=[]){
  return sharedGroupCodes(scopeId,permissions,categories).size>0;
}
export function sharedSourceBreakdown(rows=[],scopeId='',taxonomy={}){
  const categories=taxonomy.categories||[],aliases=taxonomy.aliases||[];
  const personal=taxonomy.scopeSources||[],permissions=taxonomy.permissions||[];
  const shared=sharedGroupCodes(scopeId,permissions,categories);
  if(!shared.size)return [];
  // Source and media facts are mapped to their group source classification.
  // Never use pre-aggregated 'total' rows here; they include unconsented data.
  const output=[];
  const totals=new Map();
  for(const row of rows||[]){
    if(row.kind!=='source'&&row.kind!=='media')continue;
    const group=assignedSource(row.category,aliases,categories,personal,scopeId);
    if(!shared.has(group))continue;
    const count=Math.max(0,Number(row.item_count)||0);
    if(!count)continue;
    output.push({...row,item_count:count});
    const kind=row.kind==='source'?'文字作品':'多媒體';
    const key=String(row.day||'')+'\u0000'+kind;
    totals.set(key,(totals.get(key)||0)+count);
  }
  for(const [key,item_count] of totals){
    const split=key.indexOf('\u0000');
    output.push({day:key.slice(0,split),kind:'total',category:key.slice(split+1),item_count});
  }
  return output.sort((a,b)=>String(a.day).localeCompare(String(b.day))||
    String(a.kind).localeCompare(String(b.kind))||String(a.category).localeCompare(String(b.category)));
}
export function sharedScopeDensity(rows=[],scopeId='',taxonomy={}){
  const daily=new Map();
  for(const row of sharedSourceBreakdown(rows,scopeId,taxonomy)){
    if(row.kind!=='total')continue;
    const day=String(row.day||'').slice(0,10);
    daily.set(day,(daily.get(day)||0)+(Number(row.item_count)||0));
  }
  return [...daily.entries()].map(([day,item_count])=>({scope_id:scopeId,day,item_count}));
}
