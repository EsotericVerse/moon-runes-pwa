'use client';

import {selectAllRows,selectRows} from './db-query.mjs';
import {realMoonPhase} from './model/moon-phase.js';

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
  const cardPhaseCounts=new Map(Object.values(LUNARUNES_CARD_PHASES).map(phase=>[phase,0]));
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


// A separate, public work source shares the same date axis as daily draws.
// This intentionally reads metadata only: the visual river tracks published
// work counts, not text length or sentiment, which require separate analysis.
function workDay(value){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  try{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const fields=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return isoDate(fields.year+'-'+fields.month+'-'+fields.day);
  }catch{return isoDate(String(value).slice(0,10));}
}

export async function selectLunaRunesCulturalWorks({source='lo3rwang',startDate='',endDate=''}={}){
  // Query only the selected public corpus and the date window of daily runes.
  // Local/private files never enter this public data query.
  const scopeId=source==='lrunes'?'lrunes':'lo3rwang';
  const filters=[
    {column:'statistics_able',operator:'eq',value:true},
    {column:'searchable',operator:'eq',value:true},
    {column:'content',operator:'neq',value:''},
    ...(isoDate(startDate)?[{column:'createtime',operator:'gte',value:startDate+'T00:00:00+08:00'}]:[]),
    ...(isoDate(endDate)?[{column:'createtime',operator:'lte',value:endDate+'T23:59:59.999+08:00'}]:[])
  ];
  const {rows}=await selectAllRows('silver.'+scopeId+'_galaxy',{
    columns:'uid,title,createtime,source_name,content_type,url',
    filters,
    orders:[{column:'createtime',ascending:true},{column:'uid',ascending:true}]
  });
  return rows.map(row=>({
    ...row,
    scope_id:scopeId,
    work_date:workDay(row.createtime)
  })).filter(row=>Boolean(row.work_date));
}


// Load original text only for the selected day; timeline density uses metadata
// and does not read thousands of documents into the browser.
export async function selectLunaRunesDayWorkTexts({source='lo3rwang',date='',limit=12}={}){
  const day=isoDate(date);
  if(!day)return [];
  const scopeId=source==='lrunes'?'lrunes':'lo3rwang';
  const {rows}=await selectRows('silver.'+scopeId+'_galaxy',{
    columns:'uid,title,content,createtime,source_name,url',
    filters:[
      {column:'statistics_able',operator:'eq',value:true},
      {column:'searchable',operator:'eq',value:true},
      {column:'content',operator:'neq',value:''},
      {column:'createtime',operator:'gte',value:day+'T00:00:00+08:00'},
      {column:'createtime',operator:'lte',value:day+'T23:59:59.999+08:00'}
    ],
    orders:[{column:'createtime',ascending:true},{column:'uid',ascending:true}],
    limit:Math.max(1,Math.min(20,Math.floor(Number(limit)||12)))
  });
  return rows.map(row=>({
    ...row,
    scope_id:scopeId,
    work_date:day,
    excerpt:String(row.content||'').replace(/\s+/g,' ').slice(0,220),
    character_count:[...String(row.content||'')].length
  }));
}

export function lunarunesWorksOnDates(rows=[],from='',to=''){
  const first=isoDate(from),last=isoDate(to);
  return rows.filter(row=>row.work_date&&(!first||row.work_date>=first)&&(!last||row.work_date<=last));
}

export function lunarunesWorkTimeline(rows=[]){
  const grouped=new Map();
  for(const row of rows){
    if(!row.work_date)continue;
    if(!grouped.has(row.work_date))grouped.set(row.work_date,[]);
    grouped.get(row.work_date).push(row);
  }
  const maxCount=Math.max(1,...[...grouped.values()].map(works=>works.length));
  return [...grouped].map(([date,works])=>({
    id:'lrunes-works:'+date,
    entry_type:'culture_work_density',
    group_key:'lrunes-works',
    group_label:'文字作品',
    group_order:2,
    start_date:date,
    end_date:nextDate(date),
    display_label:'',
    item_count:works.length,
    density_ratio:works.length/maxCount,
    title:date+'｜文字作品 '+works.length+' 項｜'+works.slice(0,5).map(row=>row.title||row.source_name||'未命名').join('、')+(works.length>5?'…':'')
  })).sort((a,b)=>a.start_date.localeCompare(b.start_date));
}


export async function selectLunaRunesCulturalAnchors(){
  const {rows}=await selectAllRows('silver.lrunes_time',{
    columns:'record_id,label,time_date',
    filters:[{column:'record_type',operator:'eq',value:'anchor'}],
    orders:[{column:'time_date',ascending:true}]
  });
  return rows.filter(row=>isoDate(row.time_date));
}

// Suggestions are read-only candidates, never automatically made official.
export function lunarunesAnchorTimeline(anchors=[],suggestions=[]){
  const official=anchors.map(row=>({
    id:'lrunes-anchor:'+row.record_id,
    entry_type:'anchor',
    group_key:'lrunes-anchors',
    group_label:'定錨點與建議',
    group_order:3,
    start_date:isoDate(row.time_date),
    display_label:'◆',
    title:'正式定錨｜'+row.time_date+'｜'+row.label,
    anchor_status:'official'
  }));
  const proposed=suggestions.map(row=>({
    id:'lrunes-anchor-candidate:'+row.date,
    entry_type:'anchor_candidate',
    group_key:'lrunes-anchors',
    group_label:'定錨點與建議',
    group_order:3,
    start_date:row.date,
    display_label:'◇',
    title:'建議定錨（未建立）｜'+row.date+'｜'+(row.analysis||[]).join(' '),
    anchor_status:'candidate'
  }));
  return [...official,...proposed];
}

export function lunarunesDateContext(date,draws=[],works=[],span=3){
  const day=isoDate(date);
  if(!day)return {date:'',sameDayDraws:[],sameDayWorks:[],beforeWorks:0,afterWorks:0,beforeDraws:0,afterDraws:0};
  const ms=Date.parse(day+'T00:00:00Z'),windowDays=Math.max(1,Math.min(30,Number(span)||3));
  const offset=value=>Math.round((Date.parse(String(value)+'T00:00:00Z')-ms)/86400000);
  const aroundDraws=draws.filter(row=>Math.abs(offset(row.record_date))<=windowDays);
  const aroundWorks=works.filter(row=>Math.abs(offset(row.work_date))<=windowDays);
  return {
    date:day,
    phase:lunarunesPhaseForDate(day),
    sameDayDraws:aroundDraws.filter(row=>row.record_date===day),
    sameDayWorks:aroundWorks.filter(row=>row.work_date===day),
    beforeDraws:aroundDraws.filter(row=>offset(row.record_date)<0).length,
    afterDraws:aroundDraws.filter(row=>offset(row.record_date)>0).length,
    beforeWorks:aroundWorks.filter(row=>offset(row.work_date)<0).length,
    afterWorks:aroundWorks.filter(row=>offset(row.work_date)>0).length,
    nearbyDraws:aroundDraws.filter(row=>row.record_date!==day),
    nearbyWorks:aroundWorks.filter(row=>row.work_date!==day)
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
        group_order:0,
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
      group_key:'lrunes-draw',
      group_label:'每日符文',
      group_order:1,
      start_date:day,
      end_date:nextDate(day),
      display_label:'',
      item_count:draws.length,
      density_ratio:Math.min(1,draws.length/4),
      title:day+'｜'+title
    };
  }).sort((a,b)=>a.start_date.localeCompare(b.start_date));
}
