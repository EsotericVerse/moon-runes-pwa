import {NextResponse} from 'next/server';
import {neonServerRequest} from '../../loc/neon-server';

export const dynamic='force-dynamic';
export const revalidate=0;

export async function GET(request){
  const scopeId=new URL(request.url).searchParams.get('scopeId')||'';
  if(!['loc','runes','lo3rwang'].includes(scopeId))return NextResponse.json({error:'Scope 無效',code:'INVALID_SCOPE'},{status:400});
  try{
    const {db}=neonServerRequest(request);
    let rows=[];
    if(scopeId==='runes'){
      rows=await db`
        select context_key,context_type,title,summary,payload
          from silver.runes_context_entries
        union all
        select 'rune:'||rune_number::text,'符文',rune_name,null,
               canonical_payload
          from silver.lrunes_runes
        union all
        select 'evolution:'||history_id,history_kind,title,null,body
          from silver.lrunes_evolution_history
         order by context_key
      `;
    }else if(scopeId==='lo3rwang'){
      rows=await db`
        select context_key,context_type,title,summary,payload
          from silver.lo3rwang_context_entries
        union all
        select context_key,context_type,title,summary,payload
          from silver.lo3rwang_period_context_entries
        union all
        select work_id,'作品',title,null,
               jsonb_build_object('period',period_code,'era',era_code,'era_name',era_name)
          from silver.lo3rwang_works
        union all
        select song_id,'音樂作品',title,style_prompt,
               jsonb_build_object('work_id',work_id,'playlist',playlist)
          from silver.song_versions
         order by context_key
      `;
    }else{
      rows=await db`
        select context_key,context_type,title,summary,payload
          from silver.lo3rwang_context_entries
        union all
        select context_key,context_type,title,summary,payload
          from silver.lo3rwang_period_context_entries
        union all
        select context_key,context_type,title,summary,payload
          from silver.runes_context_entries
        union all
        select 'rune:'||rune_number::text,'符文',rune_name,null,
               canonical_payload
          from silver.lrunes_runes
        union all
        select 'evolution:'||history_id,history_kind,title,null,body
          from silver.lrunes_evolution_history
         order by context_key
      `;
    }
    return NextResponse.json({rows},{headers:{'Cache-Control':'no-store, max-age=0'}});
  }catch(error){
    console.error('Neon context read failed',error);
    return NextResponse.json({error:'脈絡資料讀取失敗',code:'NEON_READ_FAILED'},{status:502});
  }
}
