import {neonPublicClient} from './neon-client';

export const DAILY_RUNE_PAGE_SIZE=10;

function silver(name){return neonPublicClient.schema('silver').from(name);}


async function loadRuneMeta(){
  const {data,error}=await silver('runes').select('rune_id,rune_name').order('rune_id',{ascending:true});
  if(error)throw new Error(error.message||'符文資料讀取失敗');
  return new Map((data||[]).map(row=>[Number(row.rune_id),row]));
}

async function attachRuneMeta(rows){
  const meta=await loadRuneMeta();
  return rows.map(row=>{
    const rune=meta.get(Number(row.rune_number))||{};
    return {
      ...row,
      rune_name:rune.rune_name||String(row.rune_number)
    };
  });
}

function drawFilters(extra=[]){return extra;}

export async function selectRecentDailyRuneDraws({limit=28}={}){
  const safeLimit=Math.max(1,Math.min(28,Math.floor(Number(limit)||28)));
  const {data,error,count}=await silver('lrunes_daily')
    .select('record_date,draw_kind,rune_number,direction',{count:'exact'})
    .order('record_date',{ascending:false})
    .order('draw_kind',{ascending:true})
    .range(0,safeLimit-1);
  if(error)throw new Error(error.message||'每日符文讀取失敗');
  return {rows:await attachRuneMeta(data||[]),count};
}

export async function selectDailyRuneDraws({offset=0,limit=DAILY_RUNE_PAGE_SIZE}={}){
  const safeOffset=Math.max(0,Math.floor(Number(offset)||0));
  const safeLimit=Math.max(1,Math.min(DAILY_RUNE_PAGE_SIZE,Math.floor(Number(limit)||DAILY_RUNE_PAGE_SIZE)));
  const {data,error}=await silver('lrunes_daily')
    .select('record_date,draw_kind,rune_number,direction')
    .order('record_date',{ascending:false})
    .order('draw_kind',{ascending:true})
    .range(safeOffset,safeOffset+safeLimit-1);
  if(error)throw new Error(error.message||'每日符文讀取失敗');
  return attachRuneMeta(data||[]);
}

export async function selectDailyRuneRange({startDate,endDate}={}){
  const start=String(startDate||'').slice(0,10);
  const end=String(endDate||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return [];
  const low=start<=end?start:end;
  const high=start<=end?end:start;
  const {data,error}=await silver('lrunes_daily')
    .select('record_date,draw_kind,rune_number,direction')
    .gte('record_date',low)
    .lte('record_date',high)
    .order('record_date',{ascending:true})
    .order('draw_kind',{ascending:true});
  if(error)throw new Error(error.message||'每日符文讀取失敗');
  return attachRuneMeta(data||[]);
}

export async function selectDailyRuneMonth({year,month}={}){
  const safeYear=Math.max(2000,Math.min(9999,Math.floor(Number(year)||2026)));
  const safeMonth=Math.max(1,Math.min(12,Math.floor(Number(month)||8)));
  const start=`${safeYear}-${String(safeMonth).padStart(2,'0')}-01`;
  const nextDate=new Date(Date.UTC(safeYear,safeMonth,1));
  const end=`${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth()+1).padStart(2,'0')}-01`;
  const {data,error}=await silver('lrunes_daily')
    .select('record_date,draw_kind,rune_number,direction')
    .gte('record_date',start)
    .lt('record_date',end)
    .order('record_date',{ascending:true})
    .order('draw_kind',{ascending:true})
    .limit(62);
  if(error)throw new Error(error.message||'每日符文讀取失敗');
  return attachRuneMeta(data||[]);
}
