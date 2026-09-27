const DIRECTIONS=Object.freeze(['正位','半正位','半逆位','逆位']);

const TOPIC_BY_RUNE=Object.freeze({
  靈:'精神本源',魂:'精神整體',彩:'多元展現',憶:'記憶',界:'界線',域:'領域',鏡:'映照',核:'核心',
  向:'行動方向',斷:'切斷',封:'封閉',鍊:'連結',啟:'開啟',分:'拆分',悟:'理解',誤:'錯誤',
  生:'新生',老:'歲月',病:'失衡',死:'終結',心:'情感',愛:'愛意',語:'語言',韻:'共鳴',
  樹:'成熟',花:'美好',葉:'適應',草:'韌性',根:'扎根',種:'起始',實:'成果',枝:'分支',
  金:'價值',玉:'護持',晶:'純化',地:'歸屬',石:'承重',鑽:'磨練',礦:'潛力',塵:'殘餘',
  光:'明亮',暗:'暗影',水:'滋潤',火:'熱情',風:'自由',土:'沉穩',雷:'衝擊',氣:'流動',
  日:'意外',月:'最壞',星:'規律',辰:'階段',明:'清晰',時:'時間',空:'空間',因:'成因',
  福:'轉好',禍:'轉壞',無:'未定',夢:'潛意識',幻:'幻象',緣:'時機',虛:'不實',果:'結果',
  玄:'混沌',命:'定論'
});

const STATE_WORD=Object.freeze({
  '正面|正位':'穩定',
  '正面|半正位':'漸強',
  '正面|半逆位':'轉弱',
  '正面|逆位':'受阻',
  '中平|正位':'明確',
  '中平|半正位':'成形',
  '中平|半逆位':'搖擺',
  '中平|逆位':'偏離',
  '負面|正位':'加重',
  '負面|半正位':'漸增',
  '負面|半逆位':'減弱',
  '負面|逆位':'解除'
});

const LOT_FIELD=Object.freeze({
  '正位':'lots_positive',
  '半正位':'lots_half_positive',
  '半逆位':'lots_half_negative',
  '逆位':'lots_negative'
});

const DOMAIN_LABELS=Object.freeze(['愛情','事業','關係','健康']);

const FALLBACK_ADVICE=Object.freeze([
  {label:'愛情建議',text:'先觀察互動變化。'},
  {label:'事業建議',text:'先確認目前條件。'},
  {label:'關係建議',text:'先保持清楚溝通。'},
  {label:'健康建議',text:'先留意身心狀態。'}
]);

function normalizeAttribute(value){
  const text=String(value||'').trim();
  if(['正面','正向','正'].includes(text))return '正面';
  if(['中平','中性','中立'].includes(text))return '中平';
  if(['負面','反面','負向','反向','負'].includes(text))return '負面';
  return '未知';
}

function normalizeDirection(value){
  const text=String(value||'').trim();
  return DIRECTIONS.includes(text)?text:'未知';
}

function runeName(card){
  return String(card?.符文名稱||card?.rune_name||'').replace(/之符文$/,'').trim();
}

function topicOf(card){
  const name=runeName(card);
  return TOPIC_BY_RUNE[name]||name||'主題';
}

function stateOf(card,direction){
  const attribute=normalizeAttribute(card?.卡片屬性??card?.card_attribute??card?.attribute);
  const normalizedDirection=normalizeDirection(direction??card?.direction);
  const key=attribute==='未知'||normalizedDirection==='未知'?'未知':attribute+'|'+normalizedDirection;
  return {attribute,direction:normalizedDirection,key,word:STATE_WORD[key]||'未知'};
}

function parseLots(card,direction){
  const field=LOT_FIELD[normalizeDirection(direction)];
  const text=field?String(card?.[field]||'').trim():'';
  if(!text)return FALLBACK_ADVICE.map(item=>({...item}));
  return DOMAIN_LABELS.map(label=>{
    const match=text.match(new RegExp(label+'：\\s*([^\\n]*?)(?=(?:愛情|事業|關係|健康)：|$)'));
    return {
      label:label+'建議',
      text:String(match?.[1]||'').trim().replace(/[。；]+$/,'')||FALLBACK_ADVICE.find(item=>item.label===label+'建議')?.text||'先保留觀察。'
    };
  });
}

function unknownFlags(states,mode){
  if(mode==='2card')return {
    source:states[0]?.key==='未知',
    variable:false,
    result:states[1]?.key==='未知'
  };
  if(mode==='3card')return {
    source:states[0]?.key==='未知',
    variable:states[1]?.key==='未知',
    result:states[2]?.key==='未知'
  };
  if(mode==='5card')return {
    source:states.slice(0,2).some(item=>item?.key==='未知'),
    variable:states[2]?.key==='未知',
    result:states.slice(3,5).some(item=>item?.key==='未知')
  };
  if(mode==='ow3gs')return {
    source:states.slice(0,6).some(item=>item?.key==='未知'),
    variable:states.slice(6,10).some(item=>item?.key==='未知'),
    result:states[10]?.key==='未知'
  };
  return {
    source:states[0]?.key==='未知',
    variable:states.slice(1,-1).some(item=>item?.key==='未知'),
    result:states.at(-1)?.key==='未知'
  };
}

function unknownSentence(flags,cards,states){
  const sourceTopic=topicOf(cards[0]);
  const resultTopic=topicOf(cards.at(-1));
  const sourceWord=states[0]?.word||'未知';
  const resultWord=states.at(-1)?.word||'未知';
  if(flags.source&&flags.result)return '來源與結果皆未知，暫保留判斷。';
  if(flags.source&&flags.variable)return '來源與中間變數未知，先保留判斷。';
  if(flags.result&&flags.variable)return '中間變數與結果未知，先保留判斷。';
  if(flags.source)return '來源未知，'+resultTopic+resultWord+'仍待觀察。';
  if(flags.result)return sourceTopic+sourceWord+'，但結果仍然未知。';
  if(flags.variable)return sourceTopic+sourceWord+'，中間變數仍未知。';
  return '目前仍有未知資訊，先保留判斷。';
}

function pairSentence(cards,states){
  return topicOf(cards[0])+states[0].word+'，'+topicOf(cards[1])+states[1].word+'。';
}

function threeSentence(cards,states){
  return topicOf(cards[0])+states[0].word+'，'+runeName(cards[1])+states[1].word+'後'+topicOf(cards[2])+states[2].word+'。';
}

function fiveSentence(cards,states){
  return topicOf(cards[0])+states[0].word+'，'+runeName(cards[2])+states[2].word+'後'+topicOf(cards[4])+states[4].word+'。';
}

function owSentence(cards,states){
  return topicOf(cards[0])+states[0].word+'，前因'+runeName(cards[5])+states[5].word+'，'+topicOf(cards[10])+states[10].word+'。';
}

export function buildSpreadGuidance(cards=[],directions=[],mode=''){
  const source=Array.isArray(cards)?cards:[];
  const states=source.map((card,index)=>stateOf(card,directions[index]));
  const flags=unknownFlags(states,mode);
  const hasUnknown=flags.source||flags.variable||flags.result;

  let sentence='';
  if(hasUnknown)sentence=unknownSentence(flags,source,states);
  else if(mode==='2card')sentence=pairSentence(source,states);
  else if(mode==='3card')sentence=threeSentence(source,states);
  else if(mode==='5card')sentence=fiveSentence(source,states);
  else if(mode==='ow3gs')sentence=owSentence(source,states);
  else sentence=pairSentence([source[0],source.at(-1)],[states[0],states.at(-1)]);

  const resultCard=source.at(-1);
  const resultDirection=directions.at(-1);
  return {
    sentence,
    advice:parseLots(resultCard,resultDirection),
    unknown:flags,
    states
  };
}

export function knownPairStateKeys(){
  return Object.keys(STATE_WORD);
}
