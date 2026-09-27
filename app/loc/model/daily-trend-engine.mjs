const DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);

function dayKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
}

function dateMs(value){
  const key=dayKey(value);
  return key?Date.parse(key+'T00:00:00Z'):NaN;
}

function addDays(date,offset){
  const ms=dateMs(date);
  if(!Number.isFinite(ms))return '';
  return new Date(ms+Number(offset||0)*86400000).toISOString().slice(0,10);
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

function sortEntries(entries){
  return [...entries].sort((a,b)=>{
    const byDate=a.date.localeCompare(b.date);
    if(byDate)return byDate;
    if(a.role===b.role)return 0;
    return a.role==='main'?-1:1;
  });
}

function rowsInRange(rows,startDate,endDate){
  const start=dateMs(startDate);
  const end=dateMs(endDate);
  if(!Number.isFinite(start)||!Number.isFinite(end))return [];
  const low=Math.min(start,end);
  const high=Math.max(start,end);
  return (rows||[]).filter(row=>{
    const value=dateMs(row?.record_date??row?.created_at);
    return Number.isFinite(value)&&value>=low&&value<=high;
  });
}

function directionDistribution(rows){
  const counts=Object.fromEntries([...DIRECTIONS,'未知'].map(direction=>[direction,0]));
  for(const row of rows||[])counts[directionOf(row)]=(counts[directionOf(row)]||0)+1;
  return counts;
}

function roleDistribution(rows){
  const counts={main:0,supplement:0};
  for(const row of rows||[])counts[roleOf(row)]=(counts[roleOf(row)]||0)+1;
  return counts;
}

function dayDistribution(rows,startDate,endDate){
  const map=new Map();
  for(const row of rows||[]){
    const date=dayKey(row?.record_date??row?.created_at);
    if(!date)continue;
    const item=map.get(date)||{date,total:0,main:0,supplement:0};
    const role=roleOf(row);
    item.total+=1;
    item[role]+=1;
    map.set(date,item);
  }
  const output=[];
  let cursor=dayKey(startDate);
  const last=dayKey(endDate);
  while(cursor&&last&&cursor<=last){
    output.push(map.get(cursor)||{date:cursor,total:0,main:0,supplement:0});
    cursor=addDays(cursor,1);
  }
  return output;
}

function summarizeRunes(rows){
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

  const all=[];
  for(const [name,rawEntries] of groups){
    const entries=sortEntries(rawEntries);
    const dates=[...new Set(entries.map(item=>item.date).filter(Boolean))];
    const directions=[...new Set(entries.map(item=>item.direction))];
    all.push({
      name,
      count:entries.length,
      days_count:dates.length,
      dates,
      entries,
      direction_counts:Object.fromEntries([...DIRECTIONS,'未知'].map(direction=>[
        direction,
        entries.filter(item=>item.direction===direction).length
      ])),
      direction_changed:directions.length>1,
      from:entries[0]?.direction||'未知',
      to:entries.at(-1)?.direction||'未知',
      path:entries.map(item=>item.direction)
    });
  }

  all.sort((a,b)=>b.days_count-a.days_count||b.count-a.count||a.name.localeCompare(b.name,'zh-Hant'));
  return all;
}

function buildSuggestions({runes,totalDays,totalDraws}){
  const suggestions=[];
  const repeated=runes.filter(item=>item.days_count>=2);
  const changed=repeated.filter(item=>item.direction_changed);

  for(const item of repeated){
    const dayRatio=totalDays>0?item.days_count/totalDays:0;
    const drawRatio=totalDraws>0?item.count/totalDraws:0;
    if(item.days_count>=3||dayRatio>=0.5||drawRatio>=0.25){
      suggestions.push({
        type:'frequency',
        rune:item.name,
        level:item.days_count>=4||dayRatio>=0.7?'high':'notice',
        text:\`${item.name}在這段期間出現 ${item.count} 次、跨 ${item.days_count} 天，出現密度較高，可留意這個主題是否反覆出現。\`
      });
    }
  }

  for(const item of changed){
    suggestions.push({
      type:'direction',
      rune:item.name,
      level:item.path.length>=3?'high':'notice',
      text:\`${item.name}的位向由 ${item.from} 變為 ${item.to}，期間路徑為 ${item.path.join(' → ')}；同一主題的方向有變化，可回看前後紀錄。\`
    });
  }

  if(!suggestions.length&&totalDraws){
    suggestions.push({
      type:'stable',
      rune:'',
      level:'neutral',
      text:'這段期間沒有明顯的重複高頻或同符文位向變化，先保留觀察。'
    });
  }
  return suggestions;
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

export function summarizeDailyRange(rows=[],{startDate='',endDate='',label='自訂區間'}={}){
  const start=dayKey(startDate);
  const end=dayKey(endDate);
  if(!start||!end)return {
    label,start_date:start,end_date:end,total_days:0,total_draws:0,unique_runes:0,
    direction_counts:directionDistribution([]),role_counts:roleDistribution([]),
    day_counts:[],runes:[],repeats:[],direction_changes:[],suggestions:[]
  };
  const low=start<=end?start:end;
  const high=start<=end?end:start;
  const source=rowsInRange(rows,low,high);
  const totalDays=Math.floor((dateMs(high)-dateMs(low))/86400000)+1;
  const runes=summarizeRunes(source);
  const repeats=runes.filter(item=>item.days_count>=2);
  const directionChanges=repeats.filter(item=>item.direction_changed);

  return {
    label,
    start_date:low,
    end_date:high,
    total_days:totalDays,
    total_draws:source.length,
    unique_runes:runes.length,
    direction_counts:directionDistribution(source),
    role_counts:roleDistribution(source),
    day_counts:dayDistribution(source,low,high),
    runes,
    repeats,
    direction_changes:directionChanges,
    suggestions:buildSuggestions({runes,totalDays,totalDraws:source.length})
  };
}

export function dailyPresetRange(today,mode){
  const current=dayKey(today);
  if(!current)return {startDate:'',endDate:''};
  if(mode==='today-tomorrow')return {startDate:current,endDate:addDays(current,1)};
  if(mode==='yesterday-today-tomorrow')return {startDate:addDays(current,-1),endDate:addDays(current,1)};
  if(mode==='seven-days')return {startDate:addDays(current,-6),endDate:current};
  return {startDate:current,endDate:current};
}

export function summarizeDailyWindows(rows=[],today=''){
  const anchor=dayKey(today)||summarizeDailyDraws(rows).at(-1)?.date||'';
  const two=dailyPresetRange(anchor,'today-tomorrow');
  const three=dailyPresetRange(anchor,'yesterday-today-tomorrow');
  const seven=dailyPresetRange(anchor,'seven-days');
  return {
    anchor_date:anchor,
    today_tomorrow:summarizeDailyRange(rows,{...two,label:'今天＋明天'}),
    yesterday_today_tomorrow:summarizeDailyRange(rows,{...three,label:'昨天＋今天＋明天'}),
    seven_days:summarizeDailyRange(rows,{...seven,label:'近七天'})
  };
}
