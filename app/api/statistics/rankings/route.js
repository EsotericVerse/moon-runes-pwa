import {NextResponse} from 'next/server';
import {neonServerRequest,readNeonUserId,readScopeAuthorizer} from '../../../loc/neon-server';
import {z} from 'zod';

export const dynamic='force-dynamic';
export const revalidate=0;

const QuerySchema=z.object({
  scopeId:z.enum(['loc','runes','lo3rwang']),
  page:z.coerce.number().int().min(1).max(100000).default(1),
  pageSize:z.coerce.number().int().min(1).max(100).default(20),
  rankingType:z.string().trim().max(80).default('')
});

export async function GET(request){
  const parsed=QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if(!parsed.success)return NextResponse.json({error:'查詢參數無效',code:'INVALID_QUERY'},{status:400});
  const {scopeId,page,pageSize,rankingType}=parsed.data;
  try{
    const {db,authenticated}=neonServerRequest(request);
    if(!authenticated)return NextResponse.json({error:'需要登入 Neon 才能讀取統計',code:'AUTH_REQUIRED'},{status:401});
    const userId=await readNeonUserId(db);
    if(!userId)return NextResponse.json({error:'Neon session 無效',code:'AUTH_INVALID'},{status:401});
    const authorizer=await readScopeAuthorizer(db,userId);
    const grants=authorizer.grants||[];
    const hasReadScope=grants.some(grant=>grant.scope_id===scopeId||grant.access_level==='global_admin');
    if(!hasReadScope)return NextResponse.json({error:'目前帳號沒有此 Scope 的統計權限',code:'SCOPE_FORBIDDEN'},{status:403});
    const result=await db`
      with scope_work as (
        select distinct wr.work_id
          from silver.work_registry wr
          left join silver.work_scope_affiliations owner_affiliation
            on owner_affiliation.work_id=wr.work_id
           and owner_affiliation.scope_id=wr.owner_scope
          left join silver.work_scope_affiliations scope_affiliation
            on scope_affiliation.work_id=wr.work_id
           and scope_affiliation.scope_id=${scopeId}
          left join silver.resource_visibility owner_visibility
            on owner_visibility.resource_type='work'
           and owner_visibility.resource_id=wr.work_id
           and owner_visibility.scope=wr.owner_scope
          left join silver.resource_visibility scope_visibility
            on scope_visibility.resource_type='work'
           and scope_visibility.resource_id=wr.work_id
           and scope_visibility.scope=${scopeId}
         where (
           ${scopeId}='loc'
           and (
             (
               wr.owner_scope='loc'
               and coalesce(owner_affiliation.statistics_included,true)
               and coalesce(owner_visibility.statistics_included,true)
             )
             or (
               scope_affiliation.statistics_included is true
               and coalesce(scope_visibility.statistics_included,true)
             )
           )
         ) or (
           ${scopeId}<>'loc'
           and (
             (
               wr.owner_scope=${scopeId}
               and coalesce(owner_affiliation.statistics_included,true)
               and coalesce(owner_visibility.statistics_included,true)
             )
             or (
               scope_affiliation.statistics_included is true
               and coalesce(scope_visibility.statistics_included,true)
             )
           )
         )
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
