// Continuous calendar moon-phase lane for LunaRunes Culture only.
// These are independent of draw records and never become Galaxy records.
import {DAILY_MOON_PHASES} from './daily-analytics-model.mjs';

const DAY_MS=86400000;
const MAX_WINDOW_DAYS=3660;
const PHASE_SYMBOLS=Object.freeze(['●','◐','○','◑','◇']);

function dayMillis(value){
  const day=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))return NaN;
  const ms=Date.parse(day+'T00:00:00Z');
  return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===day?ms:NaN;
}

function dateAt(ms){return new Date(ms).toISOString().slice(0,10);}

// Half-open ranges [start_date,end_date) make phase bands contiguous without
// duplicating their transition day. Phase labels use the site's established
// Taipei-calendar convention, not fixed rune-card moon attributes.
export function buildContinuousMoonRiver(startDate,endDate,phaseAtDate){
  const from=dayMillis(startDate);
  const to=dayMillis(endDate);
  if(!Number.isFinite(from)||!Number.isFinite(to)||to<from||
     (to-from)/DAY_MS>=MAX_WINDOW_DAYS||typeof phaseAtDate!=='function')return [];

  const segments=[];
  let phase='';
  let start=from;
  const finish=(exclusiveEnd)=>{
    if(!phase)return;
    const index=DAILY_MOON_PHASES.indexOf(phase);
    const first=dateAt(start);
    const last=dateAt(exclusiveEnd-DAY_MS);
    segments.push({
      id:'lrunes-real-moon:'+first,
      entry_id:'lrunes-real-moon:'+first,
      entry_type:'real_moon_phase',
      group_key:'lrunes-real-moon',
      group_label:'天時｜現實月相',
      group_order:-1,
      start_date:first,
      end_date:dateAt(exclusiveEnd),
      display_label:(index>=0?PHASE_SYMBOLS[index]+' ':'')+phase,
      title:'現實月相｜'+phase+'｜'+first+' ～ '+last+'（依日期推算，非卡片固定月相）',
      class_name:'scope-lrunes-moon-phase scope-lrunes-moon-phase-'+(index<0?'unknown':index),
      moon_phase:phase
    });
  };
  for(let ms=from;ms<=to;ms+=DAY_MS){
    const name=String(phaseAtDate(dateAt(ms))||'未知');
    const next=DAILY_MOON_PHASES.includes(name)?name:'未知';
    if(next===phase)continue;
    finish(ms);
    phase=next;
    start=ms;
  }
  finish(to+DAY_MS);
  return segments;
}
