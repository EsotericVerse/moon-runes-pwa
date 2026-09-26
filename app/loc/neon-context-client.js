import {ScopeContextResponseSchema} from './scope-feature-contracts';
import {callNeonRpc,selectNeonRows} from './neon-repository';
import {rune as canonicalRuneArray} from '../../js/runes.js';

const CONTEXT_TABLES=Object.freeze({
  loc:'api.loc_context_entries',
  lunarunes:'api.runes_context_entries',
  lo3rwang:'api.lo3rwang_context_entries'
});

const CONTEXT_COLUMNS_BY_SCOPE=Object.freeze({
  loc:'scope_id,context_key,context_type,title,summary,kind,node_type,entry_scope,description,context_date,date_status,anchor_id,before_id,after_id,order_no,rune_count,rune_number,literature_id,work_id,status,milestone,style_prompt,ranking_types,era_id,period,entry_name,start_date,end_date,start_anchor_id,end_anchor_id,date_value,visibility,event_id,year_value,updated_at',
  lunarunes:'context_key,context_type,title,summary,kind,node_type,entry_scope,description,context_date,date_status,anchor_id,before_id,after_id,order_no,rune_count,rune_number,literature_id,work_id,status,milestone,style_prompt,ranking_types,updated_at',
  lo3rwang:'context_key,context_type,title,summary,period,entry_name,start_date,end_date,order_no,status,anchor_id,start_anchor_id,end_anchor_id,date_value,date_status,entry_scope,visibility,event_id,year_value,updated_at'
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
    const date=String(row?.date_value||row?.start_date||'').trim();
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
    if(!['period','event','period_style'].includes(authorRowType(row)))continue;
    const sourceId=authorRowId(row);
    if(!sourceId)continue;
    nodeRows.set(sourceId,row);
    for(const [field,label,suffix] of [['start_anchor_id','開始於','starts-at'],['end_anchor_id','結束於','ends-at']]){
      const anchor=anchors.get(String(row?.[field]||''));
      const targetId=anchor?authorRowId(anchor):'';
      if(!targetId)continue;
      nodeRows.set(targetId,anchor);
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
      const groups=[...new Set(styles.filter(row=>Number(row.style_no)===styleNo&&row.node_type==='keyword')
        .map(row=>String(row.keyword_group||'')).filter(Boolean))];
      for(const group of groups){
        const groupId=styleId+':'+group;
        customNodes.push({node_id:groupId,label:group,node_type:'keyword_group',scope_id:'lo3rwang',
          description:'關鍵詞群組：'+group});
        edges.push({edge_id:groupId+':parent',source_node_id:styleId,target_node_id:groupId,
          relation_type:'keyword_group',relation_label:'展開',description:group});
        for(const word of styles.filter(row=>Number(row.style_no)===styleNo&&row.node_type==='keyword'&&row.keyword_group===group)){
          const keyword=String(word.keyword||'').trim();if(!keyword)continue;
          const keywordId=groupId+':'+encodeURIComponent(keyword);
          customNodes.push({node_id:keywordId,label:keyword,node_type:'keyword',scope_id:'lo3rwang',
            description:group+'｜'+name});
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

function normalizeRuneGraph(rows){
  const nodes=[];const edges=[];
  for(const row of rows||[]){
    const kind=row.kind||row.context_type;
    if(kind==='node')nodes.push({
      node_id:String(row.context_key||''),
      label:row.title||row.context_key,
      node_type:row.node_type||'context',
      scope_id:row.scope_id||row.entry_scope||'lunarunes',
      description:row.description||row.summary||''
    });
    if(kind==='edge')edges.push({
      edge_id:String(row.context_key||''),
      source_node_id:String(row.before_id||''),
      target_node_id:String(row.after_id||''),
      relation_type:row.node_type||'related',
      relation_label:row.title||'',
      description:row.summary||'',
      evidence:row.description||''
    });
  }
  return {nodes,edges};
}

function normalizeGraph(rows,scopeId,styleRows=[]){
  if(scopeId==='lo3rwang')return normalizeAuthorGraph(rows,styleRows);
  if(scopeId==='loc'){
    const author=normalizeAuthorGraph((rows||[]).filter(row=>row.scope_id==='lo3rwang'),styleRows);
    const runes=normalizeRuneGraph((rows||[]).filter(row=>row.scope_id==='lunarunes'));
    return {nodes:[...author.nodes,...runes.nodes],edges:[...author.edges,...runes.edges]};
  }
  return normalizeRuneGraph(rows);
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

async function readAuthorStyles(){
  const [styleResult,keywordResult]=await Promise.all([
    selectNeonRows('silver.lo3rwang_style',{
      columns:'style_no,node_type,representative_name,basic_principle,order_no',
      filters:[{column:'node_type',operator:'eq',value:'style'}],
      orders:[{column:'style_no',ascending:true}],limit:5000
    }),
    selectNeonRows('silver.lo3rwang_style_keywords',{
      columns:'style_no,keyword_group,keyword,order_no',
      orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}],limit:5000
    })
  ]);
  const names=new Map(styleResult.rows.map(row=>[Number(row.style_no),row.representative_name||null]));
  return [
    ...styleResult.rows,
    ...keywordResult.rows.map(row=>({...row,node_type:'keyword',representative_name:names.get(Number(row.style_no))||null,basic_principle:null}))
  ];
}

export async function selectScopeContextData(scopeId){
  const id=String(scopeId||'');
  const rows=await readScopeRows(id);
  const styleRows=id==='lo3rwang'||id==='loc'?await readAuthorStyles():[];
  const graph=normalizeGraph(rows,id,styleRows);
  return ScopeContextResponseSchema.parse({rows,...graph,trends:[]});
}

export async function selectScopeContextRows(scopeId){
  return (await selectScopeContextData(scopeId)).rows;
}

export async function selectRuneContextCatalog(){
  const runeRows=canonicalRuneArray.filter(Boolean)
    .filter(row=>Number(row?.編號)>=0&&Number(row?.編號)<=66)
    .map(row=>({
      rune_number:Number(row.編號),
      rune_name:row.符文名稱,
      group_name:row.所屬分組,
      english_name:row.英文,
      rune_description:row.符文說明
    }));
  const {rows:contextRows}=await selectNeonRows('silver.lrunes_style_context',{
    columns:'context_id,context_type,rune_number,keyword_group,keyword,relation_type,rule_text,order_no,active',
    filters:[{column:'active',operator:'eq',value:true}],
    orders:[{column:'rune_number',ascending:true},{column:'order_no',ascending:true}],limit:5000
  });
  const contextByRune=new Map();
  for(const row of contextRows){
    const number=Number(row.rune_number);
    if(!Number.isInteger(number))continue;
    if(!contextByRune.has(number))contextByRune.set(number,{positive:[],negative:[],and:[],nor:[]});
    const bucket=contextByRune.get(number);
    if(row.context_type==='keyword'&&row.keyword_group==='positive'&&row.keyword)bucket.positive.push(row.keyword);
    if(row.context_type==='keyword'&&row.keyword_group==='negative'&&row.keyword)bucket.negative.push(row.keyword);
    if(row.context_type==='rule'&&row.relation_type==='AND'&&row.keyword)bucket.and.push('AND'+row.keyword);
    if(row.context_type==='rule'&&row.relation_type==='NOR'&&row.keyword)bucket.nor.push('NOR'+row.keyword);
  }
  return {runes:runeRows.map(row=>{
    const context=contextByRune.get(Number(row.rune_number))||{positive:[],negative:[],and:[],nor:[]};
    return {
      ...row,
      positive_keywords:[...context.positive,...context.and].join('、'),
      negative_keywords:[...context.negative,...context.nor].join('、')
    };
  })};
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
