import {cardSemanticState,resolveStatePair} from './semantic-state.mjs';

const LOT_FIELD=Object.freeze({
  '正位':'lots_positive',
  '半正位':'lots_half_positive',
  '半逆位':'lots_half_negative',
  '逆位':'lots_negative'
});
const DOMAIN_LABELS=Object.freeze(['愛情','事業','關係','健康']);

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

function runeIdentity(row){
  return String(row?.rune_name||row?.name||row?.rune_number||'').trim();
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

function enrichedRow(row,lookup){
  const number=Number(row?.rune_number);
  const name=String(row?.rune_name||'').trim();
  const rune=lookup.byNumber.get(number)||lookup.byName.get(name)||{};
  return {...rune,...row};
}

function cardState(row){
  return cardSemanticState({
    ...row,
    卡片屬性:row?.卡片屬性??row?.card_attribute
  },row?.direction);
}

function parseAdvice(row){
  if(!row)return [];
  const field=LOT_FIELD[String(row.direction||'').trim()];
  const source=field?String(row?.[field]||'').trim():'';
  if(!source)return [];
  return DOMAIN_LABELS.map(label=>{
    const match=source.match(new RegExp(label+'：\\s*([^\\n]*?)(?=(?:愛情|事業|關係|健康)：|$)'));
    return {
      label,
      text:String(match?.[1]||'').trim().replace(/[。；]+$/,'')
    };
  }).filter(item=>item.text);
}

function normalizeAdviceText(value){
  return String(value||'').trim().replace(/[。；，、\s]+$/g,'');
}

function sharedAdvice(groups=[]){
  const sets=groups
    .map(group=>new Set((group||[]).flatMap(row=>parseAdvice(row).map(item=>normalizeAdviceText(item.text))).filter(Boolean)))
    .filter(set=>set.size);
  if(sets.length<2)return [];
  const [first,...rest]=sets;
  return [...first].filter(text=>rest.every(set=>set.has(text))).sort((a,b)=>a.localeCompare(b,'zh-Hant'));
}

function rowsForDate(rows,date){
  return (rows||[]).filter(row=>dayKey(row?.record_date??row?.created_at)===date);
}

function sortEntries(entries){
  return [...entries].sort((a,b)=>{
    const dateCompare=String(a.date).localeCompare(String(b.date));
    if(dateCompare)return dateCompare;
    return a.role===b.role?0:(a.role==='main'?-1:1);
  });
}

function repeatSummary(rows){
  const groups=new Map();
  for(const row of rows||[]){
    const name=runeIdentity(row);
    if(!name)continue;
    if(!groups.has(name))groups.set(name,[]);
    groups.get(name).push({
      name,
      date:dayKey(row?.record_date??row?.created_at),
      direction:String(row?.direction||'未知').trim()||'未知',
      role:roleOf(row),
      advice:parseAdvice(row)
    });
  }

  const repeats=[];
  const directionChanges=[];
  const steadyRepeats=[];
  for(const [name,rawEntries] of groups){
    const entries=sortEntries(rawEntries);
    if(entries.length<2)continue;
    const directions=[...new Set(entries.map(item=>item.direction))];
    const item={name,count:entries.length,entries};
    repeats.push(item);
    if(directions.length>1){
      directionChanges.push({
        ...item,
        from:entries[0].direction,
        to:entries.at(-1).direction,
        path:entries.map(entry=>entry.direction),
        advice:entries.at(-1).advice
      });
    }else{
      steadyRepeats.push({
        ...item,
        direction:directions[0]||'未知',
        advice:entries.at(-1).advice
      });
    }
  }

  const order=(a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-Hant');
  repeats.sort(order);
  directionChanges.sort(order);
  steadyRepeats.sort(order);
  return {repeats,directionChanges,steadyRepeats};
}

function adviceFrequency(rows){
  const counts=new Map();
  for(const row of rows||[]){
    for(const item of parseAdvice(row)){
      const text=normalizeAdviceText(item.text);
      if(!text)continue;
      const key=item.label+'|'+text;
      const current=counts.get(key)||{label:item.label,text,count:0};
      current.count+=1;
      counts.set(key,current);
    }
  }
  return [...counts.values()]
    .filter(item=>item.count>1)
    .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'zh-Hant')||a.text.localeCompare(b.text,'zh-Hant'));
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

function summarizeWindow(rows,days,span){
  const latest=days?.at(-1)||null;
  if(!latest)return {
    span,start_date:'',end_date:'',days:0,
    repeats:[],direction_changes:[],steady_repeats:[],shared_advice:[],recommendations:[]
  };

  const latestMs=dateMs(latest.date);
  const startMs=latestMs-(span-1)*86400000;
  const sourceDays=(days||[]).filter(day=>{
    const value=dateMs(day.date);
    return Number.isFinite(value)&&value>=startMs&&value<=latestMs;
  });
  const periodRows=rowsInWindow(rows,latest.date,span);
  const repeated=repeatSummary(periodRows);
  const shared=adviceFrequency(periodRows);
  const recommendations=repeated.directionChanges.length
    ?repeated.directionChanges.map(item=>({
        name:item.name,
        reason:'direction_change',
        direction:item.from+' → '+item.to,
        advice:item.advice
      }))
    :repeated.steadyRepeats.map(item=>({
        name:item.name,
        reason:'repeated',
        direction:item.direction,
        advice:item.advice
      }));

  return {
    span,
    start_date:new Date(startMs).toISOString().slice(0,10),
    end_date:latest.date,
    days:sourceDays.length,
    repeats:repeated.repeats,
    direction_changes:repeated.directionChanges,
    steady_repeats:repeated.steadyRepeats,
    shared_advice:shared,
    recommendations
  };
}

export function summarizeDailyDraws(rows=[],runes=[]){
  const lookup=runeLookup(runes);
  const grouped=new Map();

  for(const raw of rows||[]){
    const row=enrichedRow(raw,lookup);
    const date=dayKey(row?.record_date??row?.created_at);
    if(!date)continue;
    if(!grouped.has(date))grouped.set(date,{date,main:null,supplement:null});
    grouped.get(date)[roleOf(row)]=row;
  }

  return [...grouped.values()]
    .sort((a,b)=>a.date.localeCompare(b.date))
    .map(day=>{
      const primary=day.main||day.supplement;
      const mainState=day.main?cardState(day.main):'未知';
      const supplementState=day.supplement?cardState(day.supplement):null;
      const supplementRelation=day.main&&day.supplement
        ?resolveStatePair(mainState,supplementState)
        :null;
      return {
        ...day,
        rows:[day.main,day.supplement].filter(Boolean),
        main_state:mainState,
        supplement_state:supplementState,
        result:primary?cardState(primary):'未知',
        advice:parseAdvice(primary),
        supplement_advice:parseAdvice(day.supplement),
        shared_advice:day.main&&day.supplement?sharedAdvice([[day.main],[day.supplement]]):[],
        supplement_relation:supplementRelation
      };
    });
}

export function summarizeDailyWindows(rows=[],days=[]){
  const source=Array.isArray(days)?days:[];
  const latest=source.at(-1)||null;
  const previous=source.length>1?source.at(-2):null;

  let adjacent={
    previous_date:'',
    current_date:latest?.date||'',
    shared_advice:[],
    repeats:[],
    direction_changes:[],
    recommendations:[]
  };

  if(previous&&latest){
    const previousRows=rowsForDate(rows,previous.date);
    const currentRows=rowsForDate(rows,latest.date);
    const repeated=repeatSummary([...previousRows,...currentRows]);
    adjacent={
      previous_date:previous.date,
      current_date:latest.date,
      shared_advice:sharedAdvice([previousRows,currentRows]),
      repeats:repeated.repeats.filter(item=>{
        const dates=new Set(item.entries.map(entry=>entry.date));
        return dates.has(previous.date)&&dates.has(latest.date);
      }),
      direction_changes:repeated.directionChanges.filter(item=>{
        const dates=new Set(item.entries.map(entry=>entry.date));
        return dates.has(previous.date)&&dates.has(latest.date);
      }),
      recommendations:repeated.directionChanges
        .filter(item=>{
          const dates=new Set(item.entries.map(entry=>entry.date));
          return dates.has(previous.date)&&dates.has(latest.date);
        })
        .map(item=>({
          name:item.name,
          reason:'direction_change',
          direction:item.from+' → '+item.to,
          advice:item.advice
        }))
    };
  }

  return {
    latest_day:latest,
    adjacent,
    three_days:summarizeWindow(rows,source,3),
    seven_days:summarizeWindow(rows,source,7)
  };
}
