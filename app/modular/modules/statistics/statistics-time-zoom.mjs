// One shared time-window contract for LOC and LunaRunes statistics.
// Zoom changes the query interval and the aggregation bucket together.
export const STATISTICS_ZOOM_LEVELS=Object.freeze([
  {label:'一年',months:12,bucket:'month'},
  {label:'半年',months:6,bucket:'week'},
  {label:'三個月',months:3,bucket:'week'},
  {label:'一個月',months:1,bucket:'day'},
  {label:'兩週',days:13,bucket:'day'},
  {label:'一週',days:6,bucket:'day'},
  {label:'三天',days:2,bucket:'day'}
]);

export function statisticsZoomLevel(value=0){
  return Math.max(0,Math.min(STATISTICS_ZOOM_LEVELS.length-1,Math.trunc(Number(value)||0)));
}

function shiftUtcDate(iso,{months=0,days=0}={}){
  const current=new Date(iso+'T00:00:00Z');
  if(!Number.isFinite(current.getTime()))return '';
  if(months){
    const day=current.getUTCDate();
    current.setUTCDate(1);
    current.setUTCMonth(current.getUTCMonth()+months);
    const lastDay=new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()+1,0)).getUTCDate();
    current.setUTCDate(Math.min(day,lastDay));
  }
  if(days)current.setUTCDate(current.getUTCDate()+days);
  return current.toISOString().slice(0,10);
}

export function statisticsZoomWindow(level=0,endDate=''){
  const index=statisticsZoomLevel(level);
  const config=STATISTICS_ZOOM_LEVELS[index];
  if(!/^\d{4}-\d{2}-\d{2}$/.test(endDate))return {startDate:'',endDate:'',bucket:config.bucket,level:index};
  const startDate=shiftUtcDate(endDate,{months:config.months?-config.months:0,days:config.days===undefined?0:-config.days});
  return {startDate,endDate,bucket:config.bucket,level:index};
}

export function statisticsWeekKey(date){
  const at=new Date(String(date).slice(0,10)+'T00:00:00Z');
  if(!Number.isFinite(at.getTime()))return '';
  at.setUTCDate(at.getUTCDate()-(at.getUTCDay()+6)%7);
  return at.toISOString().slice(0,10);
}
