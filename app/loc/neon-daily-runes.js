import {neonAuthClient,neonPublicClient} from './neon-client';
import {selectRuneRows} from './rune-repository';

export const DAILY_RUNE_PAGE_SIZE=10;

function silver(name){return neonPublicClient.schema('silver').from(name);}
function silverAuth(name){return neonAuthClient.schema('silver').from(name);}


async function attachRuneMeta(rows){
  const source=Array.isArray(rows)?rows:[];
  const ids=[...new Set(source.map(row=>Number(row.rune_number)).filter(number=>Number.isInteger(number)&&number>=0&&number<=66))];
  const runes=ids.length?await selectRuneRows(ids):[];
  const meta=new Map(runes.map(row=>[Number(row.rune_number),row]));
  return source.map(row=>{
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


const DAILY_DRAW_KINDS=new Set(['main','supplement']);
const DAILY_DIRECTIONS=new Set(['正位','半正位','半逆位','逆位']);

export async function insertDailyRuneRecord({recordDate,drawKind,runeNumber,direction}={}){
  const date=String(recordDate||'').slice(0,10);
  const kind=String(drawKind||'').trim();
  const rune=Number(runeNumber);
  const dir=String(direction||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('日期格式不正確。');
  if(!DAILY_DRAW_KINDS.has(kind))throw new Error('紀錄類型不正確。');
  if(!Number.isInteger(rune)||rune<0||rune>66)throw new Error('符文編號不正確。');
  if(!DAILY_DIRECTIONS.has(dir))throw new Error('符文方向不正確。');
  const row={
    record_id:'manual:'+date+':'+kind,
    record_date:date,
    draw_kind:kind,
    rune_number:rune,
    direction:dir
  };
  const {data,error}=await silverAuth('lrunes_daily')
    .insert(row)
    .select('record_date,draw_kind,rune_number,direction');
  if(error){
    if(String(error.code||'')==='23505')throw new Error('這一天已經有相同種類的紀錄。');
    throw new Error(error.message||'每日符文紀錄新增失敗');
  }
  const attached=await attachRuneMeta(data||[]);
  return attached[0]||null;
}


export async function updateDailyRuneRecord({recordDate,drawKind,runeNumber,direction}={}){
  const date=String(recordDate||'').slice(0,10);
  const kind=String(drawKind||'').trim();
  const rune=Number(runeNumber);
  const dir=String(direction||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('日期格式不正確。');
  if(!DAILY_DRAW_KINDS.has(kind))throw new Error('紀錄類型不正確。');
  if(!Number.isInteger(rune)||rune<0||rune>66)throw new Error('符文編號不正確。');
  if(!DAILY_DIRECTIONS.has(dir))throw new Error('符文方向不正確。');
  const {data,error}=await silverAuth('lrunes_daily')
    .update({rune_number:rune,direction:dir,updated_at:new Date().toISOString()})
    .eq('record_date',date)
    .eq('draw_kind',kind)
    .select('record_date,draw_kind,rune_number,direction');
  if(error)throw new Error(error.message||'每日符文紀錄修改失敗');
  if(!data?.length)throw new Error('找不到紀錄或目前沒有修改權限。');
  const attached=await attachRuneMeta(data);
  return attached[0]||null;
}

export async function deleteDailyRuneRecord({recordDate,drawKind}={}){
  const date=String(recordDate||'').slice(0,10);
  const kind=String(drawKind||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('日期格式不正確。');
  if(!DAILY_DRAW_KINDS.has(kind))throw new Error('紀錄類型不正確。');
  const {data,error}=await silverAuth('lrunes_daily')
    .delete()
    .eq('record_date',date)
    .eq('draw_kind',kind)
    .select('record_date,draw_kind');
  if(error)throw new Error(error.message||'每日符文紀錄刪除失敗');
  if(!data?.length)throw new Error('找不到紀錄或目前沒有刪除權限。');
  return data[0];
}
