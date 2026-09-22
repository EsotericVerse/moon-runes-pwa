import {NextResponse} from 'next/server';
import {neonServerRequest} from '../../../loc/neon-server';
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

async function readPeriods(db,scopeId){
  const table=scopeId==='lo3rwang'?'silver.lo3rwang_period_context_entries':'silver.lo3rwang_period_context_entries';
  return db`select context_key,context_type,title,summary,payload
                from ${db.unsafe(table)}
               where context_type='period'
               order by coalesce((payload->>'order')::int,0),context_key`;
}

async function readRuneHistory(db){
  return db`select history_id,history_kind,sequence_no,title,body,source_payload
                 from silver.lrunes_evolution_history
                order by sequence_no nulls last,history_id`;
}

export async function GET(request){
  const parsed=QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return NextResponse.json({error:'查詢參數無效',code:'INVALID_QUERY'},{status:400});
  const {scopeId}=parsed.data;
  try{
    const {db}=neonServerRequest(request);
    const periods=await readPeriods(db,scopeId);
    const historyRows=scopeId==='loc'||scopeId==='runes'?await readRuneHistory(db):[];
    const eras=periodRows(periods);
    const runeHistory=mergeHistory(historyRows);
    const runeEras=(Array.isArray(runeHistory.eras)?runeHistory.eras:[])
      .concat(Array.isArray(runeHistory.rune_periods)?runeHistory.rune_periods:[])
      .filter((row,index,array)=>row&&array.findIndex(item=>JSON.stringify(item)===JSON.stringify(row))===index);
    const payload={
      scopeId,
      eras:{eras},
      authorEras:scopeId==='loc'||scopeId==='lo3rwang'?{eras}:undefined,
      runeEras:{eras:runeEras},
      runeHistory,
      periods:periods.map(row=>({...row,payload:row.payload||{}})),
      authorKeywords:{keywords:[]},
      musicPeriods:{periods:[]},
      writingPeriods:{periods:[]}
    };
    return NextResponse.json(payload,{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error){
    console.error('Neon culture query failed',error);
    return NextResponse.json({error:'文化資料讀取失敗',code:'NEON_READ_FAILED'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
