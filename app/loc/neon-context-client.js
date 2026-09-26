import {ScopeContextResponseSchema} from './scope-feature-contracts';
import {deleteNeonRows,insertNeonRows,selectNeonRows} from './neon-repository';

const TIME_COLUMNS='entry_key,entry_type,title,summary,start_date,end_date,era_id,period,entry_name,order_no,status,anchor_id,start_anchor_id,end_anchor_id,before_id,after_id,date_status,visibility,event_id,year_value,rune_count,source_id,source,note';

function temporalNodeDescription(row){
  const summary=String(row?.summary||'').trim();
  if(summary)return summary;
  const start=String(row?.start_date||'').slice(0,10);
  const end=String(row?.end_date||'').slice(0,10);
  return start?(end?start+' 至 '+end:start+' 起'):'';
}

function normalizeAuthorGraph(rows,styleRows=[]){
  const entries=Array.isArray(rows)?rows:[];
  const anchors=new Map(entries.filter(row=>row.entry_type==='anchor'&&row?.anchor_id)
    .map(row=>[String(row.anchor_id),row]));
  const nodeRows=new Map();
  const edges=[];
  for(const row of entries){
    if(!['period','event','period_style'].includes(String(row.entry_type||'')))continue;
    const sourceId=String(row.entry_key||'');
    if(!sourceId)continue;
    nodeRows.set(sourceId,row);
    for(const [field,label,suffix] of [['start_anchor_id','開始於','starts-at'],['end_anchor_id','結束於','ends-at']]){
      const anchor=anchors.get(String(row?.[field]||''));
      const targetId=String(anchor?.entry_key||'');
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
    nodeRows.set(rootId,{__normalized:{node_id:rootId,label:'個人自訂符文',node_type:'style_root',scope_id:'lo3rwang',description:'作者自行定義的代表名稱、基本原則與關鍵詞。'}});
    for(const styleNo of styleNos){
      const parent=styles.find(row=>Number(row.style_no)===styleNo&&row.node_type==='style');
      if(!parent)continue;
      const styleId='lo3rwang:style:'+styleNo;
      const name=String(parent.representative_name||'').trim()||('第 '+styleNo+' 種風格');
      nodeRows.set(styleId,{__normalized:{node_id:styleId,label:name,node_type:'style',scope_id:'lo3rwang',description:String(parent.basic_principle||'').trim()||('風格編號 '+styleNo)}});
      edges.push({edge_id:styleId+':root',source_node_id:rootId,target_node_id:styleId,relation_type:'custom_rune',relation_label:'代表風格',description:name});
      const groups=[...new Set(styles.filter(row=>Number(row.style_no)===styleNo&&row.node_type==='keyword').map(row=>String(row.keyword_group||'')).filter(Boolean))];
      for(const group of groups){
        const groupId=styleId+':'+group;
        nodeRows.set(groupId,{__normalized:{node_id:groupId,label:group,node_type:'keyword_group',scope_id:'lo3rwang',description:'關鍵詞群組：'+group}});
        edges.push({edge_id:groupId+':parent',source_node_id:styleId,target_node_id:groupId,relation_type:'keyword_group',relation_label:'展開',description:group});
        for(const word of styles.filter(row=>Number(row.style_no)===styleNo&&row.node_type==='keyword'&&row.keyword_group===group)){
          const keyword=String(word.keyword||'').trim();if(!keyword)continue;
          const keywordId=groupId+':'+encodeURIComponent(keyword);
          nodeRows.set(keywordId,{__normalized:{node_id:keywordId,label:keyword,node_type:'keyword',scope_id:'lo3rwang',description:group+'｜'+name}});
          edges.push({edge_id:keywordId+':parent',source_node_id:groupId,target_node_id:keywordId,relation_type:'keyword',relation_label:'意涵',description:keyword});
        }
      }
    }
  }
  const nodes=[...nodeRows.entries()].map(([id,row])=>row.__normalized||({
    node_id:id,label:String(row.title||row.entry_name||id),node_type:String(row.entry_type||'context'),
    scope_id:'lo3rwang',description:temporalNodeDescription(row)
  }));
  return {nodes,edges};
}

function normalizeRuneGraph(runes,contextRows){
  const nodes=(runes||[]).map(row=>({
    node_id:'rune:'+row.rune_number,
    label:row.rune_name||String(row.rune_number),
    node_type:'rune',
    scope_id:'lunarunes',
    description:row.rune_description||''
  }));
  const edges=[];
  for(const row of contextRows||[]){
    const runeId='rune:'+row.rune_number;
    if(row.related_rune_number!==null&&row.related_rune_number!==undefined){
      edges.push({
        edge_id:String(row.context_id),
        source_node_id:runeId,
        target_node_id:'rune:'+row.related_rune_number,
        relation_type:row.relation_type||row.context_type||'related',
        relation_label:row.title||row.relation_type||'關聯',
        description:row.note||row.rule_text||''
      });
      continue;
    }
    const keyword=String(row.keyword||'').trim();
    if(!keyword)continue;
    const nodeId=runeId+':'+String(row.context_type||'keyword')+':'+encodeURIComponent(keyword);
    nodes.push({node_id:nodeId,label:keyword,node_type:row.context_type||'keyword',scope_id:'lunarunes',description:row.rule_text||row.note||row.keyword_group||''});
    edges.push({edge_id:String(row.context_id)+':rune',source_node_id:runeId,target_node_id:nodeId,relation_type:row.relation_type||row.context_type||'keyword',relation_label:row.keyword_group||row.relation_type||'關鍵詞',description:row.rule_text||''});
  }
  return {nodes,edges};
}

async function readAuthorRows(){
  const {rows}=await selectNeonRows('silver.lo3rwang_style_time',{
    columns:TIME_COLUMNS,orders:[{column:'order_no',ascending:true},{column:'entry_key',ascending:true}],limit:5000
  });
  return rows;
}
async function readRuneRows(){
  const [runes,context]=await Promise.all([
    selectNeonRows('silver.lrunes',{columns:'rune_number,rune_name,group_name,english_name,rune_description',orders:[{column:'rune_number',ascending:true}],limit:100}),
    selectNeonRows('silver.lrunes_style_context',{columns:'context_id,context_type,rune_number,related_rune_number,keyword_group,keyword,relation_type,title,rule_text,note,order_no,active',filters:[{column:'active',operator:'eq',value:true}],orders:[{column:'rune_number',ascending:true},{column:'order_no',ascending:true}],limit:5000})
  ]);
  return {runes:runes.rows,context:context.rows};
}
async function readAuthorStyles(){
  const [styleResult,keywordResult]=await Promise.all([
    selectNeonRows('silver.lo3rwang_style',{columns:'style_no,node_type,representative_name,basic_principle,order_no',filters:[{column:'node_type',operator:'eq',value:'style'}],orders:[{column:'style_no',ascending:true}],limit:5000}),
    selectNeonRows('silver.lo3rwang_style_keywords',{columns:'style_no,keyword_group,keyword,order_no',orders:[{column:'style_no',ascending:true},{column:'order_no',ascending:true}],limit:5000})
  ]);
  const names=new Map(styleResult.rows.map(row=>[Number(row.style_no),row.representative_name||null]));
  return [...styleResult.rows,...keywordResult.rows.map(row=>({...row,node_type:'keyword',representative_name:names.get(Number(row.style_no))||null,basic_principle:null}))];
}

export async function selectScopeContextData(scopeId){
  const id=String(scopeId||'');
  if(!['loc','lunarunes','lo3rwang'].includes(id))throw new Error('Scope 無效');
  const needAuthor=id==='loc'||id==='lo3rwang';
  const needRunes=id==='loc'||id==='lunarunes';
  const [authorRows,styleRows,runeData]=await Promise.all([
    needAuthor?readAuthorRows():Promise.resolve([]),
    needAuthor?readAuthorStyles():Promise.resolve([]),
    needRunes?readRuneRows():Promise.resolve({runes:[],context:[]})
  ]);
  const author=needAuthor?normalizeAuthorGraph(authorRows,styleRows):{nodes:[],edges:[]};
  const runes=needRunes?normalizeRuneGraph(runeData.runes,runeData.context):{nodes:[],edges:[]};
  const rows=id==='lo3rwang'?authorRows:(id==='lunarunes'?runeData.context:[...authorRows,...runeData.context]);
  return ScopeContextResponseSchema.parse({rows,nodes:[...author.nodes,...runes.nodes],edges:[...author.edges,...runes.edges],trends:[]});
}

export async function selectScopeContextRows(scopeId){
  return (await selectScopeContextData(scopeId)).rows;
}

export async function selectRuneContextCatalog(){
  const {runes,context:contextRows}=await readRuneRows();
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
  return {runes:runes.map(row=>{
    const context=contextByRune.get(Number(row.rune_number))||{positive:[],negative:[],and:[],nor:[]};
    return {...row,positive_keywords:[...context.positive,...context.and].join('、'),negative_keywords:[...context.negative,...context.nor].join('、')};
  })};
}

function splitKeywords(value){
  return String(value||'').split(/[、,，\n]+/).map(item=>item.trim()).filter(Boolean);
}
export async function updateRuneKeywords({runeNumber,positiveKeywords,negativeKeywords}){
  const number=Number(runeNumber);
  if(!Number.isInteger(number)||number<0||number>66)throw new TypeError('符文編號無效');
  for(const group of ['positive','negative']){
    await deleteNeonRows('silver.lrunes_style_context',{filters:[
      {column:'rune_number',operator:'eq',value:number},
      {column:'context_type',operator:'eq',value:'keyword'},
      {column:'keyword_group',operator:'eq',value:group}
    ],returning:null});
  }
  const rows=[];
  for(const [group,value] of [['positive',positiveKeywords],['negative',negativeKeywords]]){
    splitKeywords(value).forEach((keyword,index)=>rows.push({
      context_id:'rune:'+number+':keyword:'+group+':'+(index+1),
      context_type:'keyword',rune_number:number,keyword_group:group,keyword,
      order_no:index+1,active:true,updated_at:new Date().toISOString()
    }));
  }
  if(rows.length)await insertNeonRows('silver.lrunes_style_context',rows,{returning:'context_id'});
  return {rune_number:number};
}
