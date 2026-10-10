'use client';

import {selectScopePeriodWorkIndex,selectScopePeriodWorkDetails} from './culture-query';
import {
  LOC_CONFLUENCE_PAGE_SIZE,confluenceRuneListRows,confluenceWorkListRow,confluenceRowDate
} from './loc-confluence-model.mjs';

// Cursor-based merge: each page fetches at most 20 author index rows.
// Daily draw rows are fetched once for the bounded date range and never copied into Galaxy.
export async function selectLocConfluencePage({
  personalScope,draws=[],startDate='',endDate='',cursor=null,limit=LOC_CONFLUENCE_PAGE_SIZE
}={}){
  const pageSize=Math.min(LOC_CONFLUENCE_PAGE_SIZE,Math.max(1,Math.floor(Number(limit)||LOC_CONFLUENCE_PAGE_SIZE)));
  const allRunes=confluenceRuneListRows(draws);
  let runeOffset=Math.max(0,Number(cursor?.runeOffset)||0);
  let pendingWork=[...(cursor?.pendingWork||[])];
  let workCursor=cursor?.workCursor||null;
  let workExhausted=personalScope?Boolean(cursor?.workExhausted):true;
  let totalWorks=Number.isFinite(Number(cursor?.totalWorks))&&cursor?.totalWorks!=null
    ?Number(cursor.totalWorks):null;
  const selected=[];

  async function readNextWorkBatch(){
    if(workExhausted||!personalScope)return;
    const result=await selectScopePeriodWorkIndex(personalScope,{
      startDate,endDate,limit:pageSize,cursor:workCursor
    });
    pendingWork=result.rows||[];
    workCursor=result.nextCursor;
    totalWorks=Number(result.totalCount)||0;
    const processed=Number(workCursor?.galaxyOffset||0)+Number(workCursor?.mediaOffset||0);
    workExhausted=!pendingWork.length||processed>=totalWorks;
  }

  while(selected.length<pageSize){
    if(!pendingWork.length&&!workExhausted)await readNextWorkBatch();
    const nextRune=allRunes[runeOffset]||null;
    const nextWork=pendingWork[0]||null;
    if(!nextRune&&!nextWork)break;
    const runeDate=nextRune?confluenceRowDate(nextRune):'';
    const workDate=nextWork?confluenceRowDate(nextWork):'';
    if(nextRune&&(!nextWork||runeDate>=workDate)){
      selected.push(nextRune);
      runeOffset++;
    }else{
      selected.push({...pendingWork.shift(),scope_id:'lo3rwang'});
    }
  }

  const requestedWorks=selected.filter(row=>row.entry_type!=='loc_daily_rune');
  const details=requestedWorks.length&&personalScope
    ?(await selectScopePeriodWorkDetails(personalScope,{items:requestedWorks})).rows||[]
    :[];
  const workMap=new Map(details.map(row=>[String(row.key),confluenceWorkListRow(row)]));
  const rows=selected.map(row=>
    row.entry_type==='loc_daily_rune'?row:workMap.get(String(row.key))
  ).filter(Boolean);
  const hasMore=runeOffset<allRunes.length||pendingWork.length>0||!workExhausted;
  return {
    rows,
    totalCount:(totalWorks||0)+allRunes.length,
    hasMore,
    nextCursor:hasMore?{
      runeOffset,pendingWork,workCursor,workExhausted,totalWorks
    }:null
  };
}
