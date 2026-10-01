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

function directionText(card,direction){
  return String(card?.rune_etc?.direction?.[directionNo(direction)]||card?.rune_description||'').trim();
}

export default function RuneSingleReading({card,direction}){
  if(!card)return null;
  const analyses=lotSections(card,direction);
  return <>
    <p className="runes-reading-lead">
      <strong>占卜結論｜{card.rune_name}・{direction}</strong>
      <span>{directionText(card,direction)||'目前沒有這個位向的符文說明。'}</span>
    </p>
    <div className="runes-advice-grid" aria-label="單卡籤詩分析">
      {analyses.map(item=><article key={item.label}><strong>{item.label}</strong><span>{item.text}</span></article>)}
    </div>
  </>;
}
