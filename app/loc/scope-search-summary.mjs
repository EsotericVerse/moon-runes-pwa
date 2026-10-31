'use client';

import {selectRows} from './db-query.mjs';
import {dbAuthClient} from './db-client.mjs';

const SCOPE_ID=/^[a-z][a-z0-9]{0,14}$/;

export function summaryScopeIds(values=[]){
  return [...new Set((Array.isArray(values)?values:[]).map(value=>String(value||'').trim().toLowerCase())
    .filter(value=>SCOPE_ID.test(value)&&!['loc','admin','local'].includes(value)))];
}

export function summarizeScopeSearchSummary(scopeIds,rows=[]){
  const ids=summaryScopeIds(scopeIds);
  if(!ids.length)return null;
  const byId=new Map((Array.isArray(rows)?rows:[]).map(row=>[String(row?.scope_id||''),row]));
  if(ids.some(id=>!byId.has(id)))return null;
  let articleCount=0,wordCount=0,firstDate='',lastDate='';
  for(const id of ids){
    const row=byId.get(id);
    const articles=Number(row.article_count);
    const words=Number(row.word_count);
    if(!Number.isSafeInteger(articles)||articles<0||!Number.isSafeInteger(words)||words<0)return null;
    articleCount+=articles;
    wordCount+=words;
    const start=String(row.first_date||'').slice(0,10);
    const end=String(row.last_date||'').slice(0,10);
    if(start&&(!firstDate||start<firstDate))firstDate=start;
    if(end&&(!lastDate||end>lastDate))lastDate=end;
  }
  return {articleCount,wordCount,firstDate,lastDate};
}

export async function readScopeSearchSummary(scopeIds){
  const ids=summaryScopeIds(scopeIds);
  if(!ids.length)return {rows:[],summary:null};
  const rows=[];
  for(let start=0;start<ids.length;start+=40){
    const batch=ids.slice(start,start+40);
    const result=await selectRows('silver.scope_search_summary',{
      columns:'scope_id,article_count,word_count,first_date,last_date,refreshed_at',
      filters:[{column:'scope_id',operator:batch.length===1?'eq':'in',value:batch.length===1?batch[0]:batch}],
      limit:batch.length,
      maxLimit:40
    });
    rows.push(...result.rows);
  }
  return {rows,summary:summarizeScopeSearchSummary(ids,rows)};
}

export async function refreshScopeSearchSummary(scopeId){
  const ids=summaryScopeIds([scopeId]);
  if(ids.length!==1)throw new Error('Scope ID 格式無效');
  const {data,error}=await dbAuthClient.schema('silver')
    .rpc('refresh_scope_search_summary',{p_scope_id:ids[0]});
  if(error)throw new Error(error.message||'統計更新失敗');
  if(String(data?.scope_id)!==ids[0]||!Number.isSafeInteger(Number(data?.article_count))){
    throw new Error('統計更新未回傳有效資料');
  }
  return data;
}
