import {selectNeonRows} from './neon-repository';

export const DAILY_RUNE_PAGE_SIZE=10;

async function loadRuneNames(){
  const {rows}=await selectNeonRows('silver.lrunes',{
    columns:'rune_number,rune_name',
    filters:[{column:'record_type',operator:'eq',value:'rune'}],
    orders:[{column:'rune_number',ascending:true}],
    limit:100
  });
  return new Map(rows.map(row=>[Number(row.rune_number),row.rune_name]));
}

async function attachRuneNames(rows){
  const names=await loadRuneNames();
  return rows.map(row=>({...row,rune_name:names.get(Number(row.rune_number))||String(row.rune_number)}));
}

function drawFilters(extra=[]){
  return [{column:'record_type',operator:'eq',value:'daily_draw'},...extra];
}

export async function selectRecentDailyRuneDraws({limit=28}={}){
  const safeLimit=Math.max(1,Math.min(28,Math.floor(Number(limit)||28)));
  const result=await selectNeonRows('silver.lrunes',{
    columns:'record_date,draw_kind,rune_number,direction',
    filters:drawFilters(),
    orders:[{column:'record_date',ascending:false},{column:'draw_kind',ascending:true}],
    range:[0,safeLimit-1],
    count:'exact'
  });
  return {rows:await attachRuneNames(result.rows),count:result.count};
}

export async function selectDailyRuneDraws({offset=0,limit=DAILY_RUNE_PAGE_SIZE}={}){
  const safeOffset=Math.max(0,Math.floor(Number(offset)||0));
  const safeLimit=Math.max(1,Math.min(DAILY_RUNE_PAGE_SIZE,Math.floor(Number(limit)||DAILY_RUNE_PAGE_SIZE)));
  const draws=await selectNeonRows('silver.lrunes',{
    columns:'record_date,draw_kind,rune_number,direction',
    filters:drawFilters(),
    orders:[{column:'record_date',ascending:false},{column:'draw_kind',ascending:true}],
    range:[safeOffset,safeOffset+safeLimit-1]
  });
  return attachRuneNames(draws.rows);
}

export async function selectDailyRuneMonth({year,month}={}){
  const safeYear=Math.max(2000,Math.min(9999,Math.floor(Number(year)||2026)));
  const safeMonth=Math.max(1,Math.min(12,Math.floor(Number(month)||8)));
  const start=`${safeYear}-${String(safeMonth).padStart(2,'0')}-01`;
  const nextDate=new Date(Date.UTC(safeYear,safeMonth,1));
  const end=`${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth()+1).padStart(2,'0')}-01`;
  const draws=await selectNeonRows('silver.lrunes',{
    columns:'record_date,draw_kind,rune_number,direction',
    filters:drawFilters([
      {column:'record_date',operator:'gte',value:start},
      {column:'record_date',operator:'lt',value:end}
    ]),
    orders:[{column:'record_date',ascending:true},{column:'draw_kind',ascending:true}],
    limit:62
  });
  return attachRuneNames(draws.rows);
}
