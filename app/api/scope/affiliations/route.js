import {NextResponse} from 'next/server';
import {z} from 'zod';
import {neonServerRequest,readNeonUserId,readScopeAuthorizer,withNeonTransaction} from '../../../loc/neon-server';

export const dynamic='force-dynamic';
export const revalidate=0;

const BodySchema=z.object({
  workId:z.string().trim().min(1).max(80),
  scopeId:z.enum(['loc','runes','lo3rwang']),
  relationType:z.enum(['primary','secondary']).default('secondary'),
  searchIncluded:z.boolean().default(true),
  statisticsIncluded:z.boolean().default(true),
  displayLabel:z.string().trim().max(240).default(''),
  note:z.string().trim().max(2000).default(''),
  overrideAction:z.enum(['include','exclude','review','replace_relation']).nullable().default(null)
});

export async function POST(request){
  let body;
  try{body=BodySchema.parse(await request.json());}
  catch(error){return NextResponse.json({error:'連結資料格式無效',code:'INVALID_BODY'},{status:400});}
  try{
    const {db,authenticated}=neonServerRequest(request);
    if(!authenticated)return NextResponse.json({error:'需要登入 Neon 才能管理 Scope 連結',code:'AUTH_REQUIRED'},{status:401});
    const userId=await readNeonUserId(db);
    if(!userId)return NextResponse.json({error:'Neon session 無效',code:'AUTH_INVALID'},{status:401});
    const authorizer=await readScopeAuthorizer(db,userId);
    const allowed=await authorizer.canManageScope(body.scopeId)||await authorizer.canManageGlobal();
    if(!allowed)return NextResponse.json({error:'目前帳號沒有此 Scope 的管理權限',code:'SCOPE_FORBIDDEN'},{status:403});
    const overrideAction=body.overrideAction||(body.statisticsIncluded?'include':'exclude');
    const results=await withNeonTransaction(db,[db`
      with source as (
        select work_id
          from silver.work_registry
         where work_id=${body.workId}
      )
      insert into silver.work_scope_affiliations (
        work_id,scope_id,relation_type,affiliation_source,rule_key,display_label,
        search_included,statistics_included,manual_override,override_action,note,
        created_at,updated_at
      )
      select work_id,${body.scopeId},${body.relationType},'manual',null,${body.displayLabel},
             ${body.searchIncluded},${body.statisticsIncluded},true,${overrideAction},${body.note},
             now(),now()
        from source
      on conflict(work_id,scope_id) do update set
        relation_type=excluded.relation_type,
        affiliation_source='manual',
        display_label=excluded.display_label,
        search_included=excluded.search_included,
        statistics_included=excluded.statistics_included,
        manual_override=true,
        override_action=excluded.override_action,
        note=excluded.note,
        updated_at=now()
      returning work_id,scope_id,relation_type,search_included,statistics_included,manual_override,override_action,display_label,note,updated_at
    `]);
    const rows=Array.isArray(results?.[0])?results[0]:[];
    if(!rows.length)return NextResponse.json({error:'找不到可連結的 canonical work_id',code:'WORK_NOT_FOUND'},{status:404});
    return NextResponse.json({row:rows[0]},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error){
    console.error('Neon scope affiliation write failed',error);
    return NextResponse.json({error:'Scope 連結寫入失敗',code:'NEON_WRITE_FAILED'},{status:502});
  }
}
