import {buildSpreadGuidance} from './spread-guidance.mjs';

export const RUNE_SEMANTIC_STATES=Object.freeze([
  '正位','半正位','中立','半逆位','逆位','未知'
]);

const KNOWN_STATES=Object.freeze(['正位','半正位','中立','半逆位','逆位']);
const STATE_SET=new Set(RUNE_SEMANTIC_STATES);

const PAIR_GUIDANCE=Object.freeze({
  '正位→正位':'原有優勢大致維持穩定。',
  '正位→半正位':'原有優勢仍在，但後續力道稍有收斂。',
  '正位→中立':'原有優勢正在淡化，結果暫時回到中性位置。',
  '正位→半逆位':'原有優勢正在減少，需要留意後續是否持續轉弱。',
  '正位→逆位':'原有優勢可能明顯轉弱，結果已偏向不利的一側。',
  '半正位→正位':'原本仍在形成的優勢逐漸穩定，結果較為明確。',
  '半正位→半正位':'正向條件仍在發展，但尚未完全穩定。',
  '半正位→中立':'原本正在形成的正向條件暫時停在中性位置。',
  '半正位→半逆位':'原本的改善動能正在減弱，後續需要多觀察。',
  '半正位→逆位':'原本仍有改善空間，但結果可能轉為明顯不利。',
  '中立→正位':'原本不明顯的狀態逐漸轉向正面，結果較為有利。',
  '中立→半正位':'狀態開始出現正向發展，但仍在形成。',
  '中立→中立':'目前沒有明顯偏向，狀態仍維持中性。',
  '中立→半逆位':'狀態開始略為轉弱，但尚未形成明顯負面結果。',
  '中立→逆位':'原本中性的狀態逐漸轉弱，結果偏向不利。',
  '半逆位→正位':'原本較弱的狀態已有明顯回升，結果轉向有利。',
  '半逆位→半正位':'原本減弱的狀態開始回穩，正向條件重新形成。',
  '半逆位→中立':'原本偏弱的狀態暫時止跌，結果回到中性。',
  '半逆位→半逆位':'弱勢仍在延續，但尚未進一步惡化。',
  '半逆位→逆位':'原本的弱勢可能繼續擴大，需要留意後續變化。',
  '逆位→正位':'原本明顯不利的狀態出現較大轉折，結果轉向有利。',
  '逆位→半正位':'原本不利的狀態開始回升，但仍需要時間穩定。',
  '逆位→中立':'原本不利的狀態逐漸緩和，結果暫時回到中性。',
  '逆位→半逆位':'原本明顯不利的狀態有所緩和，但目前仍偏弱。',
  '逆位→逆位':'不利狀態仍在延續，目前尚未看到明顯轉折。'
});

const STATE_PHRASE=Object.freeze({
  '正位':'較穩定的正向狀態',
  '半正位':'仍在形成的正向狀態',
  '中立':'暫時中性的狀態',
  '半逆位':'略為轉弱的狀態',
  '逆位':'明顯偏弱的狀態',
  '未知':'尚未能確認的狀態'
});

function pairGuidance(from,result){
  if(from==='未知'||result==='未知')return '目前資訊仍不足，後續走向需要保留觀察。';
  return PAIR_GUIDANCE[`${from}→${result}`]||'目前走向仍需繼續觀察。';
}

export function formatSpreadGuidance(reading){
  if(!reading)return '';
  const states=Array.isArray(reading.states)?reading.states:[];
  if(states.length<2)return formatRuneGuidance(reading);
  const overall=pairGuidance(states[0],states.at(-1));

  if(reading.mode==='2card')return overall;

  if(reading.mode==='3card'){
    const middle=STATE_PHRASE[states[1]]||STATE_PHRASE.未知;
    return `中途轉為${middle}；${overall}`;
  }

  if(reading.mode==='5card'){
    const unexpected=STATE_PHRASE[states[2]]||STATE_PHRASE.未知;
    return `意外因素呈現${unexpected}；${overall}`;
  }

  if(reading.mode==='ow3gs'){
    const context=reading.sections?.find(item=>item.label==='1–6 因的描述層');
    const core=reading.sections?.find(item=>item.label==='7–11 果的判定層');
    const contextText=context?pairGuidance(context.from,context.result).replace(/。$/,''):'前因仍需觀察';
    const coreText=core?pairGuidance(core.from,core.result):overall;
    return `前因脈絡顯示：${contextText}；核心判定則顯示：${coreText}`;
  }

  return overall;
}


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
  const spread=buildSpreadGuidance(source,directions,resolvedMode);
  return {
    ...reading,
    guidance:spread.sentence,
    advice:spread.advice,
    unknown:spread.unknown
  };
}
export {KNOWN_STATES};
