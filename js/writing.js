import {createClient} from '@neondatabase/neon-js';

const DEFAULT_NEON_DATA_API_URL='https://ep-rapid-queen-b3oyboy6.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';

function dataApiUrl(){
  const configured=String(process.env.NEXT_PUBLIC_NEON_DATA_API_URL||process.env.NEXT_PUBLIC_NEON_DATABASE_URL||DEFAULT_NEON_DATA_API_URL).trim().replace(/\/+$/,'');
  return configured.endsWith('/rest/v1')?configured:`${configured}/rest/v1`;
}

const publicNeon=createClient({
  dataApi:{
    url:dataApiUrl(),
    options:{db:{schema:'api'}}
  }
});

function relation(table){
  const [schema,name]=String(table).split('.');
  return publicNeon.schema(schema).from(name);
}

async function selectRows(table,{columns='*',filters=[],orders=[],limit=5000}={}){
  let query=relation(table).select(columns);
  for(const filter of filters)query=query[filter.operator||'eq'](filter.column,filter.value);
  for(const order of orders)query=query.order(order.column,{ascending:order.ascending??true,nullsFirst:order.nullsFirst});
  query=query.limit(limit);
  const result=await query;
  if(result.error)throw new Error(result.error.message||`Neon read failed: ${table}`);
  return Array.isArray(result.data)?result.data:[];
}

function normalize(row,songsByWork){
  const tagArrays=[row.theme_tags,row.emotion_tags,row.imagery_tags,row.context_tags,row.genre_tags].filter(Array.isArray);
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
    source_refs:songsByWork.get(row.work_id)||[],
    source_ref:row.source_ref||'',
    content_origin:row.content_origin||'',
    source_status:row.source_status||''
  };
}

export async function selectWritingWorks(){
  const [works,semantics,songs]=await Promise.all([
    selectRows('silver.works',{
      columns:'work_id,scope,work_type,title,created_date,period_code,era_code,era_name,content_origin,source_status,source_ref',
      filters:[{column:'scope',operator:'eq',value:'lo3rwang'}],
      orders:[{column:'created_date',ascending:false,nullsFirst:false},{column:'work_id',ascending:true}]
    }),
    selectRows('silver.work_semantics',{
      columns:'work_id,ai_summary,theme_tags,emotion_tags,imagery_tags,context_tags,genre_tags'
    }),
    selectRows('silver.song_versions',{
      columns:'work_id,title,suno_url,version_label,is_representative,song_id'
    })
  ]);
  const semanticsByWork=new Map(semantics.map(row=>[row.work_id,row]));
  const songsByWork=new Map();
  for(const song of songs){
    if(!song.suno_url)continue;
    const list=songsByWork.get(song.work_id)||[];
    list.push({title:song.title,url:song.suno_url,source_type:'song',role:song.version_label});
    songsByWork.set(song.work_id,list);
  }
  return works.map(work=>normalize({...work,...(semanticsByWork.get(work.work_id)||{})},songsByWork));
}

export async function selectWritingWork(workId){
  const id=String(workId||'').trim();
  if(!id)return null;
  const works=await selectWritingWorks();
  return works.find(work=>work.work_id===id)||null;
}

export function publicSourceRefs(work){
  return (work?.source_refs||[]).filter(ref=>typeof ref?.url==='string'&&/^https?:\/\//i.test(ref.url));
}
