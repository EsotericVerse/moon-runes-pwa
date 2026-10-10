// Device-local Luna Codex dashboard analysis. No cloud write, no invented
// rune meanings and no numeric "energy" values from unspecified folklore.
export const FOUR_DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);
const FORWARD=new Set(['正位','半正位']);
const BLOCKED=new Set(['半逆位','逆位']);

function plusDays(date,delta){
  const at=new Date(String(date).slice(0,10)+'T12:00:00Z');
  if(Number.isNaN(at.getTime()))return '';
  at.setUTCDate(at.getUTCDate()+delta);
  return at.toISOString().slice(0,10);
}
export function buildRuneAppOverview(rows=[],today,days=7){
  const end=String(today||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(end))return null;
  const limit=Math.max(1,Math.min(90,Math.floor(Number(days)||7)));
  const first=plusDays(end,1-limit);
  const recent=(Array.isArray(rows)?rows:[]).filter(row=>
    row&&String(row.record_date||'').slice(0,10)>=first&&
    String(row.record_date||'').slice(0,10)<=end&&
    FOUR_DIRECTIONS.includes(row.direction)
  );
  const counts=Object.fromEntries(FOUR_DIRECTIONS.map(d=>[d,0]));
  const byDate=new Map();
  for(const row of recent){
    counts[row.direction]++;
    const date=String(row.record_date).slice(0,10);
    byDate.set(date,(byDate.get(date)||0)+1);
  }
  const forward=counts['正位']+counts['半正位'];
  const blocked=counts['半逆位']+counts['逆位'];
  const sample=recent.length;
  const forwardRatio=sample?Math.round(forward/sample*100):0;
  const blockedRatio=sample?Math.round(blocked/sample*100):0;
  const tendency=sample<3?'資料不足':forwardRatio>=60?'偏向推進':blockedRatio>=60?'偏向阻滯':'方向交錯';
  const daily=Array.from({length:limit},(_,i)=>{
    const date=plusDays(first,i);
    return {date,label:date.slice(5).replace('-','/'),count:byDate.get(date)||0};
  });
  const daysWithDraw=[...new Set((Array.isArray(rows)?rows:[]).map(row=>String(row?.record_date||'').slice(0,10)))];
  const set=new Set(daysWithDraw);
  let streak=0;
  let cursor=set.has(end)?end:plusDays(end,-1);
  while(cursor&&set.has(cursor)&&streak<366){streak++;cursor=plusDays(cursor,-1);}
  return {startDate:first,endDate:end,days:limit,daysWithRecord:byDate.size,total:sample,counts,forward,blocked,forwardRatio,blockedRatio,tendency,daily,streak};
}
