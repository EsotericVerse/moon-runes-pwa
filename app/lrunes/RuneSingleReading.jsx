'use client';

import {runeLotAnalyses} from '../loc/model/semantic-state.mjs';

function directionText(card,direction){
  const field=({
    '正位':'正向表示',
    '半正位':'半正向表示',
    '半逆位':'半逆向表示',
    '逆位':'逆向表示'
  })[direction];
  return String(card?.[field]||card?.__neonPayload?.[field]||card?.符文說明||'').trim();
}

export default function RuneSingleReading({card,direction}){
  if(!card)return null;
  const analyses=runeLotAnalyses(card,direction);
  return <>
    <p className="runes-reading-lead">
      <strong>占卜結論｜{card.符文名稱}・{direction}</strong>
      <span>{directionText(card,direction)||'目前沒有這個位向的符文說明。'}</span>
    </p>
    <div className="runes-advice-grid" aria-label="單卡籤詩分析">
      {analyses.map(item=><article key={item.label}><strong>{item.label}</strong><span>{item.text}</span></article>)}
    </div>
  </>;
}
