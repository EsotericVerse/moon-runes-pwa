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
