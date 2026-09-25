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

function normalizeAuthorGraph(rows,styleRows=[]){
  const entries=Array.isArray(rows)?rows:[];
  const anchors=new Map(entries.filter(row=>authorRowType(row)==='anchor'&&row?.anchor_id)
    .map(row=>[String(row.anchor_id),row]));
  const nodeRows=new Map();
  const edges=[];
  for(const row of entries){
    if(!['period','event','style'].includes(authorRowType(row)))continue;
    const sourceId=authorRowId(row);
    if(!sourceId)continue;
    for(const [field,label,suffix] of [['start_anchor_id','開始於','starts-at'],['end_anchor_id','結束於','ends-at']]){
      const anchor=anchors.get(String(row?.[field]||''));
      const targetId=anchor?authorRowId(anchor):'';
      if(!targetId)continue;
      nodeRows.set(sourceId,row);nodeRows.set(targetId,anchor);
      edges.push({edge_id:sourceId+':'+suffix,source_node_id:sourceId,target_node_id:targetId,
        relation_type:'temporal_anchor',relation_label:label,
        description:String(row.title||sourceId)+' '+label+' '+String(anchor.title||targetId)});
    }
  }
  const styles=Array.isArray(styleRows)?styleRows:[];
  const styleNos=[...new Set(styles.map(row=>Number(row.style_no)).filter(n=>n>0))].sort((a,b)=>a-b);
  if(styleNos.length){
    const rootId='lo3rwang:custom-runes';
    const customNodes=[{node_id:rootId,label:'個人自訂符文',node_type:'style_root',scope_id:'lo3rwang',
      description:'作者自行定義的代表名稱、基本原則與關鍵詞。'}];
    for(const styleNo of styleNos){
      const parent=styles.find(row=>Number(row.style_no)===styleNo&&row.node_type==='style');
      if(!parent)continue;
      const styleId='lo3rwang:style:'+styleNo;
      const name=String(parent.representative_name||'').trim()||('第 '+styleNo+' 種風格');
      customNodes.push({node_id:styleId,label:name,node_type:'style',scope_id:'lo3rwang',
        description:String(parent.basic_principle||'').trim()||('風格編號 '+styleNo)});
      edges.push({edge_id:styleId+':root',source_node_id:rootId,target_node_id:styleId,
        relation_type:'custom_rune',relation_label:'代表風格',description:name});
      for(const [group,label] of [['macro','大風格關鍵詞'],['style','風格關鍵詞']]){
        const groupId=styleId+':'+group;
        customNodes.push({node_id:groupId,label,node_type:'keyword_group',scope_id:'lo3rwang',
          description:label+'，由作者自行維護。'});
        edges.push({edge_id:groupId+':parent',source_node_id:styleId,target_node_id:groupId,
          relation_type:'keyword_group',relation_label:'展開',description:label});
        for(const word of styles.filter(row=>Number(row.style_no)===styleNo&&row.node_type==='keyword'&&row.keyword_group===group)){
          const keyword=String(word.keyword||'').trim();if(!keyword)continue;
          const keywordId=groupId+':'+encodeURIComponent(keyword);
          customNodes.push({node_id:keywordId,label:keyword,node_type:'keyword',scope_id:'lo3rwang',
            description:label+'｜'+name});
          edges.push({edge_id:keywordId+':parent',source_node_id:groupId,target_node_id:keywordId,
            relation_type:'keyword',relation_label:'意涵',description:keyword});
        }
      }
    }
    for(const node of customNodes)nodeRows.set(node.node_id,{__normalized:node});
  }
  const nodes=[...nodeRows.entries()].map(([id,row])=>row.__normalized||({
    node_id:id,label:String(row.title||row.entry_name||id),node_type:authorRowType(row)||'context',
    scope_id:'lo3rwang',description:temporalNodeDescription(row)
  }));
  return {nodes,edges};
}

function normalizeGraph(rows,scopeId,styleRows=[]){
  if(scopeId==='lo3rwang')return normalizeAuthorGraph(rows,styleRows);
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
  const id=String(scopeId||'');
  const rows=await readScopeRows(id);
  let styleRows=[];
  if(id==='lo3rwang'){
    const result=await selectNeonRows('silver.lo3rwang_style',{
      columns:'style_no,node_type,representative_name,basic_principle,keyword_group,keyword,order_no',
      orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}],limit:5000
    });
    styleRows=result.rows;
  }
  const graph=normalizeGraph(rows,id,styleRows);
  return ScopeContextResponseSchema.parse({rows,...graph,trends:[]});
}

export async function selectScopeContextRows(scopeId){
  return (await selectScopeContextData(scopeId)).rows;
}


export async function selectRuneContextCatalog(){
  const [runeResult,styleResult]=await Promise.all([
    selectNeonRows('silver.lrunes_runes',{
      columns:'rune_number,rune_name,group_name,english_name,rune_description',
      filters:[{column:'rune_number',operator:'gte',value:0},{column:'rune_number',operator:'lte',value:66}],
      orders:[{column:'rune_number',ascending:true}],limit:67
    }),
    selectNeonRows('silver.lrunes_style',{
      columns:'rune_number,positive_keywords,negative_keywords',
      filters:[{column:'rune_number',operator:'gte',value:0},{column:'rune_number',operator:'lte',value:66}],
      orders:[{column:'rune_number',ascending:true}],limit:67
    })
  ]);
  const keywords=new Map(styleResult.rows.map(row=>[Number(row.rune_number),row]));
  return {runes:runeResult.rows.map(row=>({
    ...row,...(keywords.get(Number(row.rune_number))||{})
  }))};
}

export async function updateRuneKeywords({runeNumber,positiveKeywords,negativeKeywords}){
  const number=Number(runeNumber);
  if(!Number.isInteger(number)||number<0||number>66)throw new TypeError('符文編號無效');
  return callNeonRpc('update_lrune_keywords',{
    p_rune_number:number,
    p_positive_keywords:String(positiveKeywords||'').trim(),
    p_negative_keywords:String(negativeKeywords||'').trim()
  });
}
