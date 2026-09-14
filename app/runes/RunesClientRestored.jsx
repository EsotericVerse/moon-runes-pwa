'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchLocJson, fetchLocJsonBatch, LOC_DATA } from '../loc/data';
import { evaluateSpread, splitDomainGuidance } from '../loc/model/semantic-guidance';
import RuneAtlas from './RuneAtlas';

const DIRECTIONS=['正位','半正位','半逆位','逆位'];
const ROTATION_CLASSES=['rune-rotate-0','rune-rotate-90','rune-rotate-n90','rune-rotate-180'];
const GROUPS=['靈魂','連結','生命','自然','礦物','元素','秩序','無序','特殊'];
const MODES=[
  {key:'single',count:1,label:'單卡',positions:['核心']},
  {key:'daily',count:1,label:'每日',positions:['今日']},
  {key:'2card',count:2,label:'雙卡',positions:['因','果']},
  {key:'3card',count:3,label:'三卡',positions:['源','轉','合']},
  {key:'5card',count:5,label:'五卡',positions:['過去','現在','未來','外在','內在']},
  {key:'ow3gs',count:11,label:'11卡 OW3gs',positions:['1','2','3','4','5','6','7','8','9','10','11']}
];
const RITUAL_MESSAGES={
  single:['您目前使用的是「單卡占卜模式」。','正在找尋那命運之線……','微弱的月光，會在漆黑的夜裡，帶領你找到方向。','抽牌完成。'],
  daily:['您目前使用的是「單卡每日抽牌模式」。','這是一張屬於今日節奏與提醒的指引牌。','正在對照今日真實月相。','今日月符已經抽取完成。'],
  '2card':['您目前使用的是「雙卡占卜模式」。','第一張卡牌為「因」，第二張卡牌為「果」。','正在整理兩張牌的因果位置。','抽牌完成。'],
  '3card':['您目前使用的是「三卡占卜模式」。','第一張為「源」，第二張為「轉」，第三張為「合」。','正在整理源、轉、合的語法位置。','抽牌完成。'],
  '5card':['您目前使用的是「五卡占卜模式」。','依序觀看過去、現在、未來顯化、周圍環境與自己心境。','正在整理時間主線與內外狀態。','抽牌完成。'],
  ow3gs:['您目前使用的是「OW3gs 11卡模式」。','1–6 建立事件描述層，7–11 進入核心判定。','正在整理兩段模型。','十一張命運絲線已經整理完成。']
};

function randomInt(max){
  if(max<=1)return 0;
  if(globalThis.crypto?.getRandomValues){
    const limit=Math.floor(0x100000000/max)*max;
    const value=new Uint32Array(1);
    do{globalThis.crypto.getRandomValues(value)}while(value[0]>=limit);
    return value[0]%max;
  }
  return Math.floor(Math.random()*max);
}

function sampleUnique(items,count){
  const pool=[...items];
  for(let i=pool.length-1;i>0;i--){const j=randomInt(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,count);
}

function realMoonPhase(date=new Date()){
  try{
    const formatter=new Intl.DateTimeFormat('zh-TW-u-ca-chinese',{month:'numeric',day:'numeric'});
    const day=Number(formatter.formatToParts(date).find(part=>part.type==='day')?.value);
    if(day<=7)return '新月';
    if(day<=14)return '上弦';
    if(day<=21)return '滿月';
    if(day<=28)return '下弦';
    if(day<=30)return '空亡';
  }catch{}
  return '未知';
}

function runeCardImage(card){
  const number=String(Number(card?.編號)||0).padStart(2,'0');
  const name=String(card?.符文名稱||'').replace(/之符文$/,'').trim();
  return `/assets/lunarunes/cards/${number}_${name}.png`;
}

function directionText(card,direction){
  const field=({'正位':'正向表示','半正位':'半正向表示','半逆位':'半逆向表示','逆位':'逆向表示'})[direction];
  return card?.[field]||card?.符文說明||'';
}

function interpretationRow(interpretations,card,direction,phase){
  const runeRows=Array.isArray(interpretations)?interpretations:[];
  const rune=runeRows.find(item=>item?.符文名稱===card?.符文名稱);
  return rune?.卡牌方向?.find(item=>item?.方向===direction)?.現況?.find(item=>item?.現在月相===phase)||null;
}

function adviceFields(info){
  if(!info)return null;
  return [
    ['狀況',info.狀況形容],
    ['表達',info.狀況表達],
    ['引導',info.每日占卜引導],
    ['祝福',info.每日占卜祝福]
  ].filter(([,value])=>value);
}

function dailyGuidance(interpretations,card,direction,phase){
  return interpretationRow(interpretations,card,direction,phase)?.每日占卜提醒||'';
}

function simpleMultiReading(draw,mode,phase){
  if(!draw)return '';
  const cards=draw.cards;
  const dirs=draw.directions;
  if(mode==='2card')return `${cards[0].符文名稱}・${dirs[0]}（因）→ ${cards[1].符文名稱}・${dirs[1]}（果）。真實月相：${phase}。`;
  if(mode==='3card')return `${cards[0].符文名稱}・${dirs[0]}（源）→ ${cards[1].符文名稱}・${dirs[1]}（轉）→ ${cards[2].符文名稱}・${dirs[2]}（合）。`;
  if(mode==='5card')return `過去「${cards[0].符文名稱}」${dirs[0]} → 現在「${cards[1].符文名稱}」${dirs[1]} → 未來顯化「${cards[2].符文名稱}」${dirs[2]}；環境「${cards[3].符文名稱}」${dirs[3]}；心境「${cards[4].符文名稱}」${dirs[4]}。`;
  return '';
}

export default function RunesClientRestored(){
  const [data,setData]=useState(null);
  const [interpretations,setInterpretations]=useState([]);
  const [grammar,setGrammar]=useState(null);
  const [threeCardCombinations,setThreeCardCombinations]=useState(null);
  const [error,setError]=useState('');
  const [modeKey,setModeKey]=useState('single');
  const [draw,setDraw]=useState(null);
  const [group,setGroup]=useState('');
  const [ritualStep,setRitualStep]=useState(-1);
  const timers=useRef([]);
  const moonPhase=useMemo(()=>realMoonPhase(),[]);
  const selectedMode=useMemo(()=>MODES.find(item=>item.key===modeKey)||MODES[0],[modeKey]);
  const groups=useMemo(()=>{
    const available=new Set((data?.runes||[]).map(row=>row?.所屬分組).filter(Boolean));
    return GROUPS.filter(name=>available.has(name));
  },[data]);

  useEffect(()=>{
    let live=true;
    setError('');
    fetchLocJsonBatch([
      LOC_DATA.RUNES,
      LOC_DATA.LOTS,
      LOC_DATA.RUNE_INTERPRETATIONS,
      LOC_DATA.RUNE_GRAMMAR,
      LOC_DATA.THREE_CARD_COMBINATIONS
    ],{concurrency:2})
      .then(([runes,lots,interpretationRows,grammarData,threeCards])=>{
        if(!live)return;
        const canonicalRunes=(runes||[]).filter(row=>Number(row?.編號)>=1&&Number(row?.編號)<=66);
        if(canonicalRunes.length<66)throw new Error(`核心符文資料只有 ${canonicalRunes.length} 枚，無法安全抽牌。`);
        setData({runes:canonicalRunes,lots:Array.isArray(lots)?lots:[]});
        setInterpretations(Array.isArray(interpretationRows)?interpretationRows:[]);
        setGrammar(grammarData||null);
        setThreeCardCombinations(threeCards||null);
      })
      .catch(err=>live&&setError(`月之符文核心資料載入失敗：${err?.message||'未知錯誤'}`));
    return()=>{live=false;timers.current.forEach(clearTimeout);};
  },[]);

  function chooseMode(key){
    timers.current.forEach(clearTimeout);
    setRitualStep(-1);
    setError('');
    setModeKey(key);
    setDraw(null);
  }

  function finishDraw(){
    try{
      if(!data?.runes?.length)throw new Error('符文資料尚未載入完成。');
      if(data.runes.length<selectedMode.count)throw new Error(`可抽取符文不足 ${selectedMode.count} 張。`);
      const cards=sampleUnique(data.runes,selectedMode.count);
      const directionIndexes=cards.map(()=>randomInt(DIRECTIONS.length));
      const directions=directionIndexes.map(index=>DIRECTIONS[index]);
      const evaluation=evaluateSpread(cards,directions,{grammar,threeCardCombinations});
      setDraw({id:`rune-draw:${Date.now()}:${randomInt(1000000000)}`,cards,directionIndexes,directions,evaluation,mode:modeKey,moonPhase});
      setError('');
    }catch(err){
      setDraw(null);
      setError(`抽牌失敗：${err?.message||'未知錯誤'}`);
    }finally{setRitualStep(-1);}
  }

  function executeDraw(){
    if(!data||ritualStep>=0)return;
    setError('');setDraw(null);timers.current.forEach(clearTimeout);timers.current=[];
    setRitualStep(0);
    const delays=[1000,2000,3000];
    delays.forEach((delay,index)=>timers.current.push(setTimeout(()=>setRitualStep(index+1),delay)));
    timers.current.push(setTimeout(finishDraw,4000));
  }

  const lastCard=draw?.cards?.at(-1);
  const lastDirection=draw?.directions?.at(-1);
  const dailyInfo=modeKey==='daily'&&lastCard?interpretationRow(interpretations,lastCard,lastDirection,moonPhase):null;
  const savedDailyAdvice=dailyInfo?dailyGuidance(interpretations,lastCard,lastDirection,moonPhase):'';
  const finalLotText=useMemo(()=>{
    if(!draw||!data?.lots?.length||!lastCard)return '';
    const row=data.lots.find(item=>item?.符文名稱===lastCard?.符文名稱);
    if(!row)return '';
    const dir=row?.方向?.[lastDirection]||row?.卡牌方向?.find(item=>item?.方向===lastDirection);
    if(!dir)return '';
    if(typeof dir==='string')return dir;
    return Object.values(dir).filter(value=>typeof value==='string').join('\n');
  },[draw,data,lastCard,lastDirection]);

  const ritualMessages=RITUAL_MESSAGES[modeKey]||RITUAL_MESSAGES.single;

  return <>
    <header className="loc-next-header">
      <div className="loc-next-nav-stack">
        <nav className="loc-next-nav loc-next-nav-primary" aria-label="LOC 主要導覽">
          <a href="/runes" aria-current="page">月之符文</a>
          <a href="/context">脈絡</a>
          <a href="/statics">統計</a>
          <a href="/evolution">文化</a>
          <a href="/my-style">設定</a>
          <form className="loc-next-search" action="/search" method="get" role="search"><input name="q" type="search" aria-label="搜尋文字" placeholder="輸入文字"/><button type="submit">搜尋</button></form>
          <a className="loc-next-home" href="/">回月典首頁</a>
        </nav>
      </div>
    </header>

    <main className="loc-next-main">
      <section className="loc-view">
        <header className="loc-hero">
          <p className="loc-eyebrow">LunaRunes · 月之符文</p>
          <h1>月之符文</h1>
          <p>由 66 個中文單一字構成。可以問一件事，也可以沒有問題直接抽取；抽牌、方向、月相與每日解讀均在瀏覽器本機完成，不需要外部 API。</p>
        </header>

        <section className="loc-card" data-draw-keyword="lunarunes-draw" data-draw-mode={modeKey}>
          <p className="loc-eyebrow">Draw · 抽籤</p>
          <h2>占卜抽籤</h2>
          <div className="runes-mode-nav">{MODES.map(item=><button key={item.key} type="button" data-draw-mode={item.key} className={`loc-button ${modeKey===item.key?'primary':''}`} onClick={()=>chooseMode(item.key)}>{item.label}</button>)}</div>
          <div className="loc-actions runes-draw-action"><button type="button" className="loc-button primary" data-draw-action="execute" onClick={executeDraw} disabled={!data||ritualStep>=0}>{ritualStep>=0?'占卜中…':'抽牌'}</button></div>
          <p className={`loc-status ${error?'error':''}`}>{error||(!data?'載入月之符文核心資料中…':`${selectedMode.label}：${selectedMode.positions.join(' → ')}${modeKey==='daily'?`／真實月相：${moonPhase}`:''}`)}</p>
        </section>

        {ritualStep>=0&&<section className="loc-card runes-ritual" data-draw-stage="ritual" aria-live="polite"><div className="runes-ritual-card"><img src="/assets/lunarunes/cards/65_玄.png" alt="玄之符文"/><strong>玄之符文</strong><span>Chaos</span></div><div className="runes-ritual-copy"><p className="loc-eyebrow">等待片刻</p><h2>{ritualMessages[ritualStep]}</h2><p>真實月相：{moonPhase}</p></div></section>}

        {draw&&<>
          <section className="loc-card" id="result" data-draw-stage="result" data-draw-mode={modeKey}>
            <div className="loc-result-meta"><span>{selectedMode.label}</span><span>真實月相：{moonPhase}</span></div>
            <div className="loc-draw-grid">{draw.cards.map((card,index)=><article className="loc-context-item compact loc-draw-card" data-rune-id={card.編號} data-draw-position={selectedMode.positions[index]||index+1} key={`${card.編號}-${index}`}>
              <small>{selectedMode.positions[index]||`第 ${index+1} 張`}</small>
              <img className={`loc-rune-card-image ${ROTATION_CLASSES[draw.directionIndexes[index]]}`} src={runeCardImage(card)} alt={`${card.符文名稱}符文卡`}/>
              <b>{card.符文名稱}</b>
              <span>{draw.directions[index]} · {card.卡片屬性||'中平'}</span>
              <small>{directionText(card,draw.directions[index])}</small>
              <div className="runes-draw-keywords"><span><strong>正向關鍵詞</strong>{card.正向關鍵詞||'—'}</span><span><strong>反向關鍵詞</strong>{card.反向關鍵詞||'—'}</span></div>
            </article>)}</div>
            <div className="loc-actions runes-retry"><button type="button" className="loc-button" data-draw-action="retry" onClick={executeDraw}>再抽一次</button></div>
          </section>

          {modeKey==='single'&&<section className="loc-card" data-draw-reading="single"><p className="loc-eyebrow">Reading · 單卡解讀</p><h2>{lastCard.符文名稱} · {lastDirection}</h2><p>{directionText(lastCard,lastDirection)}</p></section>}

          {modeKey==='daily'&&<section className="loc-card" data-draw-reading="daily"><p className="loc-eyebrow">Daily · 每日指示</p><h2>{lastCard.符文名稱} · {lastDirection} · {moonPhase}</h2>{dailyInfo?<><div className="runes-reading-lead"><strong>今日核心</strong><span>{savedDailyAdvice||dailyInfo.狀況表達||dailyInfo.狀況形容}</span></div><div className="runes-advice-grid">{adviceFields(dailyInfo).map(([label,value])=><article key={label}><strong>{label}</strong><span>{value}</span></article>)}</div></>:<p>目前沒有這組符文、方向與真實月相的每日解讀資料。</p>}</section>}

          {(modeKey==='2card'||modeKey==='3card'||modeKey==='5card')&&<section className="loc-card" data-draw-reading={modeKey}><p className="loc-eyebrow">Reading · 完整解讀</p><h2>{modeKey==='2card'?'因 → 果':modeKey==='3card'?'源 → 轉 → 合':'時間主線 × 內外作用'}</h2><p>{simpleMultiReading(draw,modeKey,moonPhase)}</p><div className="loc-context-list">{draw.cards.map((card,index)=><div className="loc-context-item" key={`${modeKey}-${card.編號}-${index}`}><strong>{selectedMode.positions[index]}：{card.符文名稱}・{draw.directions[index]}</strong><span>{directionText(card,draw.directions[index])}</span></div>)}</div></section>}

          {modeKey==='ow3gs'&&<section className="loc-card runes-ow3gs-core" data-draw-reading="ow3gs"><p className="loc-eyebrow">OW3gs · 核心判定</p><h2>先 7–11，再回看 1–6</h2><p>1–6 為因的描述層；7–11 為果的判定層。讀取順序固定為先讀核心判定，再掃描前六張，最後套月相交互。</p><div className="loc-context-list">{draw.cards.slice(6).map((card,index)=><div className="loc-context-item" key={`ow-core-${card.編號}-${index}`}><strong>第 {index+7} 張 · {card.符文名稱} · {draw.directions[index+6]}</strong><span>{directionText(card,draw.directions[index+6])}</span></div>)}</div></section>}

          <section className="loc-card" data-draw-stage="guidance"><p className="loc-eyebrow">Semantic Guidance · 語意指示</p><h2>整體趨勢：{draw.evaluation.range.label}</h2><p>指示分數：{draw.evaluation.score.toFixed(3)}。這裡只呈現既有語意規則的加權結果，不生成外部預測。</p><div className="loc-table-wrap"><table className="loc-table"><thead><tr><th>位置</th><th>符文</th><th>詞性</th><th>位向</th><th>權重</th><th>加權值</th></tr></thead><tbody>{draw.evaluation.rows.map((row,index)=><tr key={`${row.card.編號}-${index}`}><td>{selectedMode.positions[index]||index+1}</td><td>{row.card.符文名稱}</td><td>{row.card.卡片屬性||'中平'}</td><td>{row.direction}</td><td>{row.weight}</td><td>{row.weighted.toFixed(2)}</td></tr>)}</tbody></table></div></section>

          <section className="loc-card" data-draw-stage="lots"><p className="loc-eyebrow">Lots · 籤詩</p><h2>籤詩指引</h2><p>最後一張「{lastCard.符文名稱} · {lastDirection}」的既有指引。</p><div className="loc-context-list">{finalLotText?splitDomainGuidance(finalLotText).map((line,index)=><div className="loc-context-item" key={`${line}-${index}`}>{line}</div>):<div className="loc-context-item">目前沒有可顯示的既有籤詩資料。</div>}</div></section>
        </>}

        <RuneAtlas runes={data?.runes||[]} groups={groups} group={group} setGroup={setGroup}/>
      </section>
    </main>
  </>;
}
