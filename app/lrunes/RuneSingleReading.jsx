'use client';

function directionNo(direction){return ['正位','半正位','半逆位','逆位'].indexOf(direction)+1;}
function lotSections(card,direction){
  const text=String(card?.rune_etc?.lots?.[directionNo(direction)]||'').trim();
  if(!text)return [];
  return ['愛情','事業','關係','健康'].map(label=>{
    const match=text.match(new RegExp(label+'：\\s*([^\\n]*?)(?=(?:愛情|事業|關係|健康)：|$)'));
    return {label,text:String(match?.[1]||'').trim().replace(/[。；]+$/,'')};
  }).map(item=>({...item,text:item.text||'資訊不足'}));
}

function runeEtcText(card,type,direction){
  return String(card?.rune_etc?.[type]?.[directionNo(direction)]||'').trim();
}
function directionText(card,direction){
  return runeEtcText(card,'direction',direction)||String(card?.rune_description||'').trim();
}

export default function RuneSingleReading({card,direction,bubbleLayout=false}){
  if(!card)return null;
  const analyses=lotSections(card,direction);
  const situationQ=runeEtcText(card,'sit_q',direction);
  const situationA=runeEtcText(card,'sit_a',direction);
  return <>
    <p className="runes-reading-lead">
      <strong>占卜結論｜{card.rune_name}・{direction}</strong>
      <span>位向基句：{directionText(card,direction)||'目前沒有這個位向的符文說明。'}</span>
      {situationQ?<span>狀況形容：{situationQ}</span>:null}
      {situationA?<span>狀況表達：{situationA}</span>:null}
    </p>
    {bubbleLayout?
      <div className="home-draw-bubbles" aria-label="單卡籤詩分析">
        {analyses.map(item=><div className="loc-bubble" key={item.label}><strong>{item.label}</strong><p>{item.text}</p></div>)}
      </div>:
      <div className="runes-advice-grid" aria-label="單卡籤詩分析">
        {analyses.map(item=><article key={item.label}><strong>{item.label}</strong><span>{item.text}</span></article>)}
      </div>}
  </>;
}
