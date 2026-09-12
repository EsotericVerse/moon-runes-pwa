'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLocJsonBatch, LOC_DATA } from '../loc/data';
import { evaluateSpread, finalGuidance, splitDomainGuidance } from '../loc/model/semantic-guidance';

const DIRECTIONS=['正位','半正位','半逆位','逆位'];
const MODES=[
  {count:1,label:'單卡',positions:['指引']},
  {count:2,label:'雙卡',positions:['因','果']},
  {count:3,label:'三卡',positions:['原','轉','合']},
  {count:5,label:'五卡',positions:['過去','現在','未來顯化','周圍環境','自己心境']},
  {count:11,label:'OW3gs · 11 卡',positions:['1','2','3','4','5','6','7','8','9','10','11']}
];

function randomInt(max){
  if(max<=1)return 0;
  if(globalThis.crypto?.getRandomValues){
    const limit=Math.floor(0x100000000/max)*max;
    const value=new Uint32Array(1);
    do{crypto.getRandomValues(value)}while(value[0]>=limit);
    return value[0]%max;
  }
  return Math.floor(Math.random()*max);
}

function sampleUnique(items,count){
  const pool=[...items];
  for(let i=pool.length-1;i>0;i--){
    const j=randomInt(i+1);
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  return pool.slice(0,count);
}

export default function RunesClient(){
  const [data,setData]=useState(null);
  const [error,setError]=useState('');
  const [mode,setMode]=useState(1);
  const [draw,setDraw]=useState(null);

  useEffect(()=>{
    let live=true;
    fetchLocJsonBatch([LOC_DATA.RUNES,LOC_DATA.LOTS],{concurrency:2})
      .then(([runes,lots])=>{
        if(!live)return;
        const drawable=(runes||[]).filter(row=>Number(row?.['編號'])>=1&&Number(row?.['編號'])<=66);
        setData({runes:drawable,lots:lots||[]});
      })
      .catch(err=>live&&setError(err.message));
    return()=>{live=false};
  },[]);

  const selectedMode=useMemo(()=>MODES.find(item=>item.count===mode)||MODES[0],[mode]);

  function executeDraw(){
    if(!data)return;
    const cards=sampleUnique(data.runes,mode);
    const directions=cards.map(()=>DIRECTIONS[randomInt(DIRECTIONS.length)]);
    const evaluation=evaluateSpread(cards,directions);
    const lastIndex=cards.length-1;
    const guidance=finalGuidance(data.lots,cards[lastIndex],directions[lastIndex]);
    setDraw({cards,directions,evaluation,guidance});
  }

  return <main className="loc-next-main">
    <section className="loc-view">
      <header className="loc-hero">
        <p className="loc-eyebrow">LunaRunes · Local Draw</p>
        <h1>月之符文</h1>
        <p>所有抽牌、加權與籤詩指引都在瀏覽器本機完成。多牌共用同一條方程式；最終籤詩直接沿用最後一張符文對應 direction 的既有指示。</p>
      </header>

      <section className="loc-card">
        <h2>選擇抽牌方式</h2>
        <div className="loc-actions">
          {MODES.map(item=><button key={item.count} className={`loc-button ${mode===item.count?'primary':''}`} onClick={()=>{setMode(item.count);setDraw(null)}}>{item.label}</button>)}
          <button className="loc-button primary" onClick={executeDraw} disabled={!data}>抽牌</button>
        </div>
        <p className={`loc-status ${error?'error':''}`}>{error||(!data?'載入 canonical runes.json / lots.json…':`${selectedMode.label}：${selectedMode.positions.join(' → ')}`)}</p>
      </section>

      {draw&&<>
        <section className="loc-card">
          <div className="loc-result-meta"><span>{selectedMode.label}</span><span>本機 deterministic guidance</span></div>
          <div className="loc-draw-grid">
            {draw.cards.map((card,index)=><article className="loc-context-item compact" key={`${card['編號']}-${index}`}>
              <small>{selectedMode.positions[index]||`第 ${index+1} 張`}</small>
              <b>{card['符文名稱']}</b>
              <span>{draw.directions[index]} · {card['卡片屬性']||'中平'}</span>
              <small>{card['符文說明']}</small>
            </article>)}
          </div>
        </section>

        <section className="loc-card">
          <p className="loc-eyebrow">Weighted semantic guidance</p>
          <h2>趨勢：{draw.evaluation.range.label}</h2>
          <p>加權分數 {draw.evaluation.score.toFixed(3)}。這個分數只由「卡片正面含義詞性 × direction 轉折 × 牌位權重」計算，不額外生成語意。</p>
          <div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>位置</th><th>符文</th><th>詞性</th><th>Direction</th><th>權重</th><th>加權值</th></tr></thead><tbody>
            {draw.evaluation.rows.map((row,index)=><tr key={`${row.card['編號']}-${index}`}><td>{selectedMode.positions[index]||index+1}</td><td>{row.card['符文名稱']}</td><td>{row.card['卡片屬性']||'中平'}</td><td>{row.direction}</td><td>{row.weight}</td><td>{row.weighted.toFixed(2)}</td></tr>)}
          </tbody></table></div>
        </section>

        <section className="loc-card">
          <p className="loc-eyebrow">Final guidance · canonical lots</p>
          <h2>籤詩指引</h2>
          <p>直接取最後一張「{draw.cards.at(-1)?.['符文名稱']} · {draw.directions.at(-1)}」的既有指示，不建立雙牌／三牌／五牌／11牌組合解釋庫。</p>
          <div className="loc-context-list">{splitDomainGuidance(draw.guidance).map((line,index)=><div className="loc-context-item" key={`${line}-${index}`}>{line}</div>)}</div>
        </section>
      </>}
    </section>
  </main>;
}
