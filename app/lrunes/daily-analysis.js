'use client';

import {selectAllRows,selectRows} from '../loc/db-query.mjs';
import {realMoonPhase} from '../loc/model/moon-phase';

export const RUNE_CARD_PHASES=Object.freeze({1:'新月',2:'上弦',3:'滿月',4:'下弦'});
export const RUNE_REAL_PHASES=Object.freeze(['新月','上弦','滿月','下弦','空亡']);
export const RUNE_DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);

export function phaseForDrawDate(value){
  const key=String(value||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return '未知';
  // Reuse LunaRunes' existing date-based 5-phase rule, not the card's fixed phase.
  return realMoonPhase(new Date(key+'T12:00:00+08:00'));
}

export function decorateDailyRuneRows(rows=[],runes=[]){
  const names=new Map((runes||[]).map(rune=>[Number(rune.rune_id),rune]));
  return (rows||[]).map(row=>{
    const rune=names.get(Number(row.rune_number))||{};
    return {
      ...row,
      record_date:String(row.record_date||'').slice(0,10),
      rune_name:String(rune.rune_name||row.rune_number),
      card_phase:RUNE_CARD_PHASES[Number(rune.moon_phase)]||'無固定卡片月相',
      real_phase:phaseForDrawDate(row.record_date),
      rune_group:String(rune.group_name||'')
    };
  });
}

export async function loadDailyRuneAnalysis(){
  // Preserve original record count and multiple draws on a day.
  // Do not require recorded_phase: older read-only backup schemas may not have it.
  const [daily,runes]=await Promise.all([
    selectAllRows('silver.lrunes_daily',{
      columns:'record_id,record_date,draw_kind,rune_number,direction',
      orders:[{column:'record_date',ascending:true},{column:'record_id',ascending:true}]
    }),
    selectRows('silver.runes',{
      columns:'rune_id,rune_name,moon_phase,group_name',
      orders:[{column:'rune_id',ascending:true}],
      limit:67
    })
  ]);
  return {rows:decorateDailyRuneRows(daily.rows,runes.rows),source:daily.dataSource};
}

export function analyzeDailyRuneRows(rows=[],{from='',to=''}={}){
  const selected=(rows||[]).filter(row=>(!from||row.record_date>=from)&&(!to||row.record_date<=to));
  const byPair=new Map(),byHeaven=new Map(),byMonth=new Map(),byPhase=new Map();
  const days=new Set();
  for(const row of selected){
    const label=row.rune_name+'之符文・'+row.direction;
    const heaven=label+'・'+row.real_phase;
    byPair.set(label,(byPair.get(label)||0)+1);
    byHeaven.set(heaven,(byHeaven.get(heaven)||0)+1);
    const month=row.record_date.slice(0,7);
    byMonth.set(month,(byMonth.get(month)||0)+1);
    byPhase.set(row.real_phase,(byPhase.get(row.real_phase)||0)+1);
    days.add(row.record_date);
  }
  const rank=map=>[...map].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-Hant'));
  return {
    rows:selected,total:selected.length,days:days.size,
    pairs:rank(byPair),heaven:rank(byHeaven),phases:rank(byPhase),
    months:[...byMonth].sort(([a],[b])=>a.localeCompare(b)).map(([month,count])=>({month,count})),
    first:selected[0]?.record_date||'',last:selected.at(-1)?.record_date||''
  };
}
