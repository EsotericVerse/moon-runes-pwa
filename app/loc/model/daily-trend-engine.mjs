import {
  buildDailyStateIndex,
  cardSemanticState,
  findDailyState,
  formatRuneGuidance,
  resolveStatePair
} from './semantic-state.mjs';

function dayKey(value){
  const key=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key)?key:'';
}

function roleOf(row){
  const role=String(row?.draw_kind||row?.daily_role||'').toLowerCase();
  return role==='supplement'?'supplement':'main';
}

function runeLookup(runes=[]){
  const byNumber=new Map();
  const byName=new Map();
  for(const rune of runes||[]){
    const number=Number(rune?.編號??rune?.rune_number);
    const name=String(rune?.符文名稱??rune?.rune_name??'').trim();
    if(Number.isInteger(number))byNumber.set(number,rune);
    if(name)byName.set(name,rune);
  }
  return {byNumber,byName};
}

function cardState(row,lookup){
  if(row?.state)return String(row.state);
  const card=Array.isArray(row?.cards)?row.cards[0]:row;
  const number=Number(card?.number??row?.rune_number);
  const name=String(card?.name??row?.rune_name??'').trim();
  const rune=lookup.byNumber.get(number)||lookup.byName.get(name)||row;
  return cardSemanticState(
    {
      ...rune,
      card_attribute:card?.card_attribute??row?.card_attribute??rune?.card_attribute,
      卡片屬性:card?.['卡片屬性']??rune?.['卡片屬性']
    },
    card?.direction??row?.direction
  );
}

function dateMs(value){
  const key=dayKey(value);
  if(!key)return NaN;
  return Date.parse(key+'T00:00:00Z');
}

function rowsInWindow(rows,latestDate,days){
  const latest=dateMs(latestDate);
  if(!Number.isFinite(latest))return [];
  const start=latest-(Math.max(1,Number(days)||1)-1)*86400000;
  return (rows||[]).filter(row=>{
    const value=dateMs(row?.record_date??row?.created_at);
    return Number.isFinite(value)&&value>=start&&value<=latest;
  });
}

function runeIdentity(row){
  const name=String(row?.rune_name||row?.name||row?.rune_number||'').trim();
  return name;
}

function summarizeRepeats(rows){
  const map=new Map();
  for(const row of rows||[]){
    const name=runeIdentity(row);
    if(!name)continue;
    if(!map.has(name))map.set(name,[]);
    map.get(name).push({
      date:dayKey(row?.record_date??row?.created_at),
      direction:String(row?.direction||'未知').trim()||'未知',
      role:roleOf(row)
    });
  }
  const repeats=[];
  const directionChanges=[];
  for(const [name,entries] of map){
    entries.sort((a,b)=>a.date.localeCompare(b.date)||(a.role==='main'?-1:1));
    if(entries.length>1)repeats.push({name,count:entries.length,entries});
    const directions=entries.map(item=>item.direction).filter(Boolean);
    const unique=[...new Set(directions)];
    if(unique.length>1){
      directionChanges.push({
        name,
        from:directions[0],
        to:directions.at(-1),
        path:directions
      });
    }
  }
  repeats.sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  directionChanges.sort((a,b)=>a.name.localeCompare(b.name));
  return {repeats,directionChanges};
}

function summarizeWindow(rows,days,span){
  const allDays=Array.isArray(days)?days:[];
  const latest=allDays.at(-1)||null;
  if(!latest)return {
    span,
    start_date:'',
    end_date:'',
    from_result:'未知',
    to_result:'未知',
    trend:'未知',
    result:'未知',
    repeats:[],
    direction_changes:[]
  };
  const latestMs=dateMs(latest.date);
  const startMs=latestMs-(Math.max(1,span)-1)*86400000;
  const source=allDays.filter(day=>{
    const value=dateMs(day.date);
    return Number.isFinite(value)&&value>=startMs&&value<=latestMs;
  });
  const startDate=new Date(startMs).toISOString().slice(0,10);
  const endDate=latest.date;
  const periodRows=rowsInWindow(rows,endDate,span);
  const relation=source.length>1
    ?resolveStatePair(source[0].result,source.at(-1).result)
    :{from:source[0]?.result||'未知',result:source.at(-1)?.result||'未知',trend:'未知'};
  const repeated=summarizeRepeats(periodRows);
  return {
    span,
    start_date:startDate,
    end_date:endDate,
    from_result:relation.from,
    to_result:relation.result,
    trend:relation.trend,
    result:relation.result,
    repeats:repeated.repeats,
    direction_changes:repeated.directionChanges
  };
}

export function summarizeDailyWindows(rows=[],days=[]){
  const source=Array.isArray(days)?days:[];
  const latest=source.at(-1)||null;
  const previous=source.length>1?source.at(-2):null;
  const adjacent=latest?{
    previous_date:previous?.date||'',
    current_date:latest.date,
    from_result:previous?.result||'未知',
    to_result:latest.result||'未知',
    trend:previous?resolveStatePair(previous.result,latest.result).trend:'未知',
    result:latest.result
  }:{
    previous_date:'',
    current_date:'',
    from_result:'未知',
    to_result:'未知',
    trend:'未知',
    result:'未知'
  };
  return {
    adjacent,
    three_days:summarizeWindow(rows,source,3),
    seven_days:summarizeWindow(rows,source,7)
  };
}

export function summarizeDailyDraws(rows=[],runes=[]){
  const lookup=runeLookup(runes);
  const grouped=new Map();
  for(const row of rows||[]){
    const date=dayKey(row?.record_date??row?.created_at);
    if(!date)continue;
    if(!grouped.has(date))grouped.set(date,{date,main:null,supplement:null});
    grouped.get(date)[roleOf(row)]=row;
  }

  const days=[...grouped.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(day=>{
    const mainState=day.main?cardState(day.main,lookup):'未知';
    const supplementState=day.supplement?cardState(day.supplement,lookup):null;
    if(!supplementState){
      return {
        ...day,
        main_state:mainState,
        supplement_state:null,
        trend:'未知',
        result:mainState
      };
    }
    const pair=resolveStatePair(mainState,supplementState);
    return {
      ...day,
      main_state:mainState,
      supplement_state:supplementState,
      trend:pair.trend,
      result:pair.result
    };
  });

  const engine=buildDailyStateIndex(days);
  return days.map((day,index)=>{
    if(index===0)return {...day,daily_trend:'未知',daily_result:day.result,guidance:`結果${day.result}。`};
    const previousDate=days[index-1].date;
    const previous=findDailyState(engine,previousDate);
    const current=findDailyState(engine,day.date)||day;
    const relation=resolveStatePair(previous?.result,current.result);
    return {
      ...day,
      previous_date:previousDate,
      previous_result:previous?.result||'未知',
      daily_trend:relation.trend,
      daily_result:relation.result,
      guidance:formatRuneGuidance({layers:[relation],trend:relation.trend,result:relation.result})
    };
  });
}
