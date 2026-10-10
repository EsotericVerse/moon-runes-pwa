'use client';

import {selectAllRows,selectRows} from './db-query.mjs';
import {realMoonPhase} from './model/moon-phase';

export const LUNARUNES_PHASES=Object.freeze(['新月','上弦','滿月','下弦','空亡']);
export const LUNARUNES_DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);
export const LUNARUNES_CARD_PHASES=Object.freeze({1:'新月',2:'上弦',3:'滿月',4:'下弦'});
export const LUNARUNES_BASELINE_COUNT=66*4*5;

function isoDate(value){
  const date=String(value||'').slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date)?date:'';
}

function nextDate(value){
  const date=new Date(isoDate(value)+'T00:00:00Z');
  if(Number.isNaN(date.getTime()))return '';
  date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString().slice(0,10);
}

// The user's draw date is an actual calendar condition, not another keyword.
// Follow the existing LunaRunes five-phase calendar convention; do not replace
// a historical recorded_phase value with a newly calculated phase.
export function lunarunesPhaseForDate(value){
  const date=isoDate(value);
  return date?realMoonPhase(new Date(date+'T12:00:00+08:00')):'未知';
}

export async function selectLunaRunesDailyAnalysis(){
  const {rows}=await selectAllRows('silver.lrunes_daily',{
    columns:'record_id,record_date,draw_kind,rune_number,direction,recorded_phase',
    orders:[{column:'record_date',ascending:true},{column:'record_id',ascending:true}]
  });
  const {rows:runes}=await selectRows('silver.runes',{
    columns:'rune_id,rune_name,moon_phase,group_name',
    orders:[{column:'rune_id',ascending:true}],
    limit:67,
    maxLimit:100
  });
  const registry=new Map(runes.map(rune=>[Number(rune.rune_id),rune]));
  return rows.map(row=>{
    const rune=registry.get(Number(row.rune_number))||{};
    const day=isoDate(row.record_date);
    const realPhase=lunarunesPhaseForDate(day);
    const cardPhase=LUNARUNES_CARD_PHASES[Number(rune.moon_phase)]||'未指定';
    return {
      ...row,
      record_date:day,
      rune_name:String(rune.rune_name||row.rune_number),
      group_name:String(rune.group_name||''),
      card_phase:cardPhase,
      real_phase:realPhase,
      combo_key:[Number(row.rune_number),String(row.direction||''),realPhase].join('|')
    };
  });
}

export function filterLunaRunesDaily(rows=[],start='',end=''){
  const from=isoDate(start);
  const to=isoDate(end);
  return rows.filter(row=>{
    const day=isoDate(row.record_date);
    return day&&(!from||day>=from)&&(!to||day<=to);
  });
}

function rankEntries(map){
  return [...map.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'zh-Hant'));
}

export function summarizeLunaRunesDaily(rows=[]){
  const byCombo=new Map(),byRuneDirection=new Map();
  const phaseCounts=new Map(LUNARUNES_PHASES.map(phase=>[phase,0]));
  const directionCounts=new Map(LUNARUNES_DIRECTIONS.map(direction=>[direction,0]));
  const cardPhaseCounts=new Map(LUNARUNES_CARD_PHASES?Object.values(LUNARUNES_CARD_PHASES).map(phase=>[phase,0]):[]);
  const byMonth=new Map();
  const distinctDays=new Set();
  const coveredCombos=new Set();
  for(const row of rows){
    const day=isoDate(row.record_date);
    const runeId=Number(row.rune_number);
    const name=String(row.rune_name||runeId);
    const direction=String(row.direction||'');
    const phase=String(row.real_phase||'未知');
    if(day){
      distinctDays.add(day);
      const month=day.slice(0,7);
      byMonth.set(month,(byMonth.get(month)||0)+1);
    }
    if(phaseCounts.has(phase))phaseCounts.set(phase,phaseCounts.get(phase)+1);
    if(directionCounts.has(direction))directionCounts.set(direction,directionCounts.get(direction)+1);
    if(cardPhaseCounts.has(row.card_phase))cardPhaseCounts.set(row.card_phase,cardPhaseCounts.get(row.card_phase)+1);
    const baseKey=runeId+'|'+direction;
    const base=byRuneDirection.get(baseKey)||{key:baseKey,label:name+'之符文・'+direction,count:0,rune_name:name,direction};
    base.count+=1;
    byRuneDirection.set(baseKey,base);
    const key=baseKey+'|'+phase;
    const combo=byCombo.get(key)||{key,label:name+'・'+direction+'・'+phase,count:0,rune_name:name,direction,real_phase:phase,card_phase:row.card_phase};
    combo.count+=1;
    byCombo.set(key,combo);
    if(runeId>=1&&runeId<=66&&LUNARUNES_DIRECTIONS.includes(direction)&&LUNARUNES_PHASES.includes(phase))coveredCombos.add(key);
  }
  const observed=[...byMonth.keys()].sort();
  const months=[];
  if(observed.length){
    let cursor=observed[0],guard=0;
    while(cursor<=observed.at(-1)&&guard++<1200){
      months.push({month:cursor,count:byMonth.get(cursor)||0});
      const [y,m]=cursor.split('-').map(Number);
      const following=new Date(Date.UTC(y,m,1));
      cursor=following.toISOString().slice(0,7);
    }
  }
  return {
    total:rows.length,
    activeDays:distinctDays.size,
    observedStates:coveredCombos.size,
    baseline:LUNARUNES_BASELINE_COUNT,
    firstDate:rows[0]?.record_date||'',
    lastDate:rows.at(-1)?.record_date||'',
    combinations:rankEntries(byCombo),
    runeDirections:rankEntries(byRuneDirection),
    phases:LUNARUNES_PHASES.map(phase=>({name:phase,value:phaseCounts.get(phase)||0})),
    cardPhases:Object.values(LUNARUNES_CARD_PHASES).map(phase=>({name:phase,value:cardPhaseCounts.get(phase)||0})),
    directions:LUNARUNES_DIRECTIONS.map(direction=>({name:direction,value:directionCounts.get(direction)||0})),
    months
  };
}

export function lunarunesSkyTimeline(from,to){
  const start=isoDate(from),end=isoDate(to);
  if(!start||!end||start>end)return [];
  const segments=[];
  let day=start,runStart=start,phase=lunarunesPhaseForDate(start),iterations=0;
  while(day<=end&&iterations++<20000){
    const next=nextDate(day);
    const following=next<=end?lunarunesPhaseForDate(next):null;
    if(following!==phase){
      segments.push({
        id:'lrunes-sky:'+runStart,
        entry_type:'sky_phase',
        group_key:'lrunes-sky',
        group_label:'天時・真實月相',
        start_date:runStart,
        end_date:next,
        display_label:phase,
        title:runStart+' ～ '+day+'・天時 '+phase
      });
      runStart=next;
      phase=following;
    }
    day=next;
  }
  return segments;
}

export function lunarunesDrawTimeline(rows=[]){
  const dates=new Map();
  for(const row of rows){
    if(!row.record_date)continue;
    const key=row.record_date+'|'+row.real_phase;
    if(!dates.has(key))dates.set(key,[]);
    dates.get(key).push(row);
  }
  return [...dates].map(([key,draws])=>{
    const first=draws[0],day=first.record_date,phase=first.real_phase;
    const title=draws.map(row=>
      row.rune_name+'之符文，'+row.direction+'，卡片月相'+row.card_phase+'，真實月相'+row.real_phase
    ).join('；');
    return {
      id:'lrunes-daily:'+key,
      entry_type:'daily_draw',
      group_key:'lrunes-draw:'+phase,
      group_label:'抽符・'+phase,
      start_date:day,
      end_date:nextDate(day),
      display_label:'',
      item_count:draws.length,
      density_ratio:Math.min(1,draws.length/4),
      title:day+'｜'+title
    };
  }).sort((a,b)=>a.start_date.localeCompare(b.start_date));
}
