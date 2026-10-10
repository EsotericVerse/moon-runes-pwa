// LunaRunes-only daily-draw analytics. No other Scope consumes this module.
export const DAILY_RUNE_PAGE_SIZE=8;
export const DAILY_RUNE_MODES=Object.freeze([
  {value:'rune',label:'符文本體'},
  {value:'rune_direction',label:'符文本體 × 位向'},
  {value:'direction',label:'位向'},
  {value:'triple',label:'符文本體 × 位向 × 真實月相'}
]);
export const DAILY_MOON_PHASES=Object.freeze(['新月','上弦','滿月','下弦','空亡']);
export const DAILY_DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);

export function normalizeDailyDraws(rows=[],phaseAtDate=()=> '未知'){
  return (Array.isArray(rows)?rows:[]).flatMap(row=>{
    const date=String(row?.record_date||'').slice(0,10);
    const rune=Number(row?.rune_number);
    const direction=String(row?.direction||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isInteger(rune)||rune<1||rune>66||!DAILY_DIRECTIONS.includes(direction))return [];
    const recorded=String(row?.recorded_phase||'');
    const computed=String(phaseAtDate(date)||'');
    const phase=DAILY_MOON_PHASES.includes(recorded)?recorded:(DAILY_MOON_PHASES.includes(computed)?computed:'未知');
    return [{
      ...row,
      record_date:date,
      rune_number:rune,
      rune_name:String(row?.rune_name||rune),
      direction,
      phase,
      phase_inferred:!DAILY_MOON_PHASES.includes(recorded),
      draw_kind:String(row?.draw_kind||'')
    }];
  });
}

// Shared category identity is used by BOTH ranking and trend aggregation:
// toggling modes must not change which normalized daily records are counted.
export function dailyCategoryKey(row,mode='rune'){
  const rune=String(row.rune_number);
  const direction=String(row.direction||'');
  if(mode==='direction')return 'direction:'+direction;
  if(mode==='rune_direction')return rune+'|'+direction;
  if(mode==='triple')return rune+'|'+direction+'|'+String(row.phase||'未知');
  return rune;
}

function dailyCategoryLabel(row,mode='rune'){
  if(mode==='direction')return String(row.direction||'');
  const rune=String(row.rune_name||row.rune_number);
  if(mode==='rune_direction')return rune+' · '+row.direction;
  if(mode==='triple')return rune+' · '+row.direction+' · '+row.phase;
  return rune;
}

export function rankDailyDraws(rows=[],mode='rune'){
  const results=new Map();
  if(mode==='direction'&&rows.length){
    // Keep all four directions visible, including directions not drawn yet.
    for(const direction of DAILY_DIRECTIONS){
      const key='direction:'+direction;
      results.set(key,{key,label:direction,count:0,rune_number:0,direction,phase:''});
    }
  }
  for(const row of rows){
    const key=dailyCategoryKey(row,mode);
    if(!results.has(key))results.set(key,{
      key,label:dailyCategoryLabel(row,mode),count:0,
      rune_number:mode==='direction'?0:row.rune_number,
      direction:mode==='rune'?'':row.direction,
      phase:mode==='triple'?row.phase:''
    });
    results.get(key).count++;
  }
  const total=rows.length;
  return [...results.values()].map(row=>({
    ...row,ratio:total>0?row.count/total*100:0
  })).sort((a,b)=>
    b.count-a.count||
    a.rune_number-b.rune_number||
    DAILY_DIRECTIONS.indexOf(a.direction)-DAILY_DIRECTIONS.indexOf(b.direction)||
    DAILY_MOON_PHASES.indexOf(a.phase)-DAILY_MOON_PHASES.indexOf(b.phase)||
    a.key.localeCompare(b.key)
  );
}

export function pageDailyRanking(ranked=[],page=1,pageSize=DAILY_RUNE_PAGE_SIZE){
  const safeSize=Math.min(DAILY_RUNE_PAGE_SIZE,Math.max(1,Math.floor(Number(pageSize)||DAILY_RUNE_PAGE_SIZE)));
  const totalPages=Math.max(1,Math.ceil(ranked.length/safeSize));
  const currentPage=Math.min(totalPages,Math.max(1,Math.floor(Number(page)||1)));
  return {
    rows:ranked.slice((currentPage-1)*safeSize,currentPage*safeSize),
    currentPage,totalPages,totalItems:ranked.length,pageSize:safeSize
  };
}

export function summarizeDailyDraws(rows=[]){
  const kinds=new Map();
  for(const row of rows)kinds.set(row.draw_kind,(kinds.get(row.draw_kind)||0)+1);
  return {recordCount:rows.length,dayCount:new Set(rows.map(row=>row.record_date)).size,drawKinds:[...kinds.entries()].map(([kind,count])=>({kind,count}))};
}

export function dailyTrend(rows=[],bucket='day'){
  const counts=new Map();
  for(const row of rows){
    const day=row.record_date;
    const key=bucket==='month'?day.slice(0,7):day;
    counts.set(key,(counts.get(key)||0)+1);
  }
  return [...counts.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,total])=>({
    period:key.replaceAll('-','/'),total
  }));
}

export function dailyCategoryTrend(rows=[],mode='rune',selected=[],bucket='day',startDate='',endDate=''){
  const keys=new Set(selected.map(item=>String(item.key)));
  if(!keys.size)return [];
  const first=String(startDate||rows[0]?.record_date||'').slice(0,10);
  const last=String(endDate||rows.at(-1)?.record_date||'').slice(0,10);
  const result=new Map();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(first)||!/^\d{4}-\d{2}-\d{2}$/.test(last)||first>last)return [];
  for(let day=new Date(first+'T00:00:00Z'),stop=new Date(last+'T00:00:00Z');day<=stop;day.setUTCDate(day.getUTCDate()+1)){
    const date=day.toISOString().slice(0,10);
    const period=bucket==='month'?date.slice(0,7):date;
    if(!result.has(period)){
      const item={period:period.replaceAll('-','/')};
      for(const key of keys)item[key]=0;
      result.set(period,item);
    }
  }
  for(const row of rows){
    const period=bucket==='month'?row.record_date.slice(0,7):row.record_date;
    const key=dailyCategoryKey(row,mode);
    const record=result.get(period);
    if(record&&keys.has(key))record[key]++;
  }
  return [...result.values()];
}
