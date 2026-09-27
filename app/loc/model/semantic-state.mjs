import {createTextIndex,searchTextIndex} from '../text-engine.mjs';

export const RUNE_SEMANTIC_STATES=Object.freeze([
  '正位','半正位','中立','半逆位','逆位','未知'
]);

const KNOWN_STATES=Object.freeze(['正位','半正位','中立','半逆位','逆位']);
const STATE_SET=new Set(RUNE_SEMANTIC_STATES);

const LOT_FIELD_BY_DIRECTION=Object.freeze({
  '正位':'lots_positive',
  '半正位':'lots_half_positive',
  '半逆位':'lots_half_negative',
  '逆位':'lots_negative'
});

export function runeLotGuidance(card,direction){
  const field=LOT_FIELD_BY_DIRECTION[String(direction||'').trim()];
  return field?String(card?.[field]||'').trim():'';
}

export function runeLotAnalyses(card,direction){
  const text=runeLotGuidance(card,direction);
  if(!text)return [];
  const domains=['愛情','事業','關係','健康'];
  return domains.map(label=>{
    const match=text.match(new RegExp(label+'：\\s*([^\\n]*?)(?=(?:愛情|事業|關係|健康)：|$)'));
    return {label,text:String(match?.[1]||'').trim().replace(/[。；]+$/,'')};
  }).filter(item=>item.text);
}


const INVERSE_DIRECTION=Object.freeze({
  '正位':'逆位',
  '半正位':'半逆位',
  '半逆位':'半正位',
  '逆位':'正位'
});

// Trend is a discrete direction of change, never a numeric score.
// Rows are FROM state; columns are TO state.
const TREND_MATRIX=Object.freeze({
  '正位':Object.freeze({
    '正位':'中立','半正位':'半逆位','中立':'逆位','半逆位':'逆位','逆位':'逆位'
  }),
  '半正位':Object.freeze({
    '正位':'半正位','半正位':'中立','中立':'半逆位','半逆位':'逆位','逆位':'逆位'
  }),
  '中立':Object.freeze({
    '正位':'正位','半正位':'半正位','中立':'中立','半逆位':'半逆位','逆位':'逆位'
  }),
  '半逆位':Object.freeze({
    '正位':'正位','半正位':'正位','中立':'半正位','半逆位':'中立','逆位':'半逆位'
  }),
  '逆位':Object.freeze({
    '正位':'正位','半正位':'正位','中立':'正位','半逆位':'半正位','逆位':'中立'
  })
});

function normalizeDirection(value){
  const direction=String(value||'').trim();
  return Object.hasOwn(INVERSE_DIRECTION,direction)?direction:'未知';
}

export function normalizeSemanticState(value){
  const state=String(value||'').trim();
  return STATE_SET.has(state)?state:'未知';
}

export function normalizeCardAttribute(value){
  const attribute=String(value||'').trim();
  if(['正面','正向','正'].includes(attribute))return '正面';
  if(['負面','反面','負向','反向','負'].includes(attribute))return '負面';
  if(['中平','中性','中立'].includes(attribute))return '中平';
  return '未知';
}

export function cardSemanticState(card,direction){
  const attribute=normalizeCardAttribute(
    card?.['卡片屬性']??card?.card_attribute??card?.attribute
  );
  const normalizedDirection=normalizeDirection(direction??card?.direction);
  if(attribute==='未知'||normalizedDirection==='未知')return '未知';
  if(attribute==='中平')return '中立';
  if(attribute==='負面')return INVERSE_DIRECTION[normalizedDirection]||'未知';
  return normalizedDirection;
}

export function resolveStatePair(fromValue,toValue){
  const from=normalizeSemanticState(fromValue);
  const result=normalizeSemanticState(toValue);
  if(from==='未知'||result==='未知')return {from,result,trend:'未知'};
  return {from,result,trend:TREND_MATRIX[from]?.[result]||'未知'};
}

function layer(label,states,fromIndex,toIndex){
  const relation=resolveStatePair(states[fromIndex],states[toIndex]);
  return {
    label,
    from_index:fromIndex,
    to_index:toIndex,
    ...relation
  };
}

function inferMode(mode,count){
  if(mode)return mode;
  if(count===1)return 'single';
  if(count===2)return '2card';
  if(count===3)return '3card';
  if(count===5)return '5card';
  if(count===11)return 'ow3gs';
  return 'sequence';
}

function sequentialLayers(states,labels=[]){
  const output=[];
  for(let index=1;index<states.length;index+=1){
    output.push(layer(labels[index-1]||`${index}→${index+1}`,states,index-1,index));
  }
  return output;
}

export function formatRuneGuidance(reading){
  if(!reading)return '';
  if(!reading.layers?.length)return `結果${reading.result}。`;
  return `趨勢${reading.trend}，結果${reading.result}。`;
}

export function resolveSpreadState(cards=[],directions=[],mode=''){
  const source=Array.isArray(cards)?cards:[];
  const states=source.map((card,index)=>cardSemanticState(card,directions[index]));
  const resolvedMode=inferMode(mode,states.length);
  if(!states.length){
    return {mode:resolvedMode,states:[],layers:[],sections:[],trend:'未知',result:'未知',guidance:'結果未知。'};
  }
  if(states.length===1){
    const reading={mode:resolvedMode,states,layers:[],sections:[],trend:'未知',result:states[0]};
    const guidance=resolvedMode==='single'
      ?(runeLotGuidance(source[0],directions[0])||formatRuneGuidance(reading))
      :formatRuneGuidance(reading);
    return {...reading,guidance};
  }

  let layers=[];
  let sections=[];
  let overall;

  if(resolvedMode==='2card'){
    layers=[layer('因→果',states,0,1)];
    overall=resolveStatePair(states[0],states[1]);
  }else if(resolvedMode==='3card'){
    layers=[
      layer('源→轉',states,0,1),
      layer('轉→合',states,1,2)
    ];
    overall=resolveStatePair(states[0],states[2]);
  }else if(resolvedMode==='5card'){
    layers=[
      layer('雙因',states,0,1),
      layer('因→意外',states,1,2),
      layer('意外→雙果',states,2,3),
      layer('雙果',states,3,4)
    ];
    sections=[
      {label:'雙因',from_index:0,to_index:1,...resolveStatePair(states[0],states[1])},
      {label:'意外',state:states[2]},
      {label:'雙果',from_index:3,to_index:4,...resolveStatePair(states[3],states[4])}
    ];
    overall=resolveStatePair(states[0],states[4]);
  }else if(resolvedMode==='ow3gs'&&states.length>=11){
    const contextStates=states.slice(0,6);
    const coreStates=states.slice(6,11);
    const contextLayers=sequentialLayers(contextStates,['源1→源2','源→轉','轉1→轉2','轉→合','合1→合2']);
    const coreLayers=sequentialLayers(coreStates,['雙因','因→意外','意外→雙果','雙果']);
    const context=resolveStatePair(contextStates[0],contextStates.at(-1));
    const core=resolveStatePair(coreStates[0],coreStates.at(-1));
    layers=[...contextLayers,...coreLayers];
    sections=[
      {label:'1–6 因的描述層',...context,layers:contextLayers},
      {label:'7–11 果的判定層',...core,layers:coreLayers}
    ];
    overall=resolveStatePair(context.result,core.result);
  }else{
    layers=sequentialLayers(states);
    overall=resolveStatePair(states[0],states.at(-1));
  }

  const reading={
    mode:resolvedMode,
    states,
    layers,
    sections,
    trend:overall.trend,
    result:overall.result
  };
  return {...reading,guidance:formatRuneGuidance(reading)};
}

// Daily trend lookup uses the same FlexSearch runtime engine as LOC Search/Culture/Statistics.
// FlexSearch finds the day-state records; semantic judgment remains the small discrete rule above.
export function buildDailyStateIndex(daySummaries=[]){
  const engine=createTextIndex();
  for(const day of daySummaries){
    const date=String(day?.date||'').trim();
    if(!date)continue;
    const token='d'+date.replaceAll('-','');
    engine.add(date,`${token} ${day.trend||''} ${day.result||''}`,day);
  }
  return engine;
}

export function findDailyState(engine,date){
  const token='d'+String(date||'').replaceAll('-','');
  if(!token||token==='d')return null;
  return searchTextIndex(engine,token,{limit:1}).rows[0]||null;
}

export {KNOWN_STATES};
