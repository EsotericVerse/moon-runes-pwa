'use client';

import {selectNeonRows} from './neon-repository';

function dateFilters(column,startDate,endDate){
  const filters=[];
  if(startDate)filters.push({column,operator:'gte',value:startDate});
  if(endDate)filters.push({column,operator:'lte',value:endDate});
  return filters;
}

function safeSearchTerm(value){
  return String(value||'')
    .normalize('NFKC')
    .trim()
    .replace(/[,%()*"'\\]/g,' ')
    .replace(/\s+/g,' ')
    .slice(0,240);
}

function textOrFilter(term){
  const pattern='%'+term+'%';
  return [
    'title.ilike.'+pattern,
    'content.ilike.'+pattern,
    'source_name.ilike.'+pattern
  ].join(',');
}

function wrapRows(rows,scopeId,source,providerId){
  return (rows||[]).map(row=>({
    row:{...row,scope_id:scopeId},
    source,
    providerId
  }));
}

function makeDatabaseWorkProvider({id,scopeId,table,source,columns,filters=[]}){
  return Object.freeze({
    id,
    async search(query,{limit=20,offset=0,startDate='',endDate=''}={}){
      const term=safeSearchTerm(query);
      if(!term)return {rows:[],count:0,totalCount:0,hasMore:false,nextOffset:null};
      const result=await selectNeonRows(table,{
        columns,
        filters:[
          ...filters,
          ...dateFilters('createtime',startDate,endDate)
        ],
        orFilter:textOrFilter(term),
        orders:[{column:'createtime',ascending:false,nullsFirst:false}],
        limit:Math.max(0,Math.floor(Number(limit)||0)),
        offset:Math.max(0,Math.floor(Number(offset)||0)),
        count:'exact'
      });
      const count=Math.max(0,Number(result.count)||0);
      const rows=wrapRows(result.rows,scopeId,source,id);
      const nextOffset=Math.max(0,Math.floor(Number(offset)||0))+rows.length;
      return {
        rows,
        count,
        totalCount:count,
        hasMore:nextOffset<count,
        nextOffset:nextOffset<count?nextOffset:null
      };
    }
  });
}

const authorWorkSearch=makeDatabaseWorkProvider({
  id:'author-text-db',
  scopeId:'lo3rwang',
  table:'silver.lo3rwang_galaxy',
  source:'作者正文',
  columns:'uid,title,source_name,source_id,target_id,ref_id,url,createtime',
  filters:[{column:'searchable',operator:'eq',value:true}]
});

const runeWorkSearch=makeDatabaseWorkProvider({
  id:'rune-text-db',
  scopeId:'lrunes',
  table:'silver.lrunes',
  source:'符文文字',
  columns:'record_id,uid,category,content_type,source_name,source_role,title,createtime,source_id,target_id,ref_id,url,media_link',
  filters:[
    {column:'record_type',operator:'eq',value:'galaxy'},
    {column:'searchable',operator:'eq',value:true}
  ]
});

export function getDatabaseWorkSearchProviders(collectionId,scopeIds=[]){
  if(collectionId==='lo3rwang')return [authorWorkSearch];
  if(collectionId==='月之符文')return [runeWorkSearch];
  if(collectionId!=='all')return [];
  const providers=[];
  for(const id of scopeIds){
    if(id==='lo3rwang')providers.push(authorWorkSearch);
    if(id==='lrunes')providers.push(runeWorkSearch);
  }
  return providers;
}
