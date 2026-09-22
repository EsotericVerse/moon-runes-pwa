'use client';

import {selectNeonRows} from './neon-repository';

const TABLES=Object.freeze({
  all:Object.freeze([['loc_context_entries','LOC 脈絡'],['gold.public_works','公開作品'],['gold.public_song_versions','公開歌曲版本']]),
  '月之符文':Object.freeze([['runes_context_entries','月之符文脈絡'],['lrunes_runes','月之符文']]),
  '政德文化':Object.freeze([['lo3rwang_context_entries','政德文化脈絡'],['gold.public_works','公開作品'],['gold.public_song_versions','公開歌曲版本']]),
  '政德風':Object.freeze([['lo3rwang_context_entries','政德文化脈絡'],['gold.public_works','公開作品'],['gold.public_song_versions','公開歌曲版本']]),
  治理:Object.freeze([['loc_context_entries','治理脈絡']])
});

const SEARCH_PAGE_SIZE=500;

async function selectAllNeonRows(table,source){
  const rows=[];let offset=0;let total=null;
  while(total===null||offset<total){
    const result=await selectNeonRows(table,{columns:'*',count:'exact',range:[offset,offset+SEARCH_PAGE_SIZE-1]});
    rows.push(...result.rows.map(row=>({row,source})));
    total=Number.isFinite(Number(result.count))?Number(result.count):offset+result.rows.length;
    if(result.rows.length<SEARCH_PAGE_SIZE)break;
    offset+=result.rows.length;
  }
  return rows;
}

export async function selectNeonSearchRows(collectionId){
  const tables=TABLES[collectionId]||TABLES.all;
  const settled=await Promise.all(tables.map(async([table,source])=>{
    try{
      return {
        table,
        rows:await selectAllNeonRows(table,source),
        error:null
      };
    }catch(error){
      return {table,rows:[],error:new Error(`Neon Search SELECT ${table}: ${error?.message||'query failed'}`)};
    }
  }));
  const rows=settled.flatMap(item=>item.rows);
  const failures=settled.filter(item=>item.error).map(item=>item.error);
  const successfulTables=settled.length-failures.length;
  if(!successfulTables){
    throw new AggregateError(failures,'Neon 搜尋資料表全部無法查詢');
  }
  return {rows,failures};
}
