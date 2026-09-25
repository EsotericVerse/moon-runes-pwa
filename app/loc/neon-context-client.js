import {ScopeContextResponseSchema} from './scope-feature-contracts';
import {selectNeonRows} from './neon-repository';

const CONTEXT_TABLES=Object.freeze({
  loc:'api.loc_context_entries',
  runes:'api.runes_context_entries',
  lo3rwang:'api.loc_timeline_entries'
});

const CONTEXT_COLUMNS_BY_SCOPE=Object.freeze({
  loc:'scope_id,context_key,context_type,title,summary,kind,node_type,entry_scope,description,context_date,date_status,anchor_id,before_id,after_id,order_no,rune_count,rune_number,literature_id,work_id,status,milestone,style_prompt,ranking_types,era_id,period,entry_name,start_date,end_date,start_anchor_id,end_anchor_id,date_value,visibility,event_id,year_value,updated_at',
  runes:'context_key,context_type,title,summary,kind,node_type,entry_scope,description,context_date,date_status,anchor_id,before_id,after_id,order_no,rune_count,rune_number,literature_id,work_id,status,milestone,style_prompt,ranking_types,updated_at',
  lo3rwang:'scope_id,entry_key,entry_type,title,summary,period,entry_name,start_date,end_date,order_no,status,anchor_id,start_anchor_id,end_anchor_id,date_value,year_value'
});

function authorRowType(row){
  return String(row?.context_type||row?.entry_type||'');
}

function authorRowId(row){
  return String(row?.context_key||row?.entry_key||'');
}

function temporalNodeDescription(row){
  const summary=String(row?.summary||'').trim();
  if(summary)return summary;
  if(authorRowType(row)==='anchor'){
    const date=String(row?.date_value||'').trim();
    if(date)return '定錨日期：'+date;
    if(row?.year_value)return '定錨年份：'+String(row.year_value);
  }
  const start=String(row?.start_date||'').slice(0,10);
  const end=String(row?.end_date||'').slice(0,10);
  if(start)return end?start+' 至 '+end:start+' 起';
  return '';
}

function normalizeAuthorGraph(rows){
  const entries=Array.isArray(rows)?rows:[];
  const anchors=new Map(entries
    .filter(row=>authorRowType(row)==='anchor'&&row?.anchor_id)
    .map(row=>[String(row.anchor_id),row]));
  const nodeRows=new Map();
  const edges=[];

  for(const row of entries){
    if(!['period','event','style'].includes(authorRowType(row)))continue;
    const sourceId=authorRowId(row);
    if(!sourceId)continue;
    const relations=[
      ['start_anchor_id','開始於','starts-at'],
      ['end_anchor_id','結束於','ends-at']
    ];
    for(const [field,label,suffix] of relations){
      const anchor=anchors.get(String(row?.[field]||''));
      if(!anchor)continue;
      const targetId=authorRowId(anchor);
      if(!targetId)continue;
      nodeRows.set(sourceId,row);
      nodeRows.set(targetId,anchor);
      edges.push({
        edge_id:sourceId+':'+suffix,
        source_node_id:sourceId,
        target_node_id:targetId,
        relation_type:'temporal_anchor',
        relation_label:label,
        description:String(row.title||sourceId)+' '+label+' '+String(anchor.title||targetId)
      });
    }
  }

  const nodes=[...nodeRows.entries()].map(([id,row])=>({
    node_id:id,
    label:String(row.title||row.entry_name||id),
    node_type:authorRowType(row)||'context',
    scope_id:'lo3rwang',
    description:temporalNodeDescription(row)
  }));
  return {nodes,edges};
}

function normalizeGraph(rows,scopeId){
  if(scopeId==='lo3rwang')return normalizeAuthorGraph(rows);
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
  const filters=scopeId==='lo3rwang'?[
    {column:'scope_id',operator:'eq',value:'lo3rwang'},
    {column:'entry_type',operator:'in',value:['anchor','event','period','style']}
  ]:undefined;
  const {rows}=await selectNeonRows(table,{
    columns,
    ...(filters?{filters}:{}),
    orders:[{column:scopeId==='lo3rwang'?'entry_key':'context_key',ascending:true}],
    limit:5000
  });
  return rows;
}

export async function selectScopeContextData(scopeId){
  const rows=await readScopeRows(String(scopeId||''));
  const graph=normalizeGraph(rows,String(scopeId||''));
  return ScopeContextResponseSchema.parse({rows,...graph,trends:[]});
}

export async function selectScopeContextRows(scopeId){
  return (await selectScopeContextData(scopeId)).rows;
}
