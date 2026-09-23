import {ScopeContextResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const CONTEXT_TABLES=Object.freeze({
  loc:'api.loc_context_entries',
  runes:'silver.runes_context_entries',
  author:'silver.lo3rwang_context_entries',
  authorPeriods:'silver.lo3rwang_period_context_entries',
  works:'silver.works',
  songs:'silver.song_versions',
  runeMaster:'silver.lrunes_runes'
});

function normalizeGraph(rows){
  const nodes=[];const edges=[];
  for(const row of rows||[]){
    const payload=row?.payload&&typeof row.payload==='object'?row.payload:{};
    const kind=payload.kind||row.context_type;
    if(kind==='node')nodes.push({node_id:String(payload.id||row.context_key),label:payload.title||row.title||row.context_key,node_type:payload.node_type||'context',description:payload.description||row.summary||''});
    if(kind==='edge')edges.push({edge_id:String(payload.id||row.context_key),source_node_id:String(payload.source_id||''),target_node_id:String(payload.target_id||''),relation_type:String(payload.relation_type||'related'),relation_label:payload.title||row.title||'',description:row.summary||'',evidence:payload.evidence||''});
  }
  return {nodes,edges};
}

function sortRows(rows){
  return [...(rows||[])].sort((a,b)=>String(a.context_key||'').localeCompare(String(b.context_key||'')));
}

async function readScopeRows(scopeId){
  if(scopeId==='loc'){
    const {rows}=await selectNeonRows(CONTEXT_TABLES.loc,{columns:'context_key,context_type,title,summary,payload,updated_at',orders:[{column:'context_key',ascending:true}],limit:5000});
    return rows;
  }
  if(scopeId==='runes'){
    const [context,runes]=await Promise.all([
      selectNeonRows(CONTEXT_TABLES.runes,{columns:'context_key,context_type,title,summary,payload,updated_at',limit:5000}),
      selectNeonRows(CONTEXT_TABLES.runeMaster,{columns:'rune_number,rune_name,canonical_payload',orders:[{column:'rune_number',ascending:true}],limit:100})
    ]);
    return sortRows([
      ...context,
      ...runes.map(row=>({context_key:`rune:${row.rune_number}`,context_type:'符文',title:row.rune_name,summary:'',payload:row.canonical_payload||{}}))
    ]);
  }
  if(scopeId==='lo3rwang'){
    const [context,periods,works,songs]=await Promise.all([
      selectNeonRows(CONTEXT_TABLES.author,{columns:'context_key,context_type,title,summary,payload,updated_at',limit:5000}),
      selectNeonRows(CONTEXT_TABLES.authorPeriods,{columns:'context_key,context_type,title,summary,payload,updated_at',limit:5000}),
      selectNeonRows(CONTEXT_TABLES.works,{columns:'work_id,work_type,title,period_code,era_code,era_name,content_origin',filters:[{column:'scope',operator:'eq',value:'lo3rwang'}],limit:5000}),
      selectNeonRows(CONTEXT_TABLES.songs,{columns:'song_id,work_id,title,style_prompt,playlist',limit:5000})
    ]);
    return sortRows([
      ...context,
      ...periods,
      ...works.map(row=>({context_key:row.work_id,context_type:'作品',title:row.title,summary:row.content_origin||'',payload:{period:row.period_code,era:row.era_code,era_name:row.era_name}})),
      ...songs.map(row=>({context_key:row.song_id,context_type:'音樂作品',title:row.title,summary:row.style_prompt||row.playlist||'',payload:{work_id:row.work_id}}))
    ]);
  }
  throw new Error('Scope 無效');
}

export async function selectScopeContextData(scopeId){
  const rows=await readScopeRows(String(scopeId||''));
  const graph=normalizeGraph(rows);
  return ScopeContextResponseSchema.parse({rows,...graph,trends:[]});
}

export async function selectScopeContextRows(scopeId){
  return (await selectScopeContextData(scopeId)).rows;
}
