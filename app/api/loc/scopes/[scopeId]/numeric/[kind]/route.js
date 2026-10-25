import {unstable_cache} from 'next/cache';
import {withLocCors,locCorsPreflight} from '../../../../_cors';
import {createPublicSupabaseClient,validScopeId} from '../../../../_server';
import {StatisticsFacets} from '../../../../../../loc/statistics-facets';
import {publishedSourceTaxonomy} from '../../../../../../modular/published-source-taxonomy.js';
import {summarizeCultureRiverRoots,selectCultureRiverChildren} from '../../../../../../loc/culture-river-roots.mjs';

// Public Culture/Statistics numeric summaries and the frequently used Time-period\n// navigation index are cached; never cache raw articles, Blocks or private text.
export const revalidate=3600;
export const LOC_NUMERIC_CACHE_TAG='loc-numeric-summaries-v1';
const DAY=/^\d{4}-\d{2}-\d{2}$/;
function date(value){
  if(!value)return null;
  if(!DAY.test(value)||Number.isNaN(Date.parse(value+'T00:00:00Z')))
    throw new Error('Invalid date');
  return value;
}

export async function GET(request,{params}){
  const {scopeId,kind}=await params;
  if(!validScopeId(scopeId)||['local','admin'].includes(scopeId)||!['culture','culture-roots','culture-children','statistics','loc-statistics','facet','earliest','daily','daily-earliest','periods'].includes(kind))
    return withLocCors(Response.json({error:'Invalid numeric summary path'},{status:400}),request);
  let start,end,undated,dimension='',roots=[];
  try{
    const search=new URL(request.url).searchParams;
    if([...search.keys()].some(key=>!['start','end','undated','dimension','roots'].includes(key)))throw Error('Unknown parameter');
    if(kind!=='culture-children'&&search.has('roots'))throw Error('Unexpected roots');
    if(kind==='culture-children'){
      const parts=String(search.get('roots')||'').split(',');
      if(!parts.length||parts.some(v=>!['system','custom','media'].includes(v))||new Set(parts).size!==parts.length)throw Error('Invalid root list');
      roots=parts;
    }
    dimension=search.get('dimension')||'';
    if(kind==='facet'?!['media_type','media_platform','media_style'].includes(dimension):Boolean(dimension))throw Error('Invalid facet dimension');
    if(['facet','earliest','daily','daily-earliest'].includes(kind)&&search.has('undated'))throw Error('Unexpected undated');
    if(['daily','daily-earliest'].includes(kind)&&scopeId!=='lrunes')throw Error('Daily Rune Scope only');
    if(kind==='loc-statistics'&&scopeId!=='loc')throw Error('LOC aggregate Scope only');
    if(['earliest','daily-earliest','periods'].includes(kind)&&search.size)throw Error('Unexpected date range');
    if(['statistics','loc-statistics'].includes(kind)&&search.has('undated'))throw Error('Unexpected undated');
    if(search.has('undated')&&!['0','1'].includes(search.get('undated')))throw Error('Invalid undated');
    start=date(search.get('start'));
    end=date(search.get('end'));
    if(start&&end&&start>end)throw Error('Reversed date range');
    if(kind==='daily'&&(!start||!end))throw Error('Daily Rune range required');
    undated=['culture','culture-roots','culture-children'].includes(kind)&&search.get('undated')==='1';
  }catch{return withLocCors(Response.json({error:'Invalid date range'},{status:400}),request);}
  // Both responses share the same ISR result, so expansion never doubles SQL.
  const cachedKind=['culture-roots','culture-children'].includes(kind)?'culture':kind;
  const read=unstable_cache(async()=>{
    const kind=cachedKind;
    const db=createPublicSupabaseClient();
    // LOC aggregates Scope totals in one public RPC, cached across browser sessions.
    // Per-Scope statistics retain their existing independent cache keys.
    if(kind==='periods'){
      // The Period selector is the *primary* navigation in Culture and
      // Statistics, not an optional post-focus query. Cache only public names
      // and date boundaries, never raw Time notes, draft content or addresses.
      // Resolve the table suffix from the canonical silver.manage registry.
      const {data:scope,error:scopeError}=await db.from('manage')
        .select('time_table,birthday').eq('id',scopeId).eq('manage_role','scope').maybeSingle();
      if(scopeError)throw scopeError;
      if(!scope)throw Error('Unknown Scope');
      // time_table is an optional registry override, not a prerequisite
      // for using an otherwise empty silver.{scope}_time table.
      const suffix=String(scope.time_table||'time').trim();
      if(!/^[a-z][a-z0-9_]*$/.test(suffix))throw Error('Invalid registered Time table');
      const {data,error}=await db.from(scopeId+'_'+suffix)
        .select('record_id,record_type,resource_id,label,display_order,status,anchor_ids,time_date,date_status,year_value')
        .in('record_type',['anchor','period'])
        .order('display_order',{ascending:true})
        .order('record_id',{ascending:true});
      if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      const anchorDates=new Map();
      for(const row of rows){
        if(row.record_type!=='anchor')continue;
        const id=String(row.resource_id||'').trim();
        const date=String(row.time_date||'').slice(0,10);
        const resolved=DAY.test(date)?date
          :row.date_status==='year_only'&&Number.isInteger(Number(row.year_value))&&Number(row.year_value)>0
            ?String(row.year_value)+'-01-01':null;
        if(id&&resolved){
          if(anchorDates.has(id)&&anchorDates.get(id)!==resolved)
            throw Error('Time anchor date conflict');
          anchorDates.set(id,resolved);
        }
      }
      const previousDay=value=>{
        if(!value)return null;
        const d=new Date(value+'T00:00:00Z');
        if(Number.isNaN(d.getTime()))return null;
        d.setUTCDate(d.getUTCDate()-1);
        return d.toISOString().slice(0,10);
      };
      return rows.filter(row=>row.record_type==='period').map(row=>{
        const id=String(row.resource_id||row.record_id||'');
        const anchors=Array.isArray(row.anchor_ids)?row.anchor_ids:[];
        const first=String(anchors[0]||'0'),last=String(anchors.at(-1)||'0');
        const start=first==='0'?String(scope.birthday||'').slice(0,10):anchorDates.get(first)||null;
        const end=last==='0'?null:previousDay(anchorDates.get(last)||'');
        const title=String(row.label||id);
        return {
          record_id:row.record_id,period:id,era_id:id,entry_type:'period',scope_id:scopeId,
          title,name:title,display_label:title,start_date:start,end_date:end,
          status:String(row.status||''),order:Number(row.display_order)||0
        };
      }).filter(row=>DAY.test(String(row.start_date||'')))
        .sort((a,b)=>a.start_date.localeCompare(b.start_date)||a.order-b.order);
    }
    if(kind==='loc-statistics'){
      const {data,error}=await db.rpc('read_loc_statistics',{p_start:start,p_end:end});
      if(error)throw error;
      if(!data||!Array.isArray(data.rows)||!Array.isArray(data.scopes))throw Error('Invalid LOC statistics result');
      return {earliest:String(data.earliest||'').slice(0,10),rows:data.rows,scopes:data.scopes};
    }
    if(kind==='earliest'){
      const {data,error}=await db.rpc('read_scope_earliest',{p_scope_id:scopeId});
      if(error)throw error;
      return String(data||'').slice(0,10);
    }
    if(kind==='daily-earliest'){
      const {data,error}=await db.from('lrunes_daily')
        .select('record_date').order('record_date',{ascending:true}).limit(1);
      if(error)throw error;
      return String(data?.[0]?.record_date||'').slice(0,10);
    }
    if(kind==='daily'){
      // Public Time River records and chart inputs only. Never cache private
      // draw sessions, per-user histories or the full Rune descriptions.
      const draws=[];
      for(let from=0;;){
        const {data,error}=await db.from('lrunes_daily')
          .select('record_date,draw_kind,rune_number,direction,recorded_phase')
          .gte('record_date',start).lte('record_date',end)
          .order('record_date',{ascending:true}).order('draw_kind',{ascending:true})
          .range(from,from+65534);
        if(error)throw error;
        const batch=Array.isArray(data)?data:[];
        draws.push(...batch);
        from+=batch.length;
        if(batch.length<65535)break;
      }
      const numbers=[...new Set(draws.map(row=>Number(row.rune_number))
        .filter(number=>Number.isInteger(number)&&number>=0&&number<=66))];
      const {data:meta,error:metaError}=numbers.length
        ?await db.from('runes').select('rune_id,rune_name,moon_phase').in('rune_id',numbers)
        :{data:[],error:null};
      if(metaError)throw metaError;
      const runeMap=new Map((meta||[]).map(row=>[Number(row.rune_id),row]));
      return draws.map(row=>{
        const rune=runeMap.get(Number(row.rune_number))||{};
        return {...row,rune_id:rune.rune_id??row.rune_number,
          rune_name:rune.rune_name||String(row.rune_number),
          moon_phase:rune.moon_phase??null};
      });
    }
    if(kind==='facet'){
      // The worker caches only per-day counts; public Media rows never leave this server route.
      const totals=new Map();
      let from=0;
      for(;;){
        let q=db.from(scopeId+'_galaxy_media')
          .select('media_id,media_type,url,meta_tags,createtime')
          .order('media_id',{ascending:true}).range(from,from+65534);
        if(start)q=q.gte('createtime',start+'T00:00:00+08:00');
        if(end)q=q.lte('createtime',end+'T23:59:59.999+08:00');
        const {data,error}=await q;
        if(error)throw error;
        const rows=Array.isArray(data)?data:[];
        for(const row of StatisticsFacets.base.mediaFacetDaily(rows,dimension)){
          const key=row.day+'\u0000'+row.category.normalize('NFKC').toLocaleLowerCase();
          const stored=totals.get(key);
          if(stored)stored.item_count+=row.item_count;
          else totals.set(key,{...row});
        }
        from+=rows.length;
        if(rows.length<65535)break;
      }
      return [...totals.values()].sort((a,b)=>a.day.localeCompare(b.day)||a.category.localeCompare(b.category));
    }
    const name=kind==='culture'?'read_scope_statistics':'read_scope_overview';
    const args=kind==='culture'
      ?{p_scope_id:scopeId,p_start:start,p_end:end,p_include_undated:undated}
      :{p_scope_id:scopeId,p_start:start,p_end:end};
    const {data,error}=await db.rpc(name,args);
    if(error)throw error;
    if(kind==='culture'){
      if(!Array.isArray(data))throw Error('Invalid culture numeric result');
      return data;
    }
    if(!data||!Array.isArray(data.rows))throw Error('Invalid statistics numeric result');
    return {
      earliest:String(data.earliest||'').slice(0,10),
      rows:data.rows,
      categories:Array.isArray(data.categories)?data.categories:[],
      aliases:Array.isArray(data.aliases)?data.aliases:[]
    };
  },['loc-numeric-v4',cachedKind,scopeId,start||'',end||'',undated?'1':'0',dimension],{
    revalidate,tags:[LOC_NUMERIC_CACHE_TAG]
  });
  try{
    const result=await read();
    const taxonomy=publishedSourceTaxonomy(scopeId)||{};
    const payload=kind==='culture-roots'?summarizeCultureRiverRoots(result,taxonomy)
      :kind==='culture-children'?selectCultureRiverChildren(result,taxonomy,roots):result;
    return withLocCors(Response.json(payload,{headers:{
      'Cache-Control':'no-store',
      'X-LOC-Numeric-ISR':'server-cache'
    }}),request);
  }catch{
    return withLocCors(Response.json({error:'Numeric summary unavailable'},{
      status:502,headers:{'Cache-Control':'no-store'}
    }),request);
  }
}
export function OPTIONS(request){return locCorsPreflight(request);}
