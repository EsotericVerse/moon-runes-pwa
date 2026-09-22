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
                              from silver.runes_context_entries
                             where lower(context_type) in ('period','era')
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
      const rows=await db`select keyword,count(*)::int as count
        from (
          select unnest(
            coalesce(s.theme_tags,ARRAY[]::text[])||
            coalesce(s.emotion_tags,ARRAY[]::text[])||
            coalesce(s.imagery_tags,ARRAY[]::text[])||
            coalesce(s.context_tags,ARRAY[]::text[])||
            coalesce(s.genre_tags,ARRAY[]::text[])
          ) as keyword
          from silver.work_semantics s
          join silver.works w on w.work_id=s.work_id
          where w.scope='lo3rwang'
        ) keywords
        where keyword is not null and keyword<>''
        group by keyword order by count desc,keyword`;
      payload={keywords:rows.map(row=>({name:row.keyword,count:Number(row.count)||0}))};
    }else if(path==='literary/loc4-writing'){
      const rows=await db`select w.work_id,w.scope,w.work_type,w.title,w.created_date,w.period_code,w.era_code,w.era_name,
        w.content_origin,w.source_status,w.source_ref,s.ai_summary,s.theme_tags,s.emotion_tags,s.imagery_tags,s.context_tags,s.genre_tags,
        coalesce((
          select jsonb_agg(jsonb_build_object('title',v.title,'url',v.suno_url,'source_type','song','role',v.version_label)
            order by v.is_representative desc nulls last,v.version_label,v.song_id)
          from silver.song_versions v where v.work_id=w.work_id and v.suno_url is not null
        ),'[]'::jsonb) as source_refs
        from silver.works w
        left join silver.work_semantics s on s.work_id=w.work_id
        where w.scope='lo3rwang'
        order by w.created_date desc nulls last,w.work_id`;
      payload={works:rows.map(row=>({
        ...row,
        summary:row.ai_summary||'',
        period:row.period_code||row.era_code||'',
        period_name:row.era_name||row.period_code||'',
        tags:[...new Set([row.theme_tags,row.emotion_tags,row.imagery_tags,row.context_tags,row.genre_tags].filter(Array.isArray).flat().filter(Boolean))],
        source_refs:Array.isArray(row.source_refs)?row.source_refs:[]
      }))};
    }else if(path==='knowledge/assets'){
      payload={assets:await db`select asset_id,owner_scope,title,body,asset_type,source_ref,rights_ref,lifecycle,metadata,updated_at
        from silver.knowledge_assets order by updated_at desc nulls last,asset_id`};
    }else if(['canonical/lots','canonical/rune-interpretations','canonical/rune-grammar','canonical/three-card-combinations','context/loc2-events','culture/loc3-period-keywords','governance/loc6','culture/period-keywords','culture/loc6-period-keywords','context/graph-schema','governance/style-groups','media/registry','knowledge/search-governance','knowledge/search-stats'].includes(path)){
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
