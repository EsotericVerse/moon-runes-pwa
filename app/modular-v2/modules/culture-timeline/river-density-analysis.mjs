import {detectChangepoints,PoissonCost} from 'karaul';

const DAY_MS=86400000;

function dayKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
}
function dayMs(value){
  const key=dayKey(value);
  return key?Date.parse(key+'T00:00:00Z'):NaN;
}
function dayFromMs(value){
  return new Date(value).toISOString().slice(0,10);
}

export function aggregateRiverDensity(rows=[]){
  const counts=new Map();
  for(const row of rows||[]){
    const date=dayKey(row?.date||row?.day||row?.start_date);
    const count=Math.max(0,Number(row?.count??row?.item_count??0)||0);
    if(!date||count<=0)continue;
    counts.set(date,(counts.get(date)||0)+count);
  }
  return [...counts.entries()]
    .map(([date,count])=>({date,count}))
    .sort((a,b)=>a.date.localeCompare(b.date));
}

export function fillRiverDensity(rows=[]){
  const aggregated=aggregateRiverDensity(rows);
  if(!aggregated.length)return [];
  const counts=new Map(aggregated.map(row=>[row.date,row.count]));
  const start=dayMs(aggregated[0].date);
  const end=dayMs(aggregated.at(-1).date);
  const filled=[];
  for(let cursor=start;cursor<=end;cursor+=DAY_MS){
    const date=dayFromMs(cursor);
    filled.push({date,count:counts.get(date)||0});
  }
  return filled;
}

function nearestPublishedBefore(rows,index){
  for(let cursor=Math.min(index-1,rows.length-1);cursor>=0;cursor--){
    if(Number(rows[cursor]?.count)>0)return rows[cursor].date;
  }
  return '';
}
function nearestPublishedAtOrAfter(rows,index){
  for(let cursor=Math.max(0,index);cursor<rows.length;cursor++){
    if(Number(rows[cursor]?.count)>0)return rows[cursor].date;
  }
  return '';
}
function structuralEmptyRuns(rows,changepoints){
  const changeSet=new Set(changepoints);
  const runs=[];
  let start=-1;
  for(let index=0;index<=rows.length;index++){
    const empty=index<rows.length&&Number(rows[index]?.count)===0;
    if(empty&&start<0)start=index;
    if((!empty||index===rows.length)&&start>=0){
      const endIndex=index;
      if(changeSet.has(start)||changeSet.has(endIndex))runs.push({startIndex:start,endIndex});
      start=-1;
    }
  }
  return runs;
}

export function analyzeRiverDensity(rows=[],anchorDates=[]){
  const density=fillRiverDensity(rows);
  if(density.length<3)return {density,changepoints:[],hiddenDates:[],suggestions:[]};

  const values=density.map(row=>Number(row.count)||0);
  let changepoints=[];
  try{
    changepoints=detectChangepoints(values,new PoissonCost())
      .filter(index=>Number.isInteger(index)&&index>0&&index<density.length);
  }catch{
    changepoints=[];
  }

  const emptySegments=structuralEmptyRuns(density,changepoints);
  const hiddenDates=emptySegments.map(segment=>({
    start:density[segment.startIndex].date,
    end:segment.endIndex<density.length?density[segment.endIndex].date:dayFromMs(dayMs(density.at(-1).date)+DAY_MS)
  }));

  const existing=new Set((anchorDates||[]).map(dayKey).filter(Boolean));
  const suggestions=new Map();
  const addSuggestion=(date,reason)=>{
    const key=dayKey(date);
    if(!key||existing.has(key))return;
    const current=suggestions.get(key);
    if(!current||reason==='gap-edge')suggestions.set(key,{date:key,reason});
  };

  for(const index of changepoints){
    const before=Number(density[index-1]?.count)||0;
    const after=Number(density[index]?.count)||0;
    if(before>0&&after===0)addSuggestion(nearestPublishedBefore(density,index),'change-point');
    else addSuggestion(nearestPublishedAtOrAfter(density,index),'change-point');
  }
  for(const segment of emptySegments){
    addSuggestion(nearestPublishedBefore(density,segment.startIndex),'gap-edge');
    addSuggestion(nearestPublishedAtOrAfter(density,segment.endIndex),'gap-edge');
  }

  return {
    density,
    changepoints,
    hiddenDates,
    suggestions:[...suggestions.values()].sort((a,b)=>a.date.localeCompare(b.date))
  };
}
