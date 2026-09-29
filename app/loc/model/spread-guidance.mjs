const DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);

const DIRECTION_FIELD=Object.freeze({
  '正位':'positive_meaning',
  '半正位':'half_positive_meaning',
  '半逆位':'half_reverse_meaning',
  '逆位':'reverse_meaning'
});

const LOT_FIELD=Object.freeze({
  '正位':'lots_positive',
  '半正位':'lots_half_positive',
  '半逆位':'lots_half_negative',
  '逆位':'lots_negative'
});

const DOMAIN_LABELS=Object.freeze(['愛情','事業','關係','健康']);

function normalizeDirection(value){
  const text=String(value||'').trim();
  return DIRECTIONS.includes(text)?text:'未知';
}

function cleanPhrase(value){
  return String(value||'').trim().replace(/[。；;，,\s]+$/g,'');
}

function selectedDirectionText(card,direction){
  const field=DIRECTION_FIELD[normalizeDirection(direction)];
  return cleanPhrase((field&&card?.[field])||card?.rune_description||'資訊不足');
}

function parseLots(card,direction){
  const field=LOT_FIELD[normalizeDirection(direction)];
  const text=field?String(card?.[field]||'').trim():'';
  const output={};
  for(const label of DOMAIN_LABELS){
    const match=text.match(new RegExp(label+'：\\s*([^\\n]*?)(?=(?:愛情|事業|關係|健康)：|$)'));
    output[label]=cleanPhrase(match?.[1]||'資訊不足');
  }
  return output;
}

function pairSentence(values){
  return `因為${values[0]}，所以${values[1]}。`;
}

function threeSentence(values){
  return `因為${values[0]}，但會有${values[1]}的改變，所以${values[2]}。`;
}

function fiveSentence(values){
  return `因為${values[0]}、${values[1]}，但會有${values[2]}的變化，所以${values[3]}、${values[4]}。`;
}

function owSentence(values){
  return `因為（因為${values[0]}、${values[1]}，但會有${values[2]}、${values[3]}的變化，所以${values[4]}、${values[5]}），所以（因為${values[6]}、${values[7]}，但會有${values[8]}的變化，所以${values[9]}、${values[10]}）。`;
}

function compose(values,mode){
  if(mode==='2card'&&values.length>=2)return pairSentence(values);
  if(mode==='3card'&&values.length>=3)return threeSentence(values);
  if(mode==='5card'&&values.length>=5)return fiveSentence(values);
  if(mode==='ow3gs'&&values.length>=11)return owSentence(values);
  if(values.length===1)return `${values[0]}。`;
  if(values.length>=2)return pairSentence([values[0],values.at(-1)]);
  return '資訊不足。';
}

export function buildSpreadGuidance(cards=[],directions=[],mode=''){
  const source=Array.isArray(cards)?cards:[];
  const directionTexts=source.map((card,index)=>selectedDirectionText(card,directions[index]));
  const sentence=compose(directionTexts,mode);
  const lotsByCard=source.map((card,index)=>parseLots(card,directions[index]));
  const advice=(mode==='single'||mode==='daily')
    ?[]
    :DOMAIN_LABELS.map(label=>({
      label:label+'建議',
      text:compose(lotsByCard.map(item=>item[label]),mode)
    }));
  return {
    sentence,
    guidance:sentence,
    advice,
    unknown:{
      source:directionTexts.slice(0,mode==='5card'?2:1).some(text=>text==='資訊不足'),
      variable:mode==='3card'?directionTexts[1]==='資訊不足'
        :mode==='5card'?directionTexts[2]==='資訊不足'
        :mode==='ow3gs'?directionTexts.slice(2,4).some(text=>text==='資訊不足')||directionTexts[8]==='資訊不足'
        :false,
      result:directionTexts.at(-1)==='資訊不足'
    }
  };
}
