import {ScopeContextResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const CONTEXT_TABLES=Object.freeze({
  loc:'api.loc_context_entries',
  runes:'api.runes_context_entries',
  lo3rwang:'api.lo3rwang_context_entries'
});

const CONTEXT_COLUMNS_BY_SCOPE=Object.freeze({
  loc:'scope_id,context_key,context_type,title,summary,kind,node_type,entry_scope,description,context_date,date_status,anchor_id,before_id,after_id,order_no,rune_count,rune_number,literature_id,work_id,status,milestone,style_prompt,ranking_types,era_id,period,entry_name,start_date,end_date,start_anchor_id,end_anchor_id,date_value,visibility,event_id,year_value,updated_at',
  runes:'context_key,context_type,title,summary,kind,node_type,entry_scope,description,context_date,date_status,anchor_id,before_id,after_id,order_no,rune_count,rune_number,literature_id,work_id,status,milestone,style_prompt,ranking_types,updated_at',
  lo3rwang:'context_key,context_type,title,summary,era_id,period,entry_name,start_date,end_date,order_no,status,anchor_id,start_anchor_id,end_anchor_id,date_value,date_status,entry_scope,visibility,event_id,year_value,updated_at'
});

function normalizeGraph(rows){
  const nodes=[];const edges=[];
  for(const row of rows||[]){
    const kind=row.kind||row.context_type;
    if(kind==='node')nodes.push({
      node_id:String(row.context_key||''),
      label:row.title||row.context_key,
      node_type:row.node_type||'context',
      scope_id:row.scope_id||row.entry_scope||'',
      description:row.description||row.summary||''
    });
    if(kind==='edge')edges.push({
      edge_id:String(row.context_key||''),
      source_node_id:String(row.before_id||''),
      target_node_id:String(row.after_id||''),
      relation_type:'related',
      relation_label:row.title||'',
      description:row.summary||'',
      evidence:row.description||''
    });
  }
  return {nodes,edges};
}

async function readScopeRows(scopeId){
  const table=CONTEXT_TABLES[scopeId];
  const columns=CONTEXT_COLUMNS_BY_SCOPE[scopeId];
  if(!table||!columns)throw new Error('Scope 無效');
  const {rows}=await selectNeonRows(table,{
    columns,
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
