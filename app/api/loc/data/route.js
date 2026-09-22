import {NextResponse} from 'next/server';
import {neonServerRequest} from '../../../loc/neon-server';
import {z} from 'zod';

export const dynamic='force-dynamic';
export const revalidate=0;

const QuerySchema=z.object({path:z.string().trim().min(1).max(240)});

function normalizedPath(path){return String(path||'').trim().replace(/^\/+/,'');}

function runeRows(rows){
  return (Array.isArray(rows)?rows:[]).map(row=>({
    編號:row.rune_number,
    符文名稱:row.rune_name,
    所屬分組:row.group_name,
    英文:row.english_name,
    ...(row.canonical_payload&&typeof row.canonical_payload==='object'?row.canonical_payload:{})
  }));
}

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
  const result={records:(rows||[]).map(row=>({...row,body:row.body||{},source_payload:row.source_payload||{}}))};
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

export async function GET(request){
  const parsed=QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return NextResponse.json({error:'資料路徑無效',code:'INVALID_PATH'},{status:400});
  const path=normalizedPath(parsed.data.path);
  try{
    const {db}=neonServerRequest(request);
    let payload=[];
    if(path==='canonical/runes'){
      const rows=await db`select rune_number,rune_name,group_name,english_name,canonical_payload
                              from silver.lrunes_runes
                             order by rune_number`;
      payload=runeRows(rows);
    }else if(path==='canonical/harmony'){
      payload=await db`select rune_number,rune_name,soul_question,practice_challenge,ritual_advice,harmony_advice,source_payload
                           from silver.lrunes_harmony order by rune_number`;
    }else if(path==='canonical/history'||path==='evolution/daily-rune-history'||path==='context/loc8-events'){
      payload=mergeHistory(await db`select history_id,history_kind,sequence_no,title,body,source_payload
                                     from silver.lrunes_evolution_history
                                    order by sequence_no nulls last,history_id`);
    }else if(path==='culture/lrunes-periods'){
      const rows=await db`select context_key,context_type,title,summary,payload
                              from silver.lo3rwang_period_context_entries
                             where context_type='period'
                             order by coalesce((payload->>'order')::int,0),context_key`;
      payload={eras:periodRows(rows)};
    }else if(path==='culture/lo3rwang-periods'){
      const rows=await db`select context_key,context_type,title,summary,payload
                              from silver.lo3rwang_period_context_entries
                             where context_type='period'
                             order by coalesce((payload->>'order')::int,0),context_key`;
      payload={eras:periodRows(rows)};
    }else if(path==='knowledge/faq'){
      payload=await db`select faq_id,category,intent,question,aliases,answer,keywords,related_ids,source_refs,canon_version,status
                           from silver.faq_entries order by faq_id`;
    }else if(path==='context/cross-relations'){
      payload=await db`select * from silver.content_relations order by updated_at desc nulls last`;
    }else if(path==='culture/zhengde-keywords'){
      payload={keywords:[]};
    }else if(['canonical/lots','canonical/rune-interpretations','canonical/rune-grammar','canonical/three-card-combinations','context/loc2-events','culture/loc3-period-keywords','literary/loc4-writing','governance/loc6','culture/period-keywords','culture/loc6-period-keywords','context/graph-schema','governance/style-groups','media/registry','knowledge/assets','knowledge/search-governance','knowledge/search-stats'].includes(path)){
      payload=[];
    }else if(path.startsWith('dataset/')){
      payload={shards:[]};
    }else{
      return NextResponse.json({error:'此 Neon semantic data key 尚未對應 canonical table',code:'NEON_SOURCE_UNMAPPED',path},{status:404});
    }
    return NextResponse.json(payload,{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error){
    console.error('Neon canonical data query failed',error);
    return NextResponse.json({error:'Neon canonical 資料讀取失敗',code:'NEON_READ_FAILED'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
