'use client';

import {selectAllRows} from './db-query.mjs';
import {selectManagedScope} from './scope-data';
import {classifyRune66Documents} from './model/rune66-keyword-engine.mjs';

const PERSONAL_KEYWORD_TABLE='silver.lo3rwang_keywords';
const RUNE66_CLASS='符文66';
const DEFAULT_KEYWORD_MIN_CHARS=32;

const analysisPromises=new Map();

function normalizeKeywordMinChars(value){
  const parsed=Number(value);
  return Number.isInteger(parsed)&&parsed>=0?parsed:DEFAULT_KEYWORD_MIN_CHARS;
}

function analysisCharacterCount(value){
  return Array.from(String(value??'').replace(/\s/gu,'')).length;
}

function buildDocuments(textRows=[],minChars=DEFAULT_KEYWORD_MIN_CHARS){
  const threshold=normalizeKeywordMinChars(minChars);
  return textRows.filter(row=>String(row?.uid||'').trim()&&analysisCharacterCount(row?.content)>threshold).map(row=>({
    key:'galaxy:'+row.uid,uid:String(row.uid).trim(),kind:'galaxy',
    title:String(row.title||'').trim(),content:String(row.content||''),
    date:String(row.createtime||'').slice(0,10)
  }));
}

async function loadRune66Catalog(){
  const result=await selectAllRows(PERSONAL_KEYWORD_TABLE,{
    columns:'keyword_id,class_name,class_group,class_enable,item_no,item_name,principle,keywords,order_no',
    filters:[{column:'class_name',operator:'eq',value:RUNE66_CLASS}],
    orders:[{column:'order_no',ascending:true},{column:'item_no',ascending:true}]
  });
  return result.rows||[];
}

async function loadAuthorDocuments({startDate='',endDate=''}={}){
  const scope=await selectManagedScope('lo3rwang');
  if(!scope)throw new Error('找不到 lo3rwang Scope');
  const [configResult,textResult]=await Promise.all([
    selectAllRows(scope.config,{
      columns:'id,keyword_min_chars',
      filters:[{column:'id',operator:'eq',value:'lo3rwang'}]
    }),
    selectAllRows(scope.galaxy,{
      columns:'uid,title,content,createtime,searchable,statistics_able',
      filters:[
        {column:'searchable',operator:'eq',value:true},
        {column:'statistics_able',operator:'eq',value:true},
        ...(startDate?[{column:'createtime',operator:'gte',value:startDate+'T00:00:00+08:00'}]:[]),
        ...(endDate?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999+08:00'}]:[])
      ],
      orders:[{column:'createtime',ascending:true},{column:'uid',ascending:true}]
    })
  ]);
  const minChars=normalizeKeywordMinChars(configResult.rows?.[0]?.keyword_min_chars);
  return {documents:buildDocuments(textResult.rows||[],minChars),minChars};
}

export async function selectRune66Classification({startDate='',endDate=''}={}){
  const key=[String(startDate||''),String(endDate||'')].join('|');
  if(analysisPromises.has(key))return analysisPromises.get(key);
  const promise=(async()=>{
    const [catalogRows,authorData]=await Promise.all([
      loadRune66Catalog(),
      loadAuthorDocuments({startDate,endDate})
    ]);
    const analysis=classifyRune66Documents(authorData.documents,catalogRows);
    return {...analysis,keywordMinChars:authorData.minChars};
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
