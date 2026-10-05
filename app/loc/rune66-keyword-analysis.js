'use client';

import {selectAllRows} from './db-query.mjs';
import {selectManagedScope} from './scope-data';
import {classifyRune66Documents} from './model/rune66-keyword-engine.mjs';

const PERSONAL_KEYWORD_TABLE='silver.lo3rwang_keywords';
const RUNE_TABLE='silver.runes';

const analysisPromises=new Map();

function buildDocuments(textRows=[]){
  return textRows.filter(row=>String(row?.uid||'').trim()).map(row=>({
    key:'galaxy:'+row.uid,uid:String(row.uid).trim(),kind:'galaxy',
    title:String(row.title||'').trim(),content:String(row.content||''),
    date:String(row.createtime||'').slice(0,10)
  }));
}

async function loadRune66Catalog(){
  const [catalogResult,structureResult]=await Promise.all([
    selectAllRows(PERSONAL_KEYWORD_TABLE,{
      columns:'keyword_id,group_name,item_no,item_name,principle,keywords,order_no',
      filters:[{column:'group_name',operator:'eq',value:'符文66'}],
      orders:[{column:'order_no',ascending:true},{column:'item_no',ascending:true}]
    }),
    selectAllRows(RUNE_TABLE,{
      columns:'rune_id,rune_name,group_name',
      filters:[
        {column:'rune_id',operator:'gte',value:1},
        {column:'rune_id',operator:'lte',value:66}
      ],
      orders:[{column:'rune_id',ascending:true}]
    })
  ]);
  return {catalogRows:catalogResult.rows||[],structureRows:structureResult.rows||[]};
}

async function loadAuthorDocuments({startDate='',endDate=''}={}){
  const scope=await selectManagedScope('lo3rwang');
  if(!scope)throw new Error('找不到 lo3rwang Scope');
  const textResult=await selectAllRows(scope.galaxy,{
      columns:'uid,title,content,createtime,searchable,statistics_able',
      filters:[
        {column:'searchable',operator:'eq',value:true},
        {column:'statistics_able',operator:'eq',value:true},
        ...(startDate?[{column:'createtime',operator:'gte',value:startDate+'T00:00:00+08:00'}]:[]),
        ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999+08:00'}]:[])
      ],
      orders:[{column:'createtime',ascending:true},{column:'uid',ascending:true}]
    });
  return buildDocuments(textResult.rows||[]);
}

export async function selectRune66Classification({startDate='',endDate=''}={}){
  const key=[String(startDate||''),String(endDate||'')].join('|');
  if(analysisPromises.has(key))return analysisPromises.get(key);
  const promise=(async()=>{
    const [{catalogRows,structureRows},documents]=await Promise.all([
      loadRune66Catalog(),
      loadAuthorDocuments({startDate,endDate})
    ]);
    return classifyRune66Documents(documents,catalogRows,structureRows);
  })().catch(error=>{
    analysisPromises.delete(key);
    throw error;
  });
  analysisPromises.set(key,promise);
  return promise;
}

export function clearRune66ClassificationCache(){
  analysisPromises.clear();
}
