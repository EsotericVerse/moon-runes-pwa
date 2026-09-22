import {NextResponse} from 'next/server';
import {neonServerRequest} from '../../loc/neon-server';
import {z} from 'zod';

export const dynamic='force-dynamic';
export const revalidate=0;

const QuerySchema=z.object({scopeId:z.enum(['loc','runes','lo3rwang']).default('loc')});

function periodRows(rows){
  return (Array.isArray(rows)?rows:[]).map(row=>({
    era_id:row.payload?.era_id||row.context_key,
    period:row.payload?.period||row.context_key||'',
    name:row.payload?.name||row.title||row.context_key,
    title:row.title||row.context_key,
    description:row.summary||'',
    start_date:row.payload?.start_date||null,
    end_date:row.payload?.end_date||null,
    order:Number(row.payload?.order||0),
    status:row.payload?.status||''
  })).sort((a,b)=>a.order-b.order);
}

function mergeHistory(rows){
  const result={records:(Array.isArray(rows)?rows:[]).map(row=>({
    history_id:row.history_id,
    history_kind:row.history_kind,
    sequence_no:row.sequence_no,
    title:row.title,
    body:row.body||{},
    source_payload:row.source_payload||{}
  }))};
  for(const row of rows||[]){
    const body=row?.body;
    if(!body||typeof body!=='object'||Array.isArray(body))continue;
    for(const [key,value] of Object.entries(body)){
      if(Array.isArray(value))result[key]=[...(Array.isArray(result[key])?result[key]:[]),...value];
      else if(value&&typeof value==='object'&&!Array.isArray(value))result[key]={...(result[key]&&typeof result[key]==='object'?result[key]:{}),...value};
      else if(result[key]===undefined)result[key]=value;
    }
  }
  return result;
}

async function readPeriods(db){
  return db`select context_key,context_type,title,summary,payload
                 from silver.lo3rwang_period_context_entries
                where context_type='period'
                order by coalesce((payload->>'order')::int,0),context_key`;
}

async function readRuneHistory(db){
  return db`select history_id,history_kind,sequence_no,title,body,source_payload
                 from silver.lrunes_evolution_history
                order by sequence_no nulls last,history_id`;
}

async function readWorks(db){
  return db`select w.work_id,w.work_type,w.period_code,w.era_code,w.era_name,
                    s.theme_tags,s.emotion_tags,s.imagery_tags,s.context_tags,s.genre_tags
               from silver.works w
               left join silver.work_semantics s on s.work_id=w.work_id
              where w.scope='lo3rwang'
              order by w.created_date nulls last,w.work_id`;
}

function flattenTags(row){
  return [row.theme_tags,row.emotion_tags,row.imagery_tags,row.context_tags,row.genre_tags]
    .filter(Array.isArray)
    .flat()
    .map(value=>String(value||'').trim())
    .filter(Boolean);
}

function buildWorkPeriods(rows,acceptedTypes){
  const buckets=new Map();
  for(const row of rows||[]){
    if(acceptedTypes.size&&!acceptedTypes.has(row.work_type))continue;
    const period=row.period_code||row.era_code||row.era_name||'未分類';
    const key=`${row.work_type||'work'}:${period}`;
    const bucket=buckets.get(key)||{period,work_type:row.work_type||'work',work_count:0,keywords:new Map(),workIds:new Set()};
    if(!bucket.workIds.has(row.work_id)){
      bucket.workIds.add(row.work_id);
      bucket.work_count+=1;
    }
    for(const keyword of flattenTags(row))bucket.keywords.set(keyword,(bucket.keywords.get(keyword)||0)+1);
    buckets.set(key,bucket);
  }
  return {periods:[...buckets.values()].sort((a,b)=>String(a.period).localeCompare(String(b.period))).map(bucket=>({
    period:bucket.period,
    work_type:bucket.work_type,
    work_count:bucket.work_count,
    keywords:[...bucket.keywords.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([keyword,count])=>({keyword,count}))
  }))};
}

function buildAuthorKeywords(rows){
  const counts=new Map();
  for(const row of rows||[])for(const keyword of flattenTags(row))counts.set(keyword,(counts.get(keyword)||0)+1);
  return {keywords:[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,count])=>({name,count}))};
}

export async function GET(request){
  const parsed=QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return NextResponse.json({error:'查詢參數無效',code:'INVALID_QUERY'},{status:400});
  const {scopeId}=parsed.data;
  try{
    const {db}=neonServerRequest(request);
    const [periods,historyRows,workRows]=await Promise.all([
      readPeriods(db),
      scopeId==='loc'||scopeId==='runes'?readRuneHistory(db):Promise.resolve([]),
      scopeId==='lo3rwang'||scopeId==='loc'?readWorks(db):Promise.resolve([])
    ]);
    const eras=periodRows(periods);
    const runeHistory=mergeHistory(historyRows);
    const runeEras=(Array.isArray(runeHistory.eras)?runeHistory.eras:[])
      .concat(Array.isArray(runeHistory.rune_periods)?runeHistory.rune_periods:[])
      .filter((row,index,array)=>row&&array.findIndex(item=>JSON.stringify(item)===JSON.stringify(row))===index);
    const payload={
      scopeId,
      eras:{eras:scopeId==='runes'?runeEras:eras},
      authorEras:scopeId==='loc'||scopeId==='lo3rwang'?{eras}:undefined,
      runeEras:{eras:runeEras},
      runeHistory,
      periods:periods.map(row=>({...row,payload:row.payload||{}})),
      authorKeywords:buildAuthorKeywords(workRows),
      musicPeriods:buildWorkPeriods(workRows,new Set(['music'])),
      writingPeriods:buildWorkPeriods(workRows,new Set(['writing','novel','literary','text']))
    };
    return NextResponse.json(payload,{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error){
    console.error('Neon culture query failed',error);
    return NextResponse.json({error:'文化資料讀取失敗',code:'NEON_READ_FAILED'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
