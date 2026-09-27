'use client';

import {runeLotAnalyses} from '../loc/model/semantic-state.mjs';

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
  const analyses=runeLotAnalyses(card,direction);
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
