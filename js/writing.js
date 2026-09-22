import {neon} from '@neondatabase/serverless';

const WORK_COLUMNS=`
  w.work_id,w.scope,w.work_type,w.title,w.created_date,w.period_code,w.era_code,w.era_name,
  w.content_origin,w.source_status,w.source_ref,
  s.ai_summary,s.theme_tags,s.emotion_tags,s.imagery_tags,s.context_tags,s.genre_tags,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'title',v.title,
        'url',v.suno_url,
        'source_type','song',
        'role',v.version_label
      ) order by v.is_representative desc nulls last,v.version_label,v.song_id
    )
    from silver.song_versions v
    where v.work_id=w.work_id and v.suno_url is not null
  ),'[]'::jsonb) as source_refs
`;

function database(){
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error('DATABASE_URL 未設定，無法讀取 Neon 文字作品。');
  return neon(url);
}

function normalize(row){
  const tagArrays=[
    row.theme_tags,row.emotion_tags,row.imagery_tags,row.context_tags,row.genre_tags
  ].filter(Array.isArray);
  return {
    work_id:row.work_id,
    scope:row.scope,
    content_type:row.work_type,
    work_type:row.work_type,
    title:row.title,
    created_date:row.created_date,
    period:row.period_code||row.era_code||'',
    period_name:row.era_name||row.period_code||'',
    era_id:row.era_code||'',
    summary:row.ai_summary||'',
    tags:[...new Set(tagArrays.flat().map(value=>String(value||'').trim()).filter(Boolean))],
    source_refs:Array.isArray(row.source_refs)?row.source_refs:[],
    source_ref:row.source_ref||'',
    content_origin:row.content_origin||'',
    source_status:row.source_status||''
  };
}

export async function selectWritingWorks(){
  const rows=await database()`select ${WORK_COLUMNS}
    from silver.works w
    left join silver.work_semantics s on s.work_id=w.work_id
    where w.scope='lo3rwang'
    order by w.created_date desc nulls last,w.work_id`;
  return rows.map(normalize);
}

export async function selectWritingWork(workId){
  const id=String(workId||'').trim();
  if(!id)return null;
  const rows=await database()`select ${WORK_COLUMNS}
    from silver.works w
    left join silver.work_semantics s on s.work_id=w.work_id
    where w.scope='lo3rwang' and w.work_id=${id}
    limit 1`;
  return rows[0]?normalize(rows[0]):null;
}

export function publicSourceRefs(work){
  return (work?.source_refs||[]).filter(ref=>typeof ref?.url==='string'&&/^https?:\\/\\//i.test(ref.url));
}
