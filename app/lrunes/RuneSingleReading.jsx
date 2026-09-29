'use client';

const LOT_FIELD_BY_DIRECTION=Object.freeze({
  '正位':'lots_positive',
  '半正位':'lots_half_positive',
  '半逆位':'lots_half_negative',
  '逆位':'lots_negative'
});
function lotSections(card,direction){
  const field=LOT_FIELD_BY_DIRECTION[direction];
  const text=field?String(card?.[field]||'').trim():'';
  if(!text)return [];
  return ['愛情','事業','關係','健康'].map(label=>{
    const match=text.match(new RegExp(label+'：\\s*([^\\n]*?)(?=(?:愛情|事業|關係|健康)：|$)'));
    return {label,text:String(match?.[1]||'').trim().replace(/[。；]+$/,'')};
  }).filter(item=>item.text);
}

function directionText(card,direction){
  const field=({
    '正位':'positive_meaning',
    '半正位':'half_positive_meaning',
    '半逆位':'half_reverse_meaning',
    '逆位':'reverse_meaning'
  })[direction];
  return String(card?.[field]||card?.rune_description||'').trim();
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
