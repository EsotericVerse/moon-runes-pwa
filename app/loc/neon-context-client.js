import {ScopeContextResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const CONTEXT_TABLES=Object.freeze({
  loc:'api.loc_context_entries',
  runes:'api.runes_context_entries',
  lo3rwang:'api.lo3rwang_context_entries'
});

function normalizeGraph(rows){
  const nodes=[];const edges=[];
  for(const row of rows||[]){
    const payload=row?.payload&&typeof row.payload==='object'?row.payload:{};
    const kind=payload.kind||row.context_type;
    if(kind==='node')nodes.push({
      node_id:String(payload.id||row.context_key),
      label:payload.title||row.title||row.context_key,
      node_type:payload.node_type||'context',
      scope_id:row.scope_id||payload.scope_id||'',
      description:payload.description||row.summary||''
    });
    if(kind==='edge')edges.push({
      edge_id:String(payload.id||row.context_key),
      source_node_id:String(payload.source_id||''),
      target_node_id:String(payload.target_id||''),
      relation_type:String(payload.relation_type||'related'),
      relation_label:payload.title||row.title||'',
      description:row.summary||'',
      evidence:payload.evidence||''
    });
  }
  return {nodes,edges};
}

async function readScopeRows(scopeId){
  const table=CONTEXT_TABLES[scopeId];
  if(!table)throw new Error('Scope 無效');
  const {rows}=await selectNeonRows(table,{
    columns:'context_key,context_type,title,summary,payload,updated_at',
    orders:[{column:'context_key',ascending:true}],
    limit:5000
  });
  return rows;
}

export async function selectScopeContextData(scopeId){
  const rows=await readScopeRows(String(scopeId||''));
  const graph=normalizeGraph(rows);
  return ScopeContextResponseSchema.parse({rows,...graph,trends:[]});
}

export async function selectScopeContextRows(scopeId){
  return (await selectScopeContextData(scopeId)).rows;
}
