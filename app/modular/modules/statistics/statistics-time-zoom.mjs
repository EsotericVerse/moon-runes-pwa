// The LOC / LunaRunes statistics timeframe is controlled exclusively by +/-.
// Default to the last calendar year; zoom out only as far as *real* historical
// records, with no fixed year ceiling. Automatic buckets are presentation only.
const MS_PER_DAY=86_400_000;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const validDate=value=>{
  if(!DATE.test(String(value||'')))return false;
  const date=new Date(value+'T00:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
};
const epoch=value=>Date.parse(value+'T00:00:00Z');
const dateFromEpoch=value=>new Date(value).toISOString().slice(0,10);

export function statisticsZoomLevel(value=0){
  return Math.trunc(Number.isFinite(Number(value))?Number(value):0);
}
function lastYearDate(value){
  const date=new Date(value+'T00:00:00Z');
  const day=date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth()-12);
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(day,last));
  return date.toISOString().slice(0,10);
}
export function statisticsZoomWindow(level=0,endDate='',earliestDate=''){
  const zoom=statisticsZoomLevel(level);
  if(!validDate(endDate))return {
    startDate:'',endDate:'',bucket:'day',level:zoom,fullHistory:false,canZoomOut:false,canZoomIn:false
  };
  const origin=lastYearDate(endDate);
  const baseDays=Math.max(1,Math.round((epoch(endDate)-epoch(origin))/MS_PER_DAY));
  const earliest=validDate(earliestDate)&&earliestDate<=endDate?earliestDate:'';
  const earliestDays=earliest?Math.round((epoch(endDate)-epoch(earliest))/MS_PER_DAY):Infinity;
  const factor=2**(-zoom);
  const span=Number.isFinite(factor)?Math.max(0,Math.round(baseDays*factor)):Infinity;
  const clamped=earliest&&zoom<0&&span>=earliestDays;
  const startDate=clamped?earliest:dateFromEpoch(epoch(endDate)-span*MS_PER_DAY);
  const days=Math.round((epoch(endDate)-epoch(startDate))/MS_PER_DAY);
  return {
    startDate,endDate,
    bucket:days>180?'month':days>31?'week':'day',
    level:zoom,
    fullHistory:Boolean(earliest&&startDate<=earliest),
    canZoomOut:Boolean(earliest&&startDate>earliest),
    canZoomIn:Boolean(earliest&&days>0)
  };
}
export function statisticsWeekKey(date){
  const at=new Date(String(date).slice(0,10)+'T00:00:00Z');
  if(!Number.isFinite(at.getTime()))return '';
  at.setUTCDate(at.getUTCDate()-(at.getUTCDay()+6)%7);
  return at.toISOString().slice(0,10);
}
