function riverDate(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)&&Number.isFinite(Date.parse(key+'T00:00:00Z'))?key:'';
}

function nextRiverDate(value){
  const key=riverDate(value);
  if(!key)return '';
  const date=new Date(key+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString().slice(0,10);
}

export function normalizeRiverDensitySeries(rows=[]){
  const counts=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=riverDate(row?.date||row?.day||row?.start_date||row?.createtime||row?.created_at);
    if(!date)continue;
    const count=Math.max(0,Number(row?.count??row?.item_count??row?.work_count??0)||0);
    counts.set(date,(counts.get(date)||0)+count);
  }
  return [...counts.entries()]
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([date,count])=>({date,count}));
}

export function completeRiverDensitySeries(rows=[],{startDate='',endDate=''}={}){
  const normalized=normalizeRiverDensitySeries(rows);
  if(!normalized.length&&!riverDate(startDate)&&!riverDate(endDate))return [];
  const start=riverDate(startDate)||normalized[0]?.date||'';
  const end=riverDate(endDate)||normalized.at(-1)?.date||'';
  if(!start||!end||start>end)return normalized;
  const counts=new Map(normalized.map(item=>[item.date,item.count]));
  const result=[];
  for(let date=start;date&&date<=end;date=nextRiverDate(date)){
    result.push({date,count:counts.get(date)||0});
  }
  return result;
}

export function mapRiverChangeIndexesToPublishedDates(series=[],changeIndexes=[]){
  const rows=normalizeRiverDensitySeries(series);
  if(!rows.length)return [];
  const publishedIndexes=rows
    .map((item,index)=>item.count>0?index:-1)
    .filter(index=>index>=0);
  const dates=new Set();
  for(const rawIndex of Array.isArray(changeIndexes)?changeIndexes:[]){
    const index=Math.max(0,Math.min(rows.length,Math.trunc(Number(rawIndex))));
    if(!Number.isFinite(index))continue;
    const before=[...publishedIndexes].reverse().find(candidate=>candidate<index);
    const after=publishedIndexes.find(candidate=>candidate>=index);
    if(Number.isInteger(before))dates.add(rows[before].date);
    if(Number.isInteger(after))dates.add(rows[after].date);
  }
  return [...dates].sort();
}

export function excludeAnchoredRiverDates(candidateDates=[],anchorDates=[]){
  const anchored=new Set((Array.isArray(anchorDates)?anchorDates:[]).map(riverDate).filter(Boolean));
  return [...new Set((Array.isArray(candidateDates)?candidateDates:[]).map(riverDate).filter(Boolean))]
    .filter(date=>!anchored.has(date))
    .sort();
}

export function hiddenDatesFromGapBoundaries(gaps=[]){
  return (Array.isArray(gaps)?gaps:[]).flatMap(gap=>{
    const before=riverDate(gap?.before||gap?.from||gap?.leftDate);
    const after=riverDate(gap?.after||gap?.to||gap?.rightDate);
    if(!before||!after||before>=after)return [];
    const start=nextRiverDate(before);
    if(!start||start>=after)return [];
    return [{start,end:after}];
  });
}

export function buildRiverDensityAnalysis({
  densityRows=[],
  startDate='',
  endDate='',
  changeIndexes=[],
  gapBoundaries=[],
  anchorDates=[]
}={}){
  const series=completeRiverDensitySeries(densityRows,{startDate,endDate});
  const candidates=mapRiverChangeIndexesToPublishedDates(series,changeIndexes);
  return {
    series,
    candidateDates:excludeAnchoredRiverDates(candidates,anchorDates),
    hiddenDates:hiddenDatesFromGapBoundaries(gapBoundaries)
  };
}
