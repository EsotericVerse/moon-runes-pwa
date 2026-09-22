import {NextResponse} from 'next/server';
import {neon} from '@neondatabase/serverless';
import {z} from 'zod';

export const dynamic='force-dynamic';
export const revalidate=0;

const QuerySchema=z.object({
  scopeId:z.enum(['loc','runes','lo3rwang']),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(100).default(20),
  rankingType:z.string().trim().max(80).default('')
});
const TAG_DIMENSIONS=Object.freeze([
  ['主題','theme_tags'],['情緒','emotion_tags'],['意象','imagery_tags'],
  ['脈絡','context_tags'],['曲風','genre_tags']
]);

export async function GET(request){
  const parsed=QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return NextResponse.json({error:'查詢參數無效',code:'INVALID_QUERY'},{status:400});
  const {scopeId,page,pageSize,rankingType}=parsed.data;
  const databaseUrl=process.env.DATABASE_URL;
  if(!databaseUrl)return NextResponse.json({error:'Neon server connection is not configured',code:'NEON_NOT_CONFIGURED'},{status:503});

  try{
    const db=neon(databaseUrl);
    const result=await db`
      with scope_work as (
        select wr.work_id
          from silver.work_registry wr
         where wr.owner_scope=${scopeId}
        union
        select affiliation.work_id
          from silver.work_scope_affiliations affiliation
          join silver.work_registry wr using(work_id)
         where affiliation.scope_id=${scopeId}
           and (${scopeId} <> 'loc' or affiliation.statistics_included is true)
      ),
      tag_rows as (
        select sw.work_id,'主題'::text as ranking_type,tag.term
          from scope_work sw
          join silver.work_semantics semantics using(work_id)
          cross join lateral unnest(coalesce(semantics.theme_tags,'{}'::text[])) tag(term)
        union all
        select sw.work_id,'情緒'::text,tag.term
          from scope_work sw join silver.work_semantics semantics using(work_id)
          cross join lateral unnest(coalesce(semantics.emotion_tags,'{}'::text[])) tag(term)
        union all
        select sw.work_id,'意象'::text,tag.term
          from scope_work sw join silver.work_semantics semantics using(work_id)
          cross join lateral unnest(coalesce(semantics.imagery_tags,'{}'::text[])) tag(term)
        union all
        select sw.work_id,'脈絡'::text,tag.term
          from scope_work sw join silver.work_semantics semantics using(work_id)
          cross join lateral unnest(coalesce(semantics.context_tags,'{}'::text[])) tag(term)
        union all
        select sw.work_id,'曲風'::text,tag.term
          from scope_work sw join silver.work_semantics semantics using(work_id)
          cross join lateral unnest(coalesce(semantics.genre_tags,'{}'::text[])) tag(term)
      ),
      ranking as (
        select ranking_type,term,count(distinct work_id)::bigint as item_count
          from (select distinct work_id,ranking_type,btrim(term) as term from tag_rows where btrim(term)<>'') tags
         group by ranking_type,term
      ),
      filtered as (
        select ranking_type,term,item_count
          from ranking
         where ${rankingType}='' or ranking_type=${rankingType}
      ),
      page_rows as (
        select ranking_type,term,item_count,
               item_count::numeric as rank_value,
               ranking_type||':'||term as ranking_key
          from filtered
         order by item_count desc,term asc
         limit ${pageSize} offset ${(page-1)*pageSize}
      )
      select
        (select count(*)::bigint from filtered) as count,
        coalesce((select json_agg(to_jsonb(page_rows)) from page_rows),'[]'::json) as rows,
        coalesce((select json_agg(distinct ranking_type order by ranking_type) from ranking),'[]'::json) as types
    `;
    return NextResponse.json({
      rows:result[0]?.rows||[],
      count:Number(result[0]?.count||0),
      page,pageSize,
      types:result[0]?.types||[]
    },{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error){
    console.error('Neon live ranking query failed',error);
    return NextResponse.json({error:'統計資料讀取失敗',code:'NEON_READ_FAILED'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
