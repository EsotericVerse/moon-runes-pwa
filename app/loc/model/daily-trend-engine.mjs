const DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);

function dayKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
}

function dateMs(value){
  const key=dayKey(value);
  return key?Date.parse(key+'T00:00:00Z'):NaN;
}

function roleOf(row){
  const role=String(row?.draw_kind||row?.daily_role||'').toLowerCase();
  return role==='supplement'?'supplement':'main';
}

function runeName(row){
  return String(row?.rune_name||row?.name||row?.rune_number||'').trim();
}

function directionOf(row){
  const direction=String(row?.direction||'未知').trim();
  return DIRECTIONS.includes(direction)?direction:'未知';
}

function rowsInWindow(rows,latestDate,span){
  const latest=dateMs(latestDate);
  if(!Number.isFinite(latest))return [];
  const start=latest-(Math.max(1,span)-1)*86400000;
  return (rows||[]).filter(row=>{
    const value=dateMs(row?.record_date??row?.created_at);
    return Number.isFinite(value)&&value>=start&&value<=latest;
  });
}

function sortEntries(entries){
  return [...entries].sort((a,b)=>{
    const byDate=a.date.localeCompare(b.date);
    if(byDate)return byDate;
    if(a.role===b.role)return 0;
    return a.role==='main'?-1:1;
  });
}

function summarizeRepeatedRunes(rows){
  const groups=new Map();
  for(const row of rows||[]){
    const name=runeName(row);
    if(!name)continue;
    if(!groups.has(name))groups.set(name,[]);
    groups.get(name).push({
      date:dayKey(row?.record_date??row?.created_at),
      direction:directionOf(row),
      role:roleOf(row)
    });
  }

  const repeats=[];
  const directionChanges=[];
  const sameDirection=[];
  for(const [name,rawEntries] of groups){
    const entries=sortEntries(rawEntries);
    const dates=[...new Set(entries.map(item=>item.date).filter(Boolean))];
    if(dates.length<2)continue;
    const directions=[...new Set(entries.map(item=>item.direction))];
    const directionCounts=Object.fromEntries(DIRECTIONS.concat('未知').map(direction=>[
      direction,
      entries.filter(item=>item.direction===direction).length
    ]));
    const base={
      name,
      count:entries.length,
      days_count:dates.length,
      dates,
      entries,
      direction_counts:directionCounts
    };
    repeats.push(base);
    if(directions.length>1){
      directionChanges.push({
        ...base,
        from:entries[0].direction,
        to:entries.at(-1).direction,
        path:entries.map(item=>item.direction)
      });
    }else{
      sameDirection.push({
        ...base,
        direction:directions[0]||'未知'
      });
    }
  }

  const order=(a,b)=>b.days_count-a.days_count||b.count-a.count||a.name.localeCompare(b.name,'zh-Hant');
  repeats.sort(order);
  directionChanges.sort(order);
  sameDirection.sort(order);
  return {repeats,directionChanges,sameDirection};
}

function directionDistribution(rows){
  const counts=Object.fromEntries(DIRECTIONS.concat('未知').map(direction=>[direction,0]));
  for(const row of rows||[])counts[directionOf(row)]=(counts[directionOf(row)]||0)+1;
  return counts;
}

function directionChangeNote(item){
  if(!item)return '';
  if(item.from==='未知'||item.to==='未知'){
    return `${item.name} 的位向包含未知，先保留觀察。`;
  }
  if(item.from===item.to){
    return `${item.name} 重複維持${item.to}，主題持續。`;
  }
  return `${item.name} 由${item.from}轉為${item.to}，留意同一主題的方向變化。`;
}

function summarizeWindow(rows,latestDate,span){
  if(!latestDate)return {
    span,start_date:'',end_date:'',repeats:[],direction_changes:[],same_direction:[],notes:[]
  };
  const latest=dateMs(latestDate);
  const start=latest-(span-1)*86400000;
  const source=rowsInWindow(rows,latestDate,span);
  const repeated=summarizeRepeatedRunes(source);
  return {
    span,
    start_date:new Date(start).toISOString().slice(0,10),
    end_date:latestDate,
    total_draws:source.length,
    unique_runes:new Set(source.map(runeName).filter(Boolean)).size,
    direction_counts:directionDistribution(source),
    repeats:repeated.repeats,
    direction_changes:repeated.directionChanges,
    same_direction:repeated.sameDirection,
    notes:[
      ...repeated.directionChanges.map(directionChangeNote),
      ...repeated.sameDirection.map(item=>directionChangeNote({...item,from:item.direction,to:item.direction}))
    ]
  };
}

export function summarizeDailyDraws(rows=[]){
  const grouped=new Map();
  for(const row of rows||[]){
    const date=dayKey(row?.record_date??row?.created_at);
    if(!date)continue;
    if(!grouped.has(date))grouped.set(date,{date,rows:[]});
    grouped.get(date).rows.push({
      ...row,
      rune_name:runeName(row),
      direction:directionOf(row),
      role:roleOf(row)
    });
  }
  return [...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export function summarizeDailyWindows(rows=[],days=[]){
  const sourceDays=Array.isArray(days)?days:[];
  const latest=sourceDays.at(-1)||null;
  const previous=sourceDays.length>1?sourceDays.at(-2):null;

  let adjacent={
    previous_date:previous?.date||'',
    current_date:latest?.date||'',
    total_draws:0,
    unique_runes:0,
    direction_counts:directionDistribution([]),
    repeats:[],
    direction_changes:[],
    same_direction:[],
    notes:[]
  };

  if(previous&&latest){
    const pairRows=(rows||[]).filter(row=>{
      const date=dayKey(row?.record_date??row?.created_at);
      return date===previous.date||date===latest.date;
    });
    const repeated=summarizeRepeatedRunes(pairRows);
    const acrossBoth=item=>{
      const dates=new Set(item.entries.map(entry=>entry.date));
      return dates.has(previous.date)&&dates.has(latest.date);
    };
    const directionChanges=repeated.directionChanges.filter(acrossBoth);
    const sameDirection=repeated.sameDirection.filter(acrossBoth);
    adjacent={
      previous_date:previous.date,
      current_date:latest.date,
      total_draws:pairRows.length,
      unique_runes:new Set(pairRows.map(runeName).filter(Boolean)).size,
      direction_counts:directionDistribution(pairRows),
      repeats:repeated.repeats.filter(acrossBoth),
      direction_changes:directionChanges,
      same_direction:sameDirection,
      notes:[
        ...directionChanges.map(directionChangeNote),
        ...sameDirection.map(item=>directionChangeNote({...item,from:item.direction,to:item.direction}))
      ]
    };
  }

  return {
    latest_day:latest,
    adjacent,
    three_days:summarizeWindow(rows,latest?.date||'',3),
    seven_days:summarizeWindow(rows,latest?.date||'',7)
  };
}
